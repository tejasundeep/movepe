export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { withRateLimit } from '../../../../../lib/middleware/rateLimitMiddleware';

// GET /api/reviews/[reviewId]/responses - Get responses for a review
async function getReviewResponses(request, { params }) {
  try {
    const { reviewId } = params;
    
    // Check if the review exists
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });
    
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    
    // Get responses for the review
    const responses = await prisma.reviewResponse.findMany({
      where: { reviewId },
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
      orderBy: {
        createdAt: 'asc',
      },
    });
    
    return NextResponse.json({
      success: true,
      responses,
    });
  } catch (error) {
    console.error('Error getting review responses:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get review responses' },
      { status: 500 }
    );
  }
}

// POST /api/reviews/[reviewId]/responses - Create a new response to a review
async function createReviewResponse(request, { params }) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { reviewId } = params;
    
    // Parse request body
    const body = await request.json();
    const { content } = body;
    
    // Validate required fields
    if (!content) {
      return NextResponse.json(
        { error: 'Response content is required' },
        { status: 400 }
      );
    }
    
    // Check if the review exists
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        targetUser: true,
      },
    });
    
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    
    // Check if the user is authorized to respond to this review
    // Only the target user (vendor/rider) or an admin can respond
    if (review.targetUser.id !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You are not authorized to respond to this review' },
        { status: 403 }
      );
    }
    
    // Create the response
    const response = await prisma.reviewResponse.create({
      data: {
        reviewId,
        userId: session.user.id,
        content,
      },
    });
    
    return NextResponse.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error('Error creating review response:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create review response' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the handlers
export const GET = withRateLimit(getReviewResponses, { limit: 100, windowMs: 60000 });
export const POST = withRateLimit(createReviewResponse, { limit: 20, windowMs: 60000 }); 