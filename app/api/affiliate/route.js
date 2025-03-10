export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import { withRateLimit } from '../../../lib/middleware/rateLimitMiddleware';
import { v4 as uuidv4 } from 'uuid';

// GET /api/affiliate - Get affiliate information for the current user
async function getAffiliateInfo(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the user's affiliate information
    const affiliate = await prisma.affiliate.findUnique({
      where: {
        userId: session.user.id,
      },
      include: {
        referrals: true,
        earnings: true,
      },
    });

    // If the user doesn't have an affiliate account yet, return empty data
    if (!affiliate) {
      return NextResponse.json({
        success: true,
        affiliate: null,
        referrals: [],
        earnings: [],
        totalEarnings: 0,
      });
    }

    // Calculate total earnings
    const totalEarnings = affiliate.earnings.reduce(
      (total, earning) => total + earning.amount,
      0
    );

    return NextResponse.json({
      success: true,
      affiliate,
      referrals: affiliate.referrals,
      earnings: affiliate.earnings,
      totalEarnings,
    });
  } catch (error) {
    console.error('Error getting affiliate info:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get affiliate information' },
      { status: 500 }
    );
  }
}

// POST /api/affiliate - Create or update affiliate account
async function createOrUpdateAffiliate(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { paymentDetails } = body;
    
    // Check if the user already has an affiliate account
    let affiliate = await prisma.affiliate.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    if (affiliate) {
      // Update existing affiliate account
      affiliate = await prisma.affiliate.update({
        where: {
          id: affiliate.id,
        },
        data: {
          paymentDetails: paymentDetails || affiliate.paymentDetails,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new affiliate account with a unique referral code
      const referralCode = generateReferralCode(session.user.name);
      
      affiliate = await prisma.affiliate.create({
        data: {
          userId: session.user.id,
          referralCode,
          paymentDetails: paymentDetails || {},
          status: 'ACTIVE',
        },
      });
    }

    return NextResponse.json({
      success: true,
      affiliate,
    });
  } catch (error) {
    console.error('Error creating/updating affiliate account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create/update affiliate account' },
      { status: 500 }
    );
  }
}

// Helper function to generate a unique referral code
function generateReferralCode(name) {
  // Create a code based on the user's name (first 3 characters) and a random string
  const namePrefix = name
    .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
    .substring(0, 3)
    .toUpperCase();
  
  // Generate a random 6-character string
  const randomString = uuidv4().substring(0, 6).toUpperCase();
  
  return `${namePrefix}${randomString}`;
}

// Apply rate limiting to the handlers
export const GET = withRateLimit(getAffiliateInfo, { limit: 100, windowMs: 60000 });
export const POST = withRateLimit(createOrUpdateAffiliate, { limit: 50, windowMs: 60000 }); 