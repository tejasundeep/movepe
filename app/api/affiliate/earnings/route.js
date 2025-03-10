export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware';

// GET /api/affiliate/earnings - Get earnings for the current user
async function getEarnings(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the user's affiliate account
    const affiliate = await prisma.affiliate.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    if (!affiliate) {
      return NextResponse.json(
        { error: 'Affiliate account not found' },
        { status: 404 }
      );
    }

    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    // Build date filter if provided
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Build the query
    const query = {
      where: {
        affiliateId: affiliate.id,
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        referral: {
          include: {
            referredUser: {
              select: {
                id: true,
                name: true,
                email: true,
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
    };

    // Get earnings with pagination
    const earnings = await prisma.affiliateEarning.findMany(query);

    // Get total count for pagination
    const totalCount = await prisma.affiliateEarning.count({
      where: query.where,
    });

    // Calculate total earnings
    const totalEarnings = await prisma.affiliateEarning.aggregate({
      where: query.where,
      _sum: {
        amount: true,
      },
    });

    // Calculate pending and paid amounts
    const pendingEarnings = await prisma.affiliateEarning.aggregate({
      where: {
        affiliateId: affiliate.id,
        status: 'PENDING',
      },
      _sum: {
        amount: true,
      },
    });

    const paidEarnings = await prisma.affiliateEarning.aggregate({
      where: {
        affiliateId: affiliate.id,
        status: 'PAID',
      },
      _sum: {
        amount: true,
      },
    });

    return NextResponse.json({
      success: true,
      earnings,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + earnings.length < totalCount,
      },
      summary: {
        total: totalEarnings._sum.amount || 0,
        pending: pendingEarnings._sum.amount || 0,
        paid: paidEarnings._sum.amount || 0,
      },
    });
  } catch (error) {
    console.error('Error getting earnings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get earnings' },
      { status: 500 }
    );
  }
}

// POST /api/affiliate/earnings - Create a new earning (admin only)
async function createEarning(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can create earnings' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { affiliateId, referralId, amount, description, status } = body;
    
    // Validate required fields
    if (!affiliateId || !amount) {
      return NextResponse.json(
        { error: 'Affiliate ID and amount are required' },
        { status: 400 }
      );
    }
    
    // Create the earning
    const earning = await prisma.affiliateEarning.create({
      data: {
        affiliateId,
        referralId,
        amount,
        description: description || 'Affiliate commission',
        status: status || 'PENDING',
      },
    });
    
    return NextResponse.json({
      success: true,
      earning,
    });
  } catch (error) {
    console.error('Error creating earning:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create earning' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the handlers
export const GET = withRateLimit(getEarnings, { limit: 100, windowMs: 60000 });
export const POST = withRateLimit(createEarning, { limit: 20, windowMs: 60000 }); 