export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware';

// GET /api/affiliate/referrals - Get referrals for the current user
async function getReferrals(request) {
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

    // Get query parameters for pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status');

    // Build the query
    const query = {
      where: {
        affiliateId: affiliate.id,
        ...(status ? { status } : {}),
      },
      include: {
        referredUser: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: offset,
      take: limit,
    };

    // Get referrals with pagination
    const referrals = await prisma.referral.findMany(query);

    // Get total count for pagination
    const totalCount = await prisma.referral.count({
      where: query.where,
    });

    return NextResponse.json({
      success: true,
      referrals,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + referrals.length < totalCount,
      },
    });
  } catch (error) {
    console.error('Error getting referrals:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get referrals' },
      { status: 500 }
    );
  }
}

// POST /api/affiliate/referrals - Create a new referral
async function createReferral(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { referralCode, userId } = body;
    
    // Validate required fields
    if (!referralCode || !userId) {
      return NextResponse.json(
        { error: 'Referral code and user ID are required' },
        { status: 400 }
      );
    }
    
    // Find the affiliate by referral code
    const affiliate = await prisma.affiliate.findFirst({
      where: {
        referralCode,
      },
    });
    
    if (!affiliate) {
      return NextResponse.json(
        { error: 'Invalid referral code' },
        { status: 400 }
      );
    }
    
    // Check if the user is trying to refer themselves
    if (affiliate.userId === userId) {
      return NextResponse.json(
        { error: 'You cannot refer yourself' },
        { status: 400 }
      );
    }
    
    // Check if the user has already been referred
    const existingReferral = await prisma.referral.findFirst({
      where: {
        referredUserId: userId,
      },
    });
    
    if (existingReferral) {
      return NextResponse.json(
        { error: 'User has already been referred' },
        { status: 400 }
      );
    }
    
    // Create the referral
    const referral = await prisma.referral.create({
      data: {
        affiliateId: affiliate.id,
        referredUserId: userId,
        status: 'PENDING',
      },
    });
    
    return NextResponse.json({
      success: true,
      referral,
    });
  } catch (error) {
    console.error('Error creating referral:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create referral' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the handlers
export const GET = withRateLimit(getReferrals, { limit: 100, windowMs: 60000 });
export const POST = withRateLimit(createReferral, { limit: 50, windowMs: 60000 }); 