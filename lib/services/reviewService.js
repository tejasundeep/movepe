import { storage } from '../storage';
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
    const orders = await storage.readData('orders.json');
    if (!orders) {
      throw new Error('Orders data not found');
    }

    const order = orders.find(o => o.orderId === orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    if (order.userEmail !== userEmail) {
      throw new Error('Not authorized to review this order');
    }
    
    if (order.selectedVendorId !== vendorId) {
      throw new Error('Cannot review a vendor that was not selected for this order');
    }
    
    if (order.status !== 'Completed' && order.status !== 'Paid') {
      throw new Error('Cannot review an incomplete order');
    }
    
    // Check if review already exists
    if (order.review) {
      throw new Error('Review already exists for this order');
    }

    // Begin transaction-like operation
    let updatedOrder = null;
    let updatedVendor = null;
    let success = false;

    try {
      // Step 1: Add review to order
      const orderIndex = orders.findIndex(o => o.orderId === orderId);
      updatedOrder = {
        ...order,
        review: {
          id: uuidv4(),
          rating,
          comment,
          createdAt: new Date().toISOString(),
          vendorResponse: null
        }
      };
      
      orders[orderIndex] = updatedOrder;
      const orderUpdateSuccess = await storage.writeData('orders.json', orders);
      
      if (!orderUpdateSuccess) {
        throw new Error('Failed to update order with review');
      }

      // Step 2: Add review to vendor
      await storage.updateData('vendors.json', (vendors) => {
        const vendorIndex = vendors.findIndex(v => v.vendorId === vendorId);
        if (vendorIndex === -1) {
          throw new Error('Vendor not found');
        }

        const vendor = vendors[vendorIndex];
        
        // Initialize reviews array if needed
        vendor.reviews = vendor.reviews || [];
        
        // Add new review
        const reviewId = updatedOrder.review.id;
        vendor.reviews.push({
          id: reviewId,
          orderId,
          rating,
          comment,
          userEmail,
          createdAt: updatedOrder.review.createdAt,
          vendorResponse: null
        });
        
        // Recalculate average rating
        const totalRating = vendor.reviews.reduce((sum, review) => sum + review.rating, 0);
        vendor.rating = totalRating / vendor.reviews.length;
        vendor.reviewCount = vendor.reviews.length;
        
        vendors[vendorIndex] = vendor;
        updatedVendor = vendor;
        
        return vendors;
      });

      if (!updatedVendor) {
        // Rollback order update if vendor update failed
        const originalOrderIndex = orders.findIndex(o => o.orderId === orderId);
        orders[originalOrderIndex] = order;
        await storage.writeData('orders.json', orders);
        throw new Error('Failed to update vendor with review');
      }

      success = true;

      // Send notification to vendor about new review
      try {
        await notificationService.sendReviewNotification(updatedVendor, updatedOrder);
      } catch (error) {
        console.error('Failed to send review notification:', error);
        // Continue execution even if notification fails
      }

      return { order: updatedOrder, vendor: updatedVendor };
    } catch (error) {
      // If we got here and success is false, we need to roll back any changes
      if (!success && updatedOrder) {
        // Attempt to rollback order changes
        const orderIndex = orders.findIndex(o => o.orderId === orderId);
        if (orderIndex !== -1) {
          orders[orderIndex] = order;
          await storage.writeData('orders.json', orders);
        }
      }
      throw error;
    }
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
    const vendors = await storage.readData('vendors.json');
    if (!vendors) {
      throw new Error('Vendors data not found');
    }

    const vendor = vendors.find(v => v.vendorId === vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    let reviews = vendor.reviews || [];
    
    // Apply filters
    const { minRating, maxRating, sortBy, sortOrder, startDate, endDate } = options;
    
    if (minRating) {
      reviews = reviews.filter(r => r.rating >= minRating);
    }
    
    if (maxRating) {
      reviews = reviews.filter(r => r.rating <= maxRating);
    }
    
    if (startDate) {
      const startDateObj = new Date(startDate);
      reviews = reviews.filter(r => new Date(r.createdAt) >= startDateObj);
    }
    
    if (endDate) {
      const endDateObj = new Date(endDate);
      reviews = reviews.filter(r => new Date(r.createdAt) <= endDateObj);
    }
    
    // Apply sorting
    if (sortBy) {
      reviews.sort((a, b) => {
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
      reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    return reviews;
  }

  /**
   * Get review statistics for a vendor
   * @param {string} vendorId - Vendor ID
   * @returns {Promise<Object>} - Review statistics
   */
  async getVendorReviewStats(vendorId) {
    const reviews = await this.getVendorReviews(vendorId);
    
    if (!reviews.length) {
      return {
        averageRating: 0,
        reviewCount: 0,
        ratingDistribution: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0
        }
      };
    }

    // Calculate rating distribution
    const ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };

    reviews.forEach(review => {
      const rating = Math.floor(review.rating);
      if (rating >= 1 && rating <= 5) {
        ratingDistribution[rating]++;
      }
    });

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    return {
      averageRating,
      reviewCount: reviews.length,
      ratingDistribution
    };
  }

  /**
   * Get review trends over time
   * @param {string} vendorId - Vendor ID
   * @param {string} timeframe - Timeframe for grouping (daily, weekly, monthly)
   * @returns {Promise<Object>} - Review trends
   */
  async getVendorReviewTrends(vendorId, timeframe = 'monthly') {
    const reviews = await this.getVendorReviews(vendorId);
    
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
   * @returns {Promise<Object>} - Updated order and vendor
   */
  async addVendorResponse(reviewId, orderId, vendorId, responseText, vendorEmail) {
    if (!reviewId || !orderId || !vendorId || !responseText) {
      throw new Error('Invalid response data');
    }

    // Verify vendor is authorized
    const vendors = await storage.readData('vendors.json');
    if (!vendors) {
      throw new Error('Vendors data not found');
    }

    const vendor = vendors.find(v => v.vendorId === vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }
    
    if (vendor.email !== vendorEmail) {
      throw new Error('Not authorized to respond to this review');
    }
    
    // Find the review in vendor's reviews
    const vendorReviewIndex = vendor.reviews?.findIndex(r => r.id === reviewId);
    if (vendorReviewIndex === -1 || vendorReviewIndex === undefined) {
      throw new Error('Review not found for this vendor');
    }
    
    // Begin transaction-like operation
    let updatedOrder = null;
    let updatedVendor = null;
    let success = false;

    try {
      // Step 1: Update review in vendor
      await storage.updateData('vendors.json', (vendors) => {
        const vendorIndex = vendors.findIndex(v => v.vendorId === vendorId);
        if (vendorIndex === -1) {
          throw new Error('Vendor not found');
        }

        const vendor = vendors[vendorIndex];
        
        if (!vendor.reviews || !Array.isArray(vendor.reviews)) {
          throw new Error('Vendor reviews not found');
        }
        
        // Find and update the review
        const reviewIndex = vendor.reviews.findIndex(r => r.id === reviewId);
        if (reviewIndex === -1) {
          throw new Error('Review not found for this vendor');
        }
        
        vendor.reviews[reviewIndex] = {
          ...vendor.reviews[reviewIndex],
          vendorResponse: {
            text: responseText,
            createdAt: new Date().toISOString()
          }
        };
        
        vendors[vendorIndex] = vendor;
        updatedVendor = vendor;
        
        return vendors;
      });

      if (!updatedVendor) {
        throw new Error('Failed to update vendor with response');
      }

      // Step 2: Update review in order
      const orders = await storage.readData('orders.json');
      if (!orders) {
        throw new Error('Orders data not found');
      }

      const order = orders.find(o => o.orderId === orderId);
      if (!order) {
        throw new Error('Order not found');
      }
      
      if (!order.review || order.review.id !== reviewId) {
        throw new Error('Review not found for this order');
      }

      const orderIndex = orders.findIndex(o => o.orderId === orderId);
      updatedOrder = {
        ...order,
        review: {
          ...order.review,
          vendorResponse: {
            text: responseText,
            createdAt: new Date().toISOString()
          }
        }
      };
      
      orders[orderIndex] = updatedOrder;
      const orderUpdateSuccess = await storage.writeData('orders.json', orders);
      
      if (!orderUpdateSuccess) {
        // Rollback vendor update
        await storage.updateData('vendors.json', (vendors) => {
          const vendorIndex = vendors.findIndex(v => v.vendorId === vendorId);
          if (vendorIndex !== -1) {
            vendors[vendorIndex] = vendor;
          }
          return vendors;
        });
        throw new Error('Failed to update order with vendor response');
      }

      success = true;

      // Notify user about vendor response
      try {
        await notificationService.sendVendorResponseNotification(updatedOrder, updatedVendor);
      } catch (error) {
        console.error('Failed to send vendor response notification:', error);
        // Continue execution even if notification fails
      }

      return { order: updatedOrder, vendor: updatedVendor };
    } catch (error) {
      // If we got here and success is false, we need to roll back any changes
      if (!success && updatedVendor) {
        // Attempt to rollback vendor changes
        await storage.updateData('vendors.json', (vendors) => {
          const vendorIndex = vendors.findIndex(v => v.vendorId === vendorId);
          if (vendorIndex !== -1) {
            vendors[vendorIndex] = vendor;
          }
          return vendors;
        });
      }
      throw error;
    }
  }

  /**
   * Update an existing review
   * @param {string} reviewId - Review ID
   * @param {string} orderId - Order ID
   * @param {string} vendorId - Vendor ID
   * @param {number} rating - New rating (1-5)
   * @param {string} comment - New comment
   * @param {string} userEmail - User email (for authorization)
   * @returns {Promise<Object>} - Updated order and vendor
   */
  async updateReview(reviewId, orderId, vendorId, rating, comment, userEmail) {
    if (!reviewId || !orderId || !vendorId || !rating || rating < 1 || rating > 5) {
      throw new Error('Invalid review data');
    }

    // Get order to verify user is authorized
    const orders = await storage.readData('orders.json');
    if (!orders) {
      throw new Error('Orders data not found');
    }

    const order = orders.find(o => o.orderId === orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    if (order.userEmail !== userEmail) {
      throw new Error('Not authorized to update this review');
    }
    
    if (!order.review) {
      throw new Error('Review not found for this order');
    }
    
    if (order.review.id !== reviewId) {
      throw new Error('Review ID does not match the order');
    }

    // Begin transaction-like operation
    let updatedOrder = null;
    let updatedVendor = null;
    let success = false;

    try {
      // Step 1: Update review in order
      const orderIndex = orders.findIndex(o => o.orderId === orderId);
      updatedOrder = {
        ...order,
        review: {
          ...order.review,
          rating,
          comment,
          updatedAt: new Date().toISOString()
        }
      };
      
      orders[orderIndex] = updatedOrder;
      const orderUpdateSuccess = await storage.writeData('orders.json', orders);
      
      if (!orderUpdateSuccess) {
        throw new Error('Failed to update order with review changes');
      }

      // Step 2: Update review in vendor
      await storage.updateData('vendors.json', (vendors) => {
        const vendorIndex = vendors.findIndex(v => v.vendorId === vendorId);
        if (vendorIndex === -1) {
          throw new Error('Vendor not found');
        }

        const vendor = vendors[vendorIndex];
        
        if (!vendor.reviews || !Array.isArray(vendor.reviews)) {
          throw new Error('Vendor reviews not found');
        }
        
        // Find and update the review
        const reviewIndex = vendor.reviews.findIndex(r => r.id === reviewId);
        if (reviewIndex === -1) {
          throw new Error('Review not found for this vendor');
        }
        
        vendor.reviews[reviewIndex] = {
          ...vendor.reviews[reviewIndex],
          rating,
          comment,
          updatedAt: updatedOrder.review.updatedAt
        };
        
        // Recalculate average rating
        const totalRating = vendor.reviews.reduce((sum, review) => sum + review.rating, 0);
        vendor.rating = totalRating / vendor.reviews.length;
        
        vendors[vendorIndex] = vendor;
        updatedVendor = vendor;
        
        return vendors;
      });

      if (!updatedVendor) {
        // Rollback order update
        const originalOrderIndex = orders.findIndex(o => o.orderId === orderId);
        orders[originalOrderIndex] = order;
        await storage.writeData('orders.json', orders);
        throw new Error('Failed to update vendor with review changes');
      }

      success = true;
      return { order: updatedOrder, vendor: updatedVendor };
    } catch (error) {
      // If we got here and success is false, we need to roll back any changes
      if (!success && updatedOrder) {
        // Attempt to rollback order changes
        const orderIndex = orders.findIndex(o => o.orderId === orderId);
        if (orderIndex !== -1) {
          orders[orderIndex] = order;
          await storage.writeData('orders.json', orders);
        }
      }
      throw error;
    }
  }

  /**
   * Delete a review
   * @param {string} reviewId - Review ID
   * @param {string} orderId - Order ID
   * @param {string} vendorId - Vendor ID
   * @param {string} userEmail - User email (for authorization)
   * @returns {Promise<Object>} - Updated order and vendor
   */
  async deleteReview(reviewId, orderId, vendorId, userEmail) {
    if (!reviewId || !orderId || !vendorId) {
      throw new Error('Invalid review data');
    }

    // Get order to verify user is authorized
    const orders = await storage.readData('orders.json');
    if (!orders) {
      throw new Error('Orders data not found');
    }

    const order = orders.find(o => o.orderId === orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    if (order.userEmail !== userEmail) {
      throw new Error('Not authorized to delete this review');
    }
    
    if (!order.review) {
      throw new Error('Review not found for this order');
    }
    
    if (order.review.id !== reviewId) {
      throw new Error('Review ID does not match the order');
    }

    // Begin transaction-like operation
    let updatedOrder = null;
    let updatedVendor = null;
    let success = false;

    try {
      // Step 1: Remove review from order
      const orderIndex = orders.findIndex(o => o.orderId === orderId);
      updatedOrder = {
        ...order
      };
      delete updatedOrder.review;
      
      orders[orderIndex] = updatedOrder;
      const orderUpdateSuccess = await storage.writeData('orders.json', orders);
      
      if (!orderUpdateSuccess) {
        throw new Error('Failed to update order when deleting review');
      }

      // Step 2: Remove review from vendor
      await storage.updateData('vendors.json', (vendors) => {
        const vendorIndex = vendors.findIndex(v => v.vendorId === vendorId);
        if (vendorIndex === -1) {
          throw new Error('Vendor not found');
        }

        const vendor = vendors[vendorIndex];
        
        if (!vendor.reviews || !Array.isArray(vendor.reviews)) {
          throw new Error('Vendor reviews not found');
        }
        
        // Find and remove the review
        const reviewIndex = vendor.reviews.findIndex(r => r.id === reviewId);
        if (reviewIndex === -1) {
          throw new Error('Review not found for this vendor');
        }
        
        vendor.reviews.splice(reviewIndex, 1);
        
        // Recalculate average rating
        if (vendor.reviews.length > 0) {
          const totalRating = vendor.reviews.reduce((sum, review) => sum + review.rating, 0);
          vendor.rating = totalRating / vendor.reviews.length;
        } else {
          vendor.rating = 0;
        }
        vendor.reviewCount = vendor.reviews.length;
        
        vendors[vendorIndex] = vendor;
        updatedVendor = vendor;
        
        return vendors;
      });

      if (!updatedVendor) {
        // Rollback order update
        const originalOrderIndex = orders.findIndex(o => o.orderId === orderId);
        orders[originalOrderIndex] = order;
        await storage.writeData('orders.json', orders);
        throw new Error('Failed to update vendor when deleting review');
      }

      success = true;
      return { order: updatedOrder, vendor: updatedVendor };
    } catch (error) {
      // If we got here and success is false, we need to roll back any changes
      if (!success && updatedOrder) {
        // Attempt to rollback order changes
        const orderIndex = orders.findIndex(o => o.orderId === orderId);
        if (orderIndex !== -1) {
          orders[orderIndex] = order;
          await storage.writeData('orders.json', orders);
        }
      }
      throw error;
    }
  }
}

export const reviewService = new ReviewService(); 