import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { vendorService } from '../../../../lib/services/vendorService'
import { storage } from '../../../../lib/storage'
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware'

export const dynamic = 'force-dynamic'

async function getVendorEarnings(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get vendor by email
    const vendor = await vendorService.getVendorByEmail(session.user.email)
    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      )
    }

    // Get orders data
    const orders = await storage.readData('orders.json')
    if (!orders) {
      return NextResponse.json(
        { error: 'Failed to read orders data' },
        { status: 500 }
      )
    }

    // Get completed jobs (paid orders)
    const completedJobs = orders.filter(order => 
      order && order.selectedVendorId === vendor.vendorId && 
      order.status === 'Paid'
    ) || []

    // Calculate total earnings from jobs
    const jobEarnings = completedJobs.reduce((sum, order) => {
      const amount = order.selectedQuote?.amount || 0
      return sum + amount
    }, 0)

    // Get affiliate stats to get affiliate earnings
    let affiliateStats = { totalEarnings: 0, commissionHistory: [] }
    try {
      affiliateStats = await vendorService.getAffiliateStats(session.user.email)
    } catch (error) {
      console.error('Error fetching affiliate stats:', error)
      // Continue with default values if affiliate stats can't be fetched
    }
    const affiliateEarnings = affiliateStats.totalEarnings || 0

    // Calculate total earnings
    const totalEarnings = jobEarnings + affiliateEarnings

    // Get earnings by time period (this month, last month)
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    
    // This month's job earnings
    const thisMonthJobEarnings = completedJobs
      .filter(order => {
        try {
          const paidDate = new Date(order.payment?.paidAt || order.updatedAt)
          return paidDate.getMonth() === thisMonth && paidDate.getFullYear() === thisYear
        } catch (error) {
          return false
        }
      })
      .reduce((sum, order) => sum + (order.selectedQuote?.amount || 0), 0)

    // This month's affiliate earnings
    const thisMonthAffiliateEarnings = (affiliateStats.commissionHistory || [])
      .filter(record => {
        try {
          const date = new Date(record.date)
          return date.getMonth() === thisMonth && date.getFullYear() === thisYear
        } catch (error) {
          return false
        }
      })
      .reduce((sum, record) => sum + (record.amount || 0), 0)

    // Last month's job earnings
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear
    
    const lastMonthJobEarnings = completedJobs
      .filter(order => {
        try {
          const paidDate = new Date(order.payment?.paidAt || order.updatedAt)
          return paidDate.getMonth() === lastMonth && paidDate.getFullYear() === lastMonthYear
        } catch (error) {
          return false
        }
      })
      .reduce((sum, order) => sum + (order.selectedQuote?.amount || 0), 0)

    // Last month's affiliate earnings
    const lastMonthAffiliateEarnings = (affiliateStats.commissionHistory || [])
      .filter(record => {
        try {
          const date = new Date(record.date)
          return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear
        } catch (error) {
          return false
        }
      })
      .reduce((sum, record) => sum + (record.amount || 0), 0)

    return NextResponse.json({
      totalEarnings,
      jobEarnings,
      affiliateEarnings,
      thisMonth: {
        total: thisMonthJobEarnings + thisMonthAffiliateEarnings,
        jobs: thisMonthJobEarnings,
        affiliate: thisMonthAffiliateEarnings
      },
      lastMonth: {
        total: lastMonthJobEarnings + lastMonthAffiliateEarnings,
        jobs: lastMonthJobEarnings,
        affiliate: lastMonthAffiliateEarnings
      },
      completedJobsCount: completedJobs.length
    })
  } catch (error) {
    console.error('Error fetching vendor earnings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch earnings data' },
      { status: 500 }
    )
  }
}

// Apply rate limiting to the handler
export const GET = withRateLimit(getVendorEarnings, 'vendor'); 