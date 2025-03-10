export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { reviewService } from '../../../lib/services/reviewService'
import { vendorStorage } from '../../../lib/storage'
import { withRateLimit } from '../../../lib/middleware/rateLimitMiddleware'
import { prisma } from '../../../lib/prisma'

// GET /api/reviews - Get reviews with filtering options
async function getReviews(request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const userId = searchParams.get('userId')
    const targetUserId = searchParams.get('targetUserId')
    const minRating = searchParams.get('minRating') ? parseInt(searchParams.get('minRating'), 10) : undefined
    const maxRating = searchParams.get('maxRating') ? parseInt(searchParams.get('maxRating'), 10) : undefined
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build the query
    const where = {}
    if (orderId) where.orderId = orderId
    if (userId) where.userId = userId
    if (targetUserId) where.targetUserId = targetUserId
    if (minRating !== undefined) where.rating = { ...where.rating, gte: minRating }
    if (maxRating !== undefined) where.rating = { ...where.rating, lte: maxRating }

    // Get reviews with pagination
    const reviews = await prisma.review.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
            role: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            orderType: true,
            createdAt: true,
          },
        },
        criteria: true,
        responses: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: offset,
      take: limit,
    })

    // Get total count for pagination
    const totalCount = await prisma.review.count({ where })

    return NextResponse.json({
      success: true,
      reviews,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + reviews.length < totalCount,
      },
    })
  } catch (error) {
    console.error('Error getting reviews:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get reviews' },
      { status: 500 }
    )
  }
}

function paginateArray(array, page, limit) {
  const startIndex = (page - 1) * limit
  const endIndex = page * limit
  return array.slice(startIndex, endIndex)
}

function formatOrderReview(order) {
  return {
    reviewId: order.review.id,
    orderId: order.orderId,
    vendorId: order.selectedVendorId,
    rating: order.review.rating,
    comment: order.review.comment,
    createdAt: order.review.createdAt,
    vendorResponse: order.review.vendorResponse,
    userName: 'Customer', // We don't expose user details in this context
    orderDetails: {
      orderNumber: order.orderNumber || order.orderId.substring(0, 8),
      moveSize: order.moveSize,
      moveDate: order.moveDate
    }
  }
}

// POST /api/reviews - Create a new review
async function createReview(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { orderId, targetUserId, rating, comment, criteria } = body
    
    // Validate required fields
    if (!orderId || !targetUserId || !rating) {
      return NextResponse.json(
        { error: 'Order ID, target user ID, and rating are required' },
        { status: 400 }
      )
    }
    
    // Check if the order exists and belongs to the user
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    
    // Check if the user is authorized to review this order
    if (order.customerId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You are not authorized to review this order' },
        { status: 403 }
      )
    }
    
    // Check if the target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    })
    
    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }
    
    // Check if a review already exists for this order and target user
    const existingReview = await prisma.review.findFirst({
      where: {
        orderId,
        targetUserId,
      },
    })
    
    if (existingReview) {
      return NextResponse.json(
        { error: 'A review already exists for this order and target user' },
        { status: 400 }
      )
    }
    
    // Create the review
    const review = await prisma.review.create({
      data: {
        orderId,
        userId: session.user.id,
        targetUserId,
        rating,
        comment,
      },
    })
    
    // Create review criteria if provided
    if (criteria && Array.isArray(criteria) && criteria.length > 0) {
      await prisma.reviewCriteria.createMany({
        data: criteria.map(criterion => ({
          reviewId: review.id,
          name: criterion.name,
          rating: criterion.rating,
        })),
      })
    }
    
    // Update the target user's rating
    if (targetUser.role === 'vendor') {
      await updateVendorRating(targetUserId)
    } else if (targetUser.role === 'rider') {
      await updateRiderRating(targetUserId)
    }
    
    return NextResponse.json({
      success: true,
      review: {
        ...review,
        criteria: criteria || [],
      },
    })
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create review' },
      { status: 500 }
    )
  }
}

// Helper function to update vendor rating
async function updateVendorRating(userId) {
  try {
    // Get the vendor
    const vendor = await prisma.vendor.findUnique({
      where: { userId },
    })
    
    if (!vendor) return
    
    // Get all reviews for this vendor
    const reviews = await prisma.review.findMany({
      where: { targetUserId: userId },
    })
    
    if (reviews.length === 0) return
    
    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
    const averageRating = totalRating / reviews.length
    
    // Update vendor rating
    await prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        rating: averageRating,
        totalRatings: reviews.length,
      },
    })
  } catch (error) {
    console.error('Error updating vendor rating:', error)
  }
}

// Helper function to update rider rating
async function updateRiderRating(userId) {
  try {
    // Get the rider
    const rider = await prisma.rider.findUnique({
      where: { userId },
    })
    
    if (!rider) return
    
    // Get all reviews for this rider
    const reviews = await prisma.review.findMany({
      where: { targetUserId: userId },
    })
    
    if (reviews.length === 0) return
    
    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
    const averageRating = totalRating / reviews.length
    
    // Update rider rating
    await prisma.rider.update({
      where: { id: rider.id },
      data: {
        rating: averageRating,
        totalRatings: reviews.length,
      },
    })
  } catch (error) {
    console.error('Error updating rider rating:', error)
  }
}

// PUT /api/reviews - Update an existing review
async function updateReview(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be logged in to update a review' },
        { status: 401 }
      )
    }

    const { reviewId, orderId, vendorId, rating, comment } = await request.json()

    // Validate required fields
    if (!reviewId || !orderId) {
      return NextResponse.json(
        { error: 'Review ID and Order ID are required' },
        { status: 400 }
      )
    }

    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    try {
      const result = await reviewService.updateReview(
        reviewId,
        orderId,
        vendorId,
        rating,
        comment,
        session.user.email
      );

      return NextResponse.json({
        success: true,
        message: 'Review updated successfully',
        review: result
      });
    } catch (error) {
      let status = 500;
      let message = 'Failed to update review';
      
      if (error.message.includes('Review not found')) {
        status = 404;
        message = 'Review not found';
      } else if (error.message.includes('Not authorized')) {
        status = 403;
        message = error.message;
      } else if (error.message.includes('Cannot update')) {
        status = 400;
        message = error.message;
      }
      
      return NextResponse.json(
        { error: message },
        { status }
      );
    }
  } catch (error) {
    console.error('Error updating review:', error)
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    )
  }
}

// DELETE /api/reviews - Delete a review
async function deleteReview(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be logged in to delete a review' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const reviewId = searchParams.get('reviewId')
    const orderId = searchParams.get('orderId')
    const vendorId = searchParams.get('vendorId')

    // Validate required fields
    if (!reviewId || !orderId) {
      return NextResponse.json(
        { error: 'Review ID and Order ID are required' },
        { status: 400 }
      )
    }

    try {
      await reviewService.deleteReview(
        reviewId,
        orderId,
        vendorId,
        session.user.email
      );

      return NextResponse.json({
        success: true,
        message: 'Review deleted successfully'
      });
    } catch (error) {
      let status = 500;
      let message = 'Failed to delete review';
      
      if (error.message.includes('Review not found')) {
        status = 404;
        message = 'Review not found';
      } else if (error.message.includes('Not authorized')) {
        status = 403;
        message = error.message;
      } else if (error.message.includes('Cannot delete')) {
        status = 400;
        message = error.message;
      }
      
      return NextResponse.json(
        { error: message },
        { status }
      );
    }
  } catch (error) {
    console.error('Error deleting review:', error)
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    )
  }
}

// Apply rate limiting to the handlers
export const GET = withRateLimit(getReviews, { limit: 100, windowMs: 60000 })
export const POST = withRateLimit(createReview, { limit: 20, windowMs: 60000 })
export const PUT = withRateLimit(updateReview, 'reviews')
export const DELETE = withRateLimit(deleteReview, 'reviews') 