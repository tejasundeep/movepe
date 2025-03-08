import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { reviewService } from '../../../lib/services/reviewService'
import { storage } from '../../../lib/storage'
import { withRateLimit } from '../../../lib/middleware/rateLimitMiddleware'

// GET /api/reviews - Get reviews with pagination and filtering
async function getReviews(request) {
  try {
    const { searchParams } = new URL(request.url)
    const vendorId = searchParams.get('vendorId')
    const orderId = searchParams.get('orderId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    // New filter and sort parameters
    const minRating = searchParams.get('minRating') ? parseInt(searchParams.get('minRating')) : null
    const maxRating = searchParams.get('maxRating') ? parseInt(searchParams.get('maxRating')) : null
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const trends = searchParams.get('trends') === 'true'
    const stats = searchParams.get('stats') === 'true'
    const timeframe = searchParams.get('timeframe') || 'monthly'

    // Validate parameters
    if (vendorId && orderId) {
      return NextResponse.json(
        { error: 'Cannot specify both vendorId and orderId' },
        { status: 400 }
      )
    }

    let reviews = []
    let total = 0
    let statsData = null
    let trendsData = null

    // Get reviews by vendor ID
    if (vendorId) {
      const vendor = await storage.readData('vendors.json')
        .then(vendors => vendors.find(v => v.vendorId === vendorId))
      
      if (!vendor) {
        return NextResponse.json(
          { error: 'Vendor not found' },
          { status: 404 }
        )
      }
      
      // Get reviews from vendor object
      reviews = vendor.reviews || []
      
      // Apply filters
      if (minRating) {
        reviews = reviews.filter(review => review.rating >= minRating)
      }
      
      if (maxRating) {
        reviews = reviews.filter(review => review.rating <= maxRating)
      }
      
      if (startDate) {
        const startTimestamp = new Date(startDate).getTime()
        reviews = reviews.filter(review => new Date(review.createdAt).getTime() >= startTimestamp)
      }
      
      if (endDate) {
        const endTimestamp = new Date(endDate).getTime()
        reviews = reviews.filter(review => new Date(review.createdAt).getTime() <= endTimestamp)
      }
      
      // Calculate total before pagination
      total = reviews.length
      
      // Sort reviews
      reviews.sort((a, b) => {
        if (sortBy === 'rating') {
          return sortOrder === 'asc' ? a.rating - b.rating : b.rating - a.rating
        } else {
          // Default sort by createdAt
          return sortOrder === 'asc' 
            ? new Date(a.createdAt) - new Date(b.createdAt)
            : new Date(b.createdAt) - new Date(a.createdAt)
        }
      })
      
      // Generate stats if requested
      if (stats) {
        statsData = {
          averageRating: reviews.length > 0 
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0,
          totalReviews: reviews.length,
          ratingDistribution: {
            1: reviews.filter(r => r.rating === 1).length,
            2: reviews.filter(r => r.rating === 2).length,
            3: reviews.filter(r => r.rating === 3).length,
            4: reviews.filter(r => r.rating === 4).length,
            5: reviews.filter(r => r.rating === 5).length
          },
          responseRate: reviews.length > 0
            ? (reviews.filter(r => r.vendorResponse).length / reviews.length) * 100
            : 0
        }
      }
      
      // Generate trends if requested
      if (trends) {
        trendsData = reviewService.generateReviewTrends(reviews, timeframe)
      }
      
      // Apply pagination
      reviews = paginateArray(reviews, page, limit)
    }
    // Get review by order ID
    else if (orderId) {
      const orders = await storage.readData('orders.json')
      const order = orders.find(o => o.orderId === orderId)
      
      if (!order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }
      
      if (order.review) {
        reviews = [formatOrderReview(order)]
        total = 1
      } else {
        reviews = []
        total = 0
      }
    }
    
    return NextResponse.json({
      reviews,
      total,
      page,
      limit,
      ...(statsData && { stats: statsData }),
      ...(trendsData && { trends: trendsData })
    })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
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

// POST /api/reviews - Create a new review or add vendor response
async function createReview(request) {
  // Check if this is a vendor response
  const url = new URL(request.url);
  const isVendorResponse = url.pathname.endsWith('/response');
  
  if (isVendorResponse) {
    return handleVendorResponse(request);
  }
  
  // If not a vendor response, handle as a regular review submission
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be logged in to submit a review' },
        { status: 401 }
      )
    }

    const { orderId, vendorId, rating, comment } = await request.json()

    // Validate required fields
    if (!orderId || !vendorId) {
      return NextResponse.json(
        { error: 'Order ID and Vendor ID are required' },
        { status: 400 }
      )
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    try {
      const result = await reviewService.addReview(
        orderId,
        vendorId,
        rating,
        comment || '',
        session.user.email
      );

      return NextResponse.json({
        reviewId: result.order.review.id,
        orderId: result.order.orderId,
        vendorId: result.order.selectedVendorId,
        rating: result.order.review.rating,
        comment: result.order.review.comment,
        createdAt: result.order.review.createdAt,
        userName: session.user.name || 'Anonymous',
        orderDetails: {
          orderNumber: result.order.orderNumber,
        },
      });
    } catch (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}

// Handler for vendor responses to reviews
async function handleVendorResponse(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be logged in to respond to a review' },
        { status: 401 }
      )
    }

    const { reviewId, orderId, vendorId, responseText } = await request.json()

    // Validate required fields
    if (!reviewId || !orderId || !vendorId || !responseText) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify the user is the vendor
    if (session.user.role !== 'vendor' || session.user.id !== vendorId) {
      return NextResponse.json(
        { error: 'You are not authorized to respond to this review' },
        { status: 403 }
      )
    }

    try {
      const result = await reviewService.addVendorResponse(
        reviewId,
        orderId,
        vendorId,
        responseText
      );

      return NextResponse.json({
        success: true,
        reviewId,
        orderId,
        vendorId,
        responseText,
        responseDate: result.responseDate
      });
    } catch (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error adding vendor response:', error)
    return NextResponse.json(
      { error: 'Failed to add response' },
      { status: 500 }
    )
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

    const { reviewId, orderId, rating, comment } = await request.json()

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
        session.user.email,
        { rating, comment }
      );

      return NextResponse.json({
        success: true,
        reviewId,
        orderId,
        rating: result.rating,
        comment: result.comment,
        updatedAt: result.updatedAt
      });
    } catch (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
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
        session.user.email
      );

      return NextResponse.json({
        success: true,
        message: 'Review deleted successfully'
      });
    } catch (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
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

// Apply rate limiting to all handlers
export const GET = withRateLimit(getReviews, 'reviews');
export const POST = withRateLimit(createReview, 'reviews');
export const PUT = withRateLimit(updateReview, 'reviews');
export const DELETE = withRateLimit(deleteReview, 'reviews'); 