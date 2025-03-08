import { storage } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import { notificationService } from './notificationService';
import { analyticsService } from './analyticsService';

class RiderService {
  /**
   * Get all riders
   * @returns {Promise<Array>} - List of all riders
   */
  async getAllRiders() {
    const riders = await storage.readData('riders.json');
    return riders || [];
  }

  /**
   * Get rider by ID
   * @param {string} riderId - Rider ID
   * @returns {Promise<Object|null>} - Rider object or null if not found
   */
  async getRiderById(riderId) {
    const riders = await this.getAllRiders();
    return riders.find(rider => rider.riderId === riderId) || null;
  }

  /**
   * Get rider by email
   * @param {string} email - Rider email
   * @returns {Promise<Object|null>} - Rider object or null if not found
   */
  async getRiderByEmail(email) {
    const riders = await this.getAllRiders();
    return riders.find(rider => rider.email === email) || null;
  }

  /**
   * Create a new rider
   * @param {Object} riderData - Rider data
   * @returns {Promise<Object>} - Created rider
   */
  async createRider(riderData) {
    const { name, email, phone, whatsapp, vehicleDetails } = riderData;

    // Validate required fields
    if (!name || !email || !phone || !vehicleDetails) {
      throw new Error('Missing required fields');
    }

    // Check if rider already exists
    const existingRider = await this.getRiderByEmail(email);
    if (existingRider) {
      throw new Error('Rider with this email already exists');
    }

    // Create new rider
    const newRider = {
      riderId: uuidv4(),
      name,
      email,
      phone,
      whatsapp: whatsapp || phone,
      currentLocation: riderData.currentLocation || {
        lat: "0",
        lon: "0",
        lastUpdated: new Date().toISOString()
      },
      serviceAreas: riderData.serviceAreas || [],
      status: riderData.status || 'available',
      rating: 0,
      vehicleDetails,
      deliveryCapacity: riderData.deliveryCapacity || {
        maxWeight: 10,
        maxDimensions: {
          length: 50,
          width: 40,
          height: 30
        }
      },
      completedDeliveries: 0,
      createdAt: new Date().toISOString()
    };

    // Add rider to storage
    await storage.updateData('riders.json', (riders) => {
      riders.push(newRider);
      return riders;
    });

    // Track rider creation event
    await analyticsService.trackEvent('rider_created', {
      riderId: newRider.riderId,
      email: newRider.email
    });

    return newRider;
  }

  /**
   * Update rider location
   * @param {string} riderId - Rider ID
   * @param {Object} location - Location object with lat and lon
   * @returns {Promise<Object>} - Updated rider
   */
  async updateRiderLocation(riderId, location) {
    if (!riderId || !location || !location.lat || !location.lon) {
      throw new Error('Rider ID and location coordinates are required');
    }

    const updated = await storage.updateData('riders.json', (riders) => {
      const riderIndex = riders.findIndex(r => r.riderId === riderId);
      if (riderIndex === -1) {
        throw new Error('Rider not found');
      }

      riders[riderIndex].currentLocation = {
        lat: location.lat,
        lon: location.lon,
        lastUpdated: new Date().toISOString()
      };

      return riders;
    });

    if (!updated) {
      throw new Error('Failed to update rider location');
    }

    return this.getRiderById(riderId);
  }

  /**
   * Update rider status
   * @param {string} riderId - Rider ID
   * @param {string} status - New status ('available', 'busy', 'offline')
   * @returns {Promise<Object>} - Updated rider
   */
  async updateRiderStatus(riderId, status) {
    if (!riderId || !status) {
      throw new Error('Rider ID and status are required');
    }

    const validStatuses = ['available', 'busy', 'offline'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const updated = await storage.updateData('riders.json', (riders) => {
      const riderIndex = riders.findIndex(r => r.riderId === riderId);
      if (riderIndex === -1) {
        throw new Error('Rider not found');
      }

      riders[riderIndex].status = status;
      return riders;
    });

    if (!updated) {
      throw new Error('Failed to update rider status');
    }

    return this.getRiderById(riderId);
  }

  /**
   * Find nearby riders within a specified radius
   * @param {Object} location - Location object with lat and lon
   * @param {number} radiusKm - Radius in kilometers
   * @param {boolean} availableOnly - Whether to return only available riders
   * @param {Object} filters - Additional filters for rider selection
   * @returns {Promise<Array>} - List of nearby riders with distance
   */
  async findNearbyRiders(location, radiusKm = 5, availableOnly = true, filters = {}) {
    if (!location || !location.lat || !location.lon) {
      throw new Error('Location coordinates are required');
    }

    const riders = await this.getAllRiders();
    
    // Filter riders by availability if needed
    let filteredRiders = availableOnly 
      ? riders.filter(rider => rider.status === 'available')
      : riders;
    
    // Apply additional filters
    if (filters.minCompletedDeliveries) {
      filteredRiders = filteredRiders.filter(rider => 
        (rider.completedDeliveries || 0) >= filters.minCompletedDeliveries
      );
    }
    
    if (filters.minRating) {
      filteredRiders = filteredRiders.filter(rider => 
        (rider.rating || 0) >= filters.minRating
      );
    }
    
    if (filters.minWeightCapacity) {
      filteredRiders = filteredRiders.filter(rider => 
        (rider.deliveryCapacity?.maxWeight || 0) >= filters.minWeightCapacity
      );
    }

    // Calculate distance for each rider and filter by radius
    const nearbyRiders = filteredRiders
      .map(rider => {
        const distance = this.calculateDistance(
          parseFloat(location.lat),
          parseFloat(location.lon),
          parseFloat(rider.currentLocation.lat),
          parseFloat(rider.currentLocation.lon)
        );
        
        return {
          ...rider,
          distance: parseFloat(distance.toFixed(2))
        };
      })
      .filter(rider => rider.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    return nearbyRiders;
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - Latitude of first point
   * @param {number} lon1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lon2 - Longitude of second point
   * @returns {number} - Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} deg - Degrees
   * @returns {number} - Radians
   */
  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  /**
   * Assign a rider to a delivery with Rapido-style logic
   * @param {string} orderId - Order ID
   * @param {Object} pickupLocation - Pickup location
   * @param {Object} orderDetails - Additional order details for rider matching
   * @returns {Promise<Object|null>} - Assigned rider or null if no riders available
   */
  async assignRiderToDelivery(orderId, pickupLocation, orderDetails = {}) {
    if (!orderId || !pickupLocation) {
      throw new Error('Order ID and pickup location are required');
    }

    // Get order details if not provided
    let orderData = orderDetails;
    if (Object.keys(orderDetails).length === 0) {
      const orders = await storage.readData('orders.json') || [];
      const order = orders.find(o => o.orderId === orderId);
      if (order) {
        orderData = order;
      }
    }

    // Determine if this is an intercity delivery
    const isIntercity = orderData.distanceCategory === 'intercity' || orderData.distanceCategory === 'longDistance';
    
    // For intercity deliveries, we need riders with specific capabilities
    let riderFilters = {};
    
    if (isIntercity) {
      riderFilters = {
        // Riders must have completed at least 50 deliveries for intercity
        minCompletedDeliveries: 50,
        // Riders must have a rating of at least 4.5 for intercity
        minRating: 4.5,
        // For heavy items, rider must have appropriate vehicle
        minWeightCapacity: orderData.parcelWeight || 1
      };
    }

    // Try with initial radius of 5km
    let nearbyRiders = await this.findNearbyRiders(pickupLocation, 5, true, riderFilters);
    
    // If no riders found, expand search radius incrementally up to 20km
    if (nearbyRiders.length === 0) {
      const expandedRadii = [10, 15, 20];
      
      for (const radius of expandedRadii) {
        console.log(`No riders found within ${radius-5}km, expanding search to ${radius}km`);
        nearbyRiders = await this.findNearbyRiders(pickupLocation, radius, true, riderFilters);
        if (nearbyRiders.length > 0) {
          break;
        }
      }
    }
    
    // If still no riders found with filters, try without some filters
    if (nearbyRiders.length === 0 && isIntercity) {
      console.log('No qualified riders found, relaxing requirements');
      // Relax the requirements for intercity
      riderFilters.minCompletedDeliveries = 20;
      riderFilters.minRating = 4.0;
      nearbyRiders = await this.findNearbyRiders(pickupLocation, 20, true, riderFilters);
    }
    
    // If still no riders found, try to find any rider regardless of status
    if (nearbyRiders.length === 0) {
      console.log('No available riders found, searching for any rider within 20km');
      nearbyRiders = await this.findNearbyRiders(pickupLocation, 20, false, riderFilters);
    }
    
    // If still no riders, return null instead of throwing an error
    if (nearbyRiders.length === 0) {
      console.log('No riders found at all, order will be queued for manual assignment');
      
      // Update order to indicate it needs manual assignment
      await storage.updateData('orders.json', (orders) => {
        const orderIndex = orders.findIndex(o => o.orderId === orderId);
        if (orderIndex === -1) {
          return orders;
        }
        
        // Add to status history
        if (!orders[orderIndex].statusHistory) {
          orders[orderIndex].statusHistory = [];
        }
        
        orders[orderIndex].statusHistory.push({
          status: 'Pending Rider Assignment',
          timestamp: new Date().toISOString(),
          comment: 'No riders available nearby, queued for manual assignment'
        });
        
        orders[orderIndex].needsManualAssignment = true;
        
        return orders;
      });
      
      return null;
    }

    // For intercity deliveries, prioritize riders with higher ratings and more experience
    if (isIntercity) {
      // Sort by a combination of distance, rating, and experience
      nearbyRiders.sort((a, b) => {
        // Create a score based on multiple factors
        const scoreA = (a.rating * 10) + (a.completedDeliveries / 100) - (a.distance * 0.5);
        const scoreB = (b.rating * 10) + (b.completedDeliveries / 100) - (b.distance * 0.5);
        return scoreB - scoreA; // Higher score first
      });
    }

    // Select the best rider
    const selectedRider = nearbyRiders[0];
    
    // Update rider status to busy
    await this.updateRiderStatus(selectedRider.riderId, 'busy');
    
    // Update order with assigned rider
    await storage.updateData('orders.json', (orders) => {
      const orderIndex = orders.findIndex(o => o.orderId === orderId);
      if (orderIndex === -1) {
        throw new Error('Order not found');
      }
      
      orders[orderIndex].assignedRiderId = selectedRider.riderId;
      orders[orderIndex].riderAssignedAt = new Date().toISOString();
      orders[orderIndex].status = 'Rider Assigned';
      
      // For intercity deliveries, set expected pickup and delivery times
      if (isIntercity) {
        const now = new Date();
        
        // Expected pickup within 1 hour
        const pickupTime = new Date(now);
        pickupTime.setHours(pickupTime.getHours() + 1);
        orders[orderIndex].expectedPickupTime = pickupTime.toISOString();
        
        // Expected delivery based on distance
        const deliveryTime = new Date(now);
        if (orders[orderIndex].distanceCategory === 'intercity') {
          // Add 72 hours for intercity
          deliveryTime.setHours(deliveryTime.getHours() + 72);
        } else {
          // Add 96 hours for long distance
          deliveryTime.setHours(deliveryTime.getHours() + 96);
        }
        orders[orderIndex].expectedDeliveryTime = deliveryTime.toISOString();
      }
      
      // Add to status history
      if (!orders[orderIndex].statusHistory) {
        orders[orderIndex].statusHistory = [];
      }
      
      orders[orderIndex].statusHistory.push({
        status: 'Rider Assigned',
        timestamp: new Date().toISOString(),
        comment: `Rider ${selectedRider.name} assigned to delivery (${selectedRider.distance.toFixed(2)}km away)`
      });
      
      return orders;
    });
    
    // Notify rider about new delivery
    try {
      await notificationService.sendRiderDeliveryAssignmentNotification(
        selectedRider,
        orderId,
        pickupLocation
      );
    } catch (error) {
      console.error('Error sending rider notification:', error);
      // Continue even if notification fails
    }
    
    // Track rider assignment event
    await analyticsService.trackEvent('rider_assigned', {
      orderId,
      riderId: selectedRider.riderId,
      distance: selectedRider.distance,
      isIntercity
    });
    
    return selectedRider;
  }

  /**
   * Get rider statistics
   * @param {string} riderId - Rider ID
   * @returns {Promise<Object>} - Rider statistics
   */
  async getRiderStatistics(riderId) {
    const rider = await this.getRiderById(riderId);
    if (!rider) {
      throw new Error('Rider not found');
    }
    
    // Get all orders assigned to this rider
    const orders = await storage.readData('orders.json') || [];
    const riderOrders = orders.filter(order => order.assignedRiderId === riderId);
    
    // Calculate statistics
    const completedOrders = riderOrders.filter(order => 
      order.status === 'Delivered' || order.status === 'Completed'
    );
    
    const cancelledOrders = riderOrders.filter(order => 
      order.status === 'Cancelled'
    );
    
    const totalEarnings = completedOrders.reduce(
      (sum, order) => sum + (order.riderPayment || 0), 
      0
    );
    
    // Calculate average delivery time
    const deliveryTimes = completedOrders
      .filter(order => order.riderAssignedAt && order.deliveredAt)
      .map(order => {
        const assignedTime = new Date(order.riderAssignedAt).getTime();
        const deliveredTime = new Date(order.deliveredAt).getTime();
        return (deliveredTime - assignedTime) / (1000 * 60); // in minutes
      });
    
    const averageDeliveryTime = deliveryTimes.length > 0
      ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
      : 0;
    
    return {
      totalDeliveries: riderOrders.length,
      completedDeliveries: completedOrders.length,
      cancelledDeliveries: cancelledOrders.length,
      totalEarnings,
      averageDeliveryTime: Math.round(averageDeliveryTime),
      rating: rider.rating
    };
  }

  /**
   * Record that a rider declined an order
   * @param {string} riderId - Rider ID
   * @param {string} orderId - Order ID
   * @param {string} reason - Reason for declining
   * @returns {Promise<boolean>} - Whether the decline was recorded successfully
   */
  async recordOrderDecline(riderId, orderId, reason) {
    // First, update the order to record that this rider declined it
    await storage.updateData('orders.json', orders => {
      const orderIndex = orders.findIndex(o => o.orderId === orderId);
      
      if (orderIndex === -1) {
        throw new Error('Order not found');
      }
      
      const order = orders[orderIndex];
      
      // Initialize declinedBy array if it doesn't exist
      if (!order.declinedBy) {
        order.declinedBy = [];
      }
      
      // Add rider to declinedBy if not already there
      if (!order.declinedBy.includes(riderId)) {
        order.declinedBy.push(riderId);
      }
      
      // Add decline reason to history
      if (!order.declineHistory) {
        order.declineHistory = [];
      }
      
      order.declineHistory.push({
        riderId,
        reason,
        timestamp: new Date().toISOString()
      });
      
      orders[orderIndex] = order;
      return orders;
    });
    
    // Then, update the rider's decline history
    await storage.updateData('riders.json', riders => {
      const riderIndex = riders.findIndex(r => r.riderId === riderId);
      
      if (riderIndex === -1) {
        throw new Error('Rider not found');
      }
      
      const rider = riders[riderIndex];
      
      // Initialize declinedOrders array if it doesn't exist
      if (!rider.declinedOrders) {
        rider.declinedOrders = [];
      }
      
      // Add order to declinedOrders if not already there
      if (!rider.declinedOrders.includes(orderId)) {
        rider.declinedOrders.push(orderId);
      }
      
      riders[riderIndex] = rider;
      return riders;
    });
    
    return true;
  }
}

export const riderService = new RiderService(); 