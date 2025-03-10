import { storage, orderStorage, vendorStorage, userStorage, reviewStorage } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import { notificationService } from './notificationService';

class ReviewService {
  /**
   * Add a review for a vendor
   * @param {string} orderId - Order ID
   * @param {string} vendorId - Vendor ID
   * @param {number} rating - Rating (1-5)
   * @param {string} comment - Review comment
   * @param {string} userEmail - User email (for authorization)
   * @returns {Promise<Object>} - Updated order and vendor
   */
  async addReview(orderId, vendorId, rating, comment, userEmail) {
    if (!orderId || !vendorId || !rating || rating < 1 || rating > 5) {
      throw new Error('Invalid review data');
    }

    // Get order to verify it's completed and user is authorized
    const order = await orderStorage.getById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    if (order.userEmail !== userEmail) {
      throw new Error('Not authorized to review this order');
    }
    
    if (order.vendorId !== vendorId) {
      throw new Error('Cannot review a vendor that was not selected for this order');
    }
    
    if (order.status !== 'Completed' && order.status !== 'Paid') {
      throw new Error('Cannot review an incomplete order');
    }
    
    // Check if review already exists
    const existingReviews = await reviewStorage.getByOrderId(orderId);
    if (existingReviews && existingReviews.length > 0) {
      throw new Error('Review already exists for this order');
    }

    // Get user and vendor details
    const user = await userStorage.getByEmail(userEmail);
    if (!user) {
      throw new Error('User not found');
    }
    
    const vendor = await vendorStorage.getById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Create review in database
    const reviewId = uuidv4();
    const review = await reviewStorage.create({
      id: reviewId,
      orderId: orderId,
      userId: user.id,
      receiverId: vendor.userId, // The vendor's user ID
      rating: rating,
      comment: comment
    });

    // Update vendor's rating
    const vendorReviews = await reviewStorage.getByReceiverId(vendor.userId);
    const totalRating = vendorReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / vendorReviews.length;
    
    await vendorStorage.update(vendorId, {
      rating: averageRating,
      totalRatings: vendorReviews.length
    });

    // Send notification to vendor
    await notificationService.sendReviewNotification(vendor, order, rating, comment);

    return review;
  }

  /**
   * Get all reviews for a vendor with filtering and sorting options
   * @param {string} vendorId - Vendor ID
   * @param {Object} options - Filter and sort options
   * @param {number} options.minRating - Minimum rating filter
   * @param {number} options.maxRating - Maximum rating filter
   * @param {string} options.sortBy - Field to sort by (rating, createdAt)
   * @param {string} options.sortOrder - Sort direction (asc, desc)
   * @param {string} options.startDate - Filter reviews after this date
   * @param {string} options.endDate - Filter reviews before this date
   * @returns {Promise<Array>} - Array of reviews
   */
  async getVendorReviews(vendorId, options = {}) {
    // Get vendor details
    const vendor = await vendorStorage.getById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Get all reviews for this vendor
    const reviews = await reviewStorage.getByReceiverId(vendor.userId);
    
    // Apply filters
    const { minRating, maxRating, sortBy, sortOrder, startDate, endDate } = options;
    
    let filteredReviews = [...reviews];
    
    if (minRating) {
      filteredReviews = filteredReviews.filter(r => r.rating >= minRating);
    }
    
    if (maxRating) {
      filteredReviews = filteredReviews.filter(r => r.rating <= maxRating);
    }
    
    if (startDate) {
      const startDateObj = new Date(startDate);
      filteredReviews = filteredReviews.filter(r => new Date(r.createdAt) >= startDateObj);
    }
    
    if (endDate) {
      const endDateObj = new Date(endDate);
      filteredReviews = filteredReviews.filter(r => new Date(r.createdAt) <= endDateObj);
    }
    
    // Apply sorting
    if (sortBy) {
      filteredReviews.sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];
        
        // Handle date comparisons
        if (sortBy === 'createdAt') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }
        
        return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      });
    } else {
      // Default sort by most recent
      filteredReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    return filteredReviews;
  }

  /**
   * Get review statistics for a vendor
   * @param {string} vendorId - Vendor ID
   * @returns {Promise<Object>} - Review statistics
   */
  async getVendorReviewStats(vendorId) {
    // Get vendor details
    const vendor = await vendorStorage.getById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }
    
    // Use the reviewStorage's getVendorStats method
    return await reviewStorage.getVendorStats(vendor.userId);
  }

  /**
   * Get review trends over time
   * @param {string} vendorId - Vendor ID
   * @param {string} timeframe - Timeframe for grouping (daily, weekly, monthly)
   * @returns {Promise<Object>} - Review trends
   */
  async getVendorReviewTrends(vendorId, timeframe = 'monthly') {
    // Get vendor details
    const vendor = await vendorStorage.getById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }
    
    // Get all reviews for this vendor
    const reviews = await reviewStorage.getByReceiverId(vendor.userId);
    
    if (!reviews.length) {
      return {
        trends: [],
        averageRatingTrend: 0
      };
    }

    // Group reviews by timeframe
    const groupedReviews = {};
    
    reviews.forEach(review => {
      const date = new Date(review.createdAt);
      let key;
      
      if (timeframe === 'daily') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (timeframe === 'weekly') {
        // Get the week number
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        key = `${date.getFullYear()}-W${weekNum}`;
      } else {
        // Monthly is default
        key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      }
      
      if (!groupedReviews[key]) {
        groupedReviews[key] = {
          period: key,
          count: 0,
          totalRating: 0,
          averageRating: 0
        };
      }
      
      groupedReviews[key].count++;
      groupedReviews[key].totalRating += review.rating;
      groupedReviews[key].averageRating = groupedReviews[key].totalRating / groupedReviews[key].count;
    });
    
    // Convert to array and sort by period
    const trends = Object.values(groupedReviews).sort((a, b) => a.period.localeCompare(b.period));
    
    // Calculate overall trend
    const firstPeriod = trends[0];
    const lastPeriod = trends[trends.length - 1];
    const averageRatingTrend = lastPeriod.averageRating - firstPeriod.averageRating;
    
    return {
      trends,
      averageRatingTrend
    };
  }

  /**
   * Add vendor response to a review
   * @param {string} reviewId - Review ID
   * @param {string} orderId - Order ID
   * @param {string} vendorId - Vendor ID
   * @param {string} responseText - Vendor's response
   * @param {string} vendorEmail - Vendor email (for authorization)
   * @returns {Promise<Object>} - Updated review
   */
  async addVendorResponse(reviewId, orderId, vendorId, responseText, vendorEmail) {
    if (!reviewId || !orderId || !vendorId || !responseText) {
      throw new Error('Invalid response data');
    }

    // Verify vendor is authorized
    const vendor = await vendorStorage.getById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }
    
    // Get the vendor's user to check email
    const vendorUser = await userStorage.getById(vendor.userId);
    if (!vendorUser || vendorUser.email !== vendorEmail) {
      throw new Error('Not authorized to respond to this review');
    }
    
    // Get the review
    const review = await reviewStorage.getById(reviewId);
    if (!review) {
      throw new Error('Review not found');
    }
    
    if (review.orderId !== orderId) {
      throw new Error('Review does not match the order');
    }
    
    if (review.receiverId !== vendor.userId) {
      throw new Error('Review is not for this vendor');
    }
    
    // Update the review with the vendor's response
    // Note: The Prisma schema doesn't have a field for vendor response
    // In a real implementation, you would add this field to the schema
    // For now, we'll just update the comment field to include the response
    const updatedReview = await reviewStorage.update(reviewId, {
      comment: `${review.comment || ''}\n\nVendor Response: ${responseText}`
    });
    
    return updatedReview;
  }

  /**
   * Update an existing review
   * @param {string} reviewId - Review ID
   * @param {string} orderId - Order ID
   * @param {string} vendorId - Vendor ID
   * @param {number} rating - New rating (1-5)
   * @param {string} comment - New comment
   * @param {string} userEmail - User email (for authorization)
   * @returns {Promise<Object>} - Updated review
   */
  async updateReview(reviewId, orderId, vendorId, rating, comment, userEmail) {
    if (!reviewId || !orderId || !vendorId || !rating || rating < 1 || rating > 5) {
      throw new Error('Invalid review data');
    }

    // Get user by email
    const user = await userStorage.getByEmail(userEmail);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Get the review
    const review = await reviewStorage.getById(reviewId);
    if (!review) {
      throw new Error('Review not found');
    }
    
    if (review.orderId !== orderId) {
      throw new Error('Review does not match the order');
    }
    
    if (review.userId !== user.id) {
      throw new Error('Not authorized to update this review');
    }
    
    // Get vendor
    const vendor = await vendorStorage.getById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }
    
    if (review.receiverId !== vendor.userId) {
      throw new Error('Review is not for this vendor');
    }
    
    // Update the review
    const updatedReview = await reviewStorage.update(reviewId, {
      rating,
      comment
    });
    
    // Update vendor's rating
    const vendorReviews = await reviewStorage.getByReceiverId(vendor.userId);
    const totalRating = vendorReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / vendorReviews.length;
    
    await vendorStorage.update(vendorId, {
      rating: averageRating,
      totalRatings: vendorReviews.length
    });
    
    return updatedReview;
  }

  /**
   * Delete a review
   * @param {string} reviewId - Review ID
   * @param {string} orderId - Order ID
   * @param {string} vendorId - Vendor ID
   * @param {string} userEmail - User email (for authorization)
   * @returns {Promise<boolean>} - Whether the deletion was successful
   */
  async deleteReview(reviewId, orderId, vendorId, userEmail) {
    if (!reviewId || !orderId || !vendorId) {
      throw new Error('Invalid review data');
    }

    // Get user by email
    const user = await userStorage.getByEmail(userEmail);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Get the review
    const review = await reviewStorage.getById(reviewId);
    if (!review) {
      throw new Error('Review not found');
    }
    
    if (review.orderId !== orderId) {
      throw new Error('Review does not match the order');
    }
    
    if (review.userId !== user.id) {
      throw new Error('Not authorized to delete this review');
    }
    
    // Get vendor
    const vendor = await vendorStorage.getById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }
    
    if (review.receiverId !== vendor.userId) {
      throw new Error('Review is not for this vendor');
    }
    
    // Delete the review
    await reviewStorage.delete(reviewId);
    
    // Update vendor's rating
    const vendorReviews = await reviewStorage.getByReceiverId(vendor.userId);
    
    if (vendorReviews.length > 0) {
      const totalRating = vendorReviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / vendorReviews.length;
      
      await vendorStorage.update(vendorId, {
        rating: averageRating,
        totalRatings: vendorReviews.length
      });
    } else {
      // No reviews left, reset rating
      await vendorStorage.update(vendorId, {
        rating: 0,
        totalRatings: 0
      });
    }
    
    return true;
  }
}

export const reviewService = new ReviewService(); 