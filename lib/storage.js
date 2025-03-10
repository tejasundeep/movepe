const prisma = require('./prisma');
const { v4: uuidv4 } = require('uuid');

// Helper function to parse JSON strings from SQLite
function parseJsonFields(obj, fields) {
  if (!obj) return obj;
  
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      try {
        result[field] = JSON.parse(result[field]);
      } catch (error) {
        console.error(`Error parsing JSON for field ${field}:`, error);
        result[field] = [];
      }
    }
  }
  return result;
}

// User operations
const userStorage = {
  async getAll() {
    return await prisma.user.findMany();
  },
  
  async getById(id) {
    return await prisma.user.findUnique({
      where: { id }
    });
  },
  
  async getByEmail(email) {
    return await prisma.user.findUnique({
      where: { email }
    });
  },
  
  async create(userData) {
    return await prisma.user.create({
      data: {
        id: userData.id || uuidv4(),
        ...userData,
        createdAt: userData.createdAt || new Date(),
        updatedAt: userData.updatedAt || new Date()
      }
    });
  },
  
  async update(id, userData) {
    return await prisma.user.update({
      where: { id },
      data: {
        ...userData,
        updatedAt: new Date()
      }
    });
  },
  
  async delete(id) {
    return await prisma.user.delete({
      where: { id }
    });
  },
  
  async getUserCount(role) {
    if (role && role !== 'all') {
      return await prisma.user.count({
        where: { role }
      });
    }
    
    // Count all users if no role specified or role is 'all'
    return await prisma.user.count();
  }
};

// Vendor operations
const vendorStorage = {
  async getAll() {
    const vendors = await prisma.vendor.findMany({
      include: {
        user: true
      }
    });
    
    return vendors.map(vendor => {
      const parsedVendor = parseJsonFields(vendor, ['serviceAreas', 'specialties']);
      return {
        ...parsedVendor,
        name: vendor.user.name,
        email: vendor.user.email,
        phone: vendor.user.phone
      };
    });
  },
  
  async getById(id) {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        user: true
      }
    });
    
    if (!vendor) return null;
    
    const parsedVendor = parseJsonFields(vendor, ['serviceAreas', 'specialties']);
    return {
      ...parsedVendor,
      name: vendor.user.name,
      email: vendor.user.email,
      phone: vendor.user.phone
    };
  },
  
  async getByUserId(userId) {
    const vendor = await prisma.vendor.findUnique({
      where: { userId },
      include: {
        user: true
      }
    });
    
    if (!vendor) return null;
    
    const parsedVendor = parseJsonFields(vendor, ['serviceAreas', 'specialties']);
    return {
      ...parsedVendor,
      name: vendor.user.name,
      email: vendor.user.email,
      phone: vendor.user.phone
    };
  },
  
  async create(vendorData) {
    // Convert arrays to JSON strings
    const serviceAreas = Array.isArray(vendorData.serviceAreas) 
      ? JSON.stringify(vendorData.serviceAreas) 
      : JSON.stringify([]);
      
    const specialties = Array.isArray(vendorData.specialties) 
      ? JSON.stringify(vendorData.specialties) 
      : JSON.stringify([]);
    
    return await prisma.vendor.create({
      data: {
        id: vendorData.id || uuidv4(),
        userId: vendorData.userId,
        businessName: vendorData.businessName,
        description: vendorData.description || null,
        serviceAreas,
        specialties,
        basePrice: vendorData.basePrice || 0,
        isVerified: vendorData.isVerified || false,
        rating: vendorData.rating || 0,
        totalRatings: vendorData.totalRatings || 0,
        createdAt: vendorData.createdAt || new Date(),
        updatedAt: vendorData.updatedAt || new Date()
      },
      include: {
        user: true
      }
    });
  },
  
  async update(id, vendorData) {
    // Handle arrays for SQLite
    if (vendorData.serviceAreas && Array.isArray(vendorData.serviceAreas)) {
      vendorData.serviceAreas = JSON.stringify(vendorData.serviceAreas);
    }
    
    if (vendorData.specialties && Array.isArray(vendorData.specialties)) {
      vendorData.specialties = JSON.stringify(vendorData.specialties);
    }
    
    return await prisma.vendor.update({
      where: { id },
      data: {
        ...vendorData,
        updatedAt: new Date()
      },
      include: {
        user: true
      }
    });
  },
  
  async delete(id) {
    return await prisma.vendor.delete({
      where: { id }
    });
  },
  
  async getVendorCount() {
    return await prisma.vendor.count();
  }
};

// Rider operations
const riderStorage = {
  async getAll() {
    const riders = await prisma.rider.findMany({
      include: {
        user: true
      }
    });
    
    return riders.map(rider => {
      const parsedRider = parseJsonFields(rider, ['serviceAreas']);
      return {
        ...parsedRider,
        name: rider.user.name,
        email: rider.user.email,
        phone: rider.user.phone
      };
    });
  },
  
  async getById(id) {
    const rider = await prisma.rider.findUnique({
      where: { id },
      include: {
        user: true
      }
    });
    
    if (!rider) return null;
    
    const parsedRider = parseJsonFields(rider, ['serviceAreas']);
    return {
      ...parsedRider,
      name: rider.user.name,
      email: rider.user.email,
      phone: rider.user.phone
    };
  },
  
  async getByUserId(userId) {
    const rider = await prisma.rider.findUnique({
      where: { userId },
      include: {
        user: true
      }
    });
    
    if (!rider) return null;
    
    const parsedRider = parseJsonFields(rider, ['serviceAreas']);
    return {
      ...parsedRider,
      name: rider.user.name,
      email: rider.user.email,
      phone: rider.user.phone
    };
  },
  
  async create(riderData) {
    // Convert arrays to JSON strings
    const serviceAreas = Array.isArray(riderData.serviceAreas) 
      ? JSON.stringify(riderData.serviceAreas) 
      : JSON.stringify([]);
    
    return await prisma.rider.create({
      data: {
        id: riderData.id || uuidv4(),
        userId: riderData.userId,
        vehicleType: riderData.vehicleType,
        vehicleNumber: riderData.vehicleNumber,
        licenseNumber: riderData.licenseNumber,
        serviceAreas,
        isAvailable: riderData.isAvailable || true,
        isVerified: riderData.isVerified || false,
        rating: riderData.rating || 0,
        totalRatings: riderData.totalRatings || 0,
        createdAt: riderData.createdAt || new Date(),
        updatedAt: riderData.updatedAt || new Date()
      },
      include: {
        user: true
      }
    });
  },
  
  async update(id, riderData) {
    // Handle arrays for SQLite
    if (riderData.serviceAreas && Array.isArray(riderData.serviceAreas)) {
      riderData.serviceAreas = JSON.stringify(riderData.serviceAreas);
    }
    
    return await prisma.rider.update({
      where: { id },
      data: {
        ...riderData,
        updatedAt: new Date()
      },
      include: {
        user: true
      }
    });
  },
  
  async delete(id) {
    return await prisma.rider.delete({
      where: { id }
    });
  }
};

// Order operations
const orderStorage = {
  async getAll() {
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        vendor: {
          include: {
            user: true
          }
        },
        rider: {
          include: {
            user: true
          }
        },
        statusHistory: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });
    
    return orders.map(order => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      userEmail: order.customer.email,
      customerName: order.customer.name,
      customerPhone: order.customer.phone,
      vendorId: order.vendorId,
      vendorName: order.vendor?.user?.name,
      riderId: order.riderId,
      riderName: order.rider?.user?.name,
      status: order.status,
      orderType: order.orderType,
      pickupAddress: order.pickupAddress,
      pickupPincode: order.pickupPincode,
      destinationAddress: order.destinationAddress,
      destinationPincode: order.destinationPincode,
      packageDetails: order.moveSize,
      moveDate: order.moveDate,
      specialInstructions: order.specialInstructions,
      amount: order.totalAmount,
      paidAmount: order.paidAmount,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      statusHistory: order.statusHistory.map(entry => ({
        status: entry.status,
        timestamp: entry.createdAt,
        comment: entry.notes
      }))
    }));
  },
  
  async getById(id) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        vendor: {
          include: {
            user: true
          }
        },
        rider: {
          include: {
            user: true
          }
        },
        statusHistory: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });
    
    if (!order) return null;
    
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      userEmail: order.customer.email,
      customerName: order.customer.name,
      customerPhone: order.customer.phone,
      vendorId: order.vendorId,
      vendorName: order.vendor?.user?.name,
      riderId: order.riderId,
      riderName: order.rider?.user?.name,
      status: order.status,
      orderType: order.orderType,
      pickupAddress: order.pickupAddress,
      pickupPincode: order.pickupPincode,
      destinationAddress: order.destinationAddress,
      destinationPincode: order.destinationPincode,
      packageDetails: order.moveSize,
      moveDate: order.moveDate,
      specialInstructions: order.specialInstructions,
      amount: order.totalAmount,
      paidAmount: order.paidAmount,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      statusHistory: order.statusHistory.map(entry => ({
        status: entry.status,
        timestamp: entry.createdAt,
        comment: entry.notes
      }))
    };
  },
  
  async getByCustomerId(customerId) {
    const orders = await prisma.order.findMany({
      where: { customerId },
      include: {
        customer: true,
        vendor: {
          include: {
            user: true
          }
        },
        rider: {
          include: {
            user: true
          }
        },
        statusHistory: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });
    
    return orders.map(order => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      userEmail: order.customer.email,
      customerName: order.customer.name,
      customerPhone: order.customer.phone,
      vendorId: order.vendorId,
      vendorName: order.vendor?.user?.name,
      riderId: order.riderId,
      riderName: order.rider?.user?.name,
      status: order.status,
      orderType: order.orderType,
      pickupAddress: order.pickupAddress,
      pickupPincode: order.pickupPincode,
      destinationAddress: order.destinationAddress,
      destinationPincode: order.destinationPincode,
      packageDetails: order.moveSize,
      moveDate: order.moveDate,
      specialInstructions: order.specialInstructions,
      amount: order.totalAmount,
      paidAmount: order.paidAmount,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      statusHistory: order.statusHistory.map(entry => ({
        status: entry.status,
        timestamp: entry.createdAt,
        comment: entry.notes
      }))
    }));
  },
  
  async create(orderData) {
    // Create the order
    const order = await prisma.order.create({
      data: {
        id: orderData.orderId || uuidv4(),
        orderNumber: orderData.orderNumber || `ORD-${Math.floor(Math.random() * 10000)}`,
        customerId: orderData.customerId,
        vendorId: orderData.vendorId || null,
        riderId: orderData.riderId || null,
        status: orderData.status || 'initiated',
        orderType: orderData.orderType || 'parcel',
        pickupAddress: orderData.pickupAddress,
        pickupPincode: orderData.pickupPincode,
        destinationAddress: orderData.destinationAddress,
        destinationPincode: orderData.destinationPincode,
        moveSize: orderData.packageDetails || orderData.moveSize || null,
        moveDate: orderData.moveDate ? new Date(orderData.moveDate) : null,
        specialInstructions: orderData.specialInstructions || null,
        totalAmount: orderData.amount || null,
        paidAmount: orderData.paidAmount || 0,
        paymentStatus: orderData.paymentStatus || 'pending',
        createdAt: orderData.createdAt ? new Date(orderData.createdAt) : new Date(),
        updatedAt: orderData.updatedAt ? new Date(orderData.updatedAt) : new Date()
      }
    });
    
    // Add initial status history entry
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: order.status,
        notes: 'Order created',
        createdAt: order.createdAt,
        createdBy: null
      }
    });
    
    return order;
  },
  
  async update(id, orderData) {
    // Update the order
    const order = await prisma.order.update({
      where: { id },
      data: {
        vendorId: orderData.vendorId,
        riderId: orderData.riderId,
        status: orderData.status,
        moveDate: orderData.moveDate ? new Date(orderData.moveDate) : undefined,
        specialInstructions: orderData.specialInstructions,
        totalAmount: orderData.amount || orderData.totalAmount,
        paidAmount: orderData.paidAmount,
        paymentStatus: orderData.paymentStatus,
        updatedAt: new Date()
      }
    });
    
    // Add status history entry if status changed
    if (orderData.status) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          status: orderData.status,
          notes: orderData.statusNote || null,
          createdAt: new Date(),
          createdBy: orderData.updatedBy || null
        }
      });
    }
    
    return order;
  },
  
  async delete(id) {
    // Delete status history first due to foreign key constraints
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: id }
    });
    
    // Delete the order
    return await prisma.order.delete({
      where: { id }
    });
  },
  
  async getByUserEmail(userEmail) {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });
    
    if (!user) return [];
    
    const orders = await prisma.order.findMany({
      where: { customerId: user.id },
      include: {
        customer: true,
        vendor: {
          include: { user: true }
        },
        quotes: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Parse JSON fields
    return orders.map(order => parseJsonFields(order, ['items', 'details']));
  },
  
  async getOrderCount() {
    return await prisma.order.count();
  },
  
  async getPendingQuotesCount() {
    const pendingQuotes = await prisma.quote.count({
      where: { status: 'pending' }
    });
    
    return pendingQuotes;
  },
  
  async getRecentOrders(limit = 10) {
    const orders = await prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        vendor: {
          include: { user: true }
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    
    return orders.map(order => {
      const parsedOrder = parseJsonFields(order, ['items', 'details']);
      const currentStatus = order.statusHistory.length > 0 ? order.statusHistory[0].status : order.status;
      
      return {
        id: order.id,
        orderId: order.id.substring(0, 8),
        userEmail: order.customer.email,
        customerName: order.customer.name,
        pickupPincode: order.pickupPincode,
        destinationPincode: order.destinationPincode,
        moveSize: parsedOrder.details?.moveSize || 'Unknown',
        status: currentStatus,
        createdAt: order.createdAt,
        amount: order.amount || 0
      };
    });
  }
};

// Pincode operations
const pincodeStorage = {
  async getAll() {
    const pincodes = await prisma.pincode.findMany();
    
    return pincodes.map(pincode => ({
      pincode: pincode.code,
      city: pincode.city,
      state: pincode.state,
      lat: pincode.latitude ? String(pincode.latitude) : null,
      lon: pincode.longitude ? String(pincode.longitude) : null
    }));
  },
  
  async getByCode(code) {
    const pincode = await prisma.pincode.findUnique({
      where: { code }
    });
    
    if (!pincode) return null;
    
    return {
      pincode: pincode.code,
      city: pincode.city,
      state: pincode.state,
      lat: pincode.latitude ? String(pincode.latitude) : null,
      lon: pincode.longitude ? String(pincode.longitude) : null
    };
  },
  
  async create(pincodeData) {
    return await prisma.pincode.create({
      data: {
        id: uuidv4(),
        code: pincodeData.pincode,
        city: pincodeData.city,
        state: pincodeData.state,
        latitude: pincodeData.lat ? parseFloat(pincodeData.lat) : null,
        longitude: pincodeData.lon ? parseFloat(pincodeData.lon) : null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  },
  
  async update(code, pincodeData) {
    return await prisma.pincode.update({
      where: { code },
      data: {
        city: pincodeData.city,
        state: pincodeData.state,
        latitude: pincodeData.lat ? parseFloat(pincodeData.lat) : null,
        longitude: pincodeData.lon ? parseFloat(pincodeData.lon) : null,
        updatedAt: new Date()
      }
    });
  },
  
  async delete(code) {
    return await prisma.pincode.delete({
      where: { code }
    });
  }
};

// Settings operations
const settingsStorage = {
  async getAll() {
    try {
      const settings = await prisma.setting.findMany();
      return settings || [];
    } catch (error) {
      console.warn('Error accessing settings table:', error);
      return [];
    }
  },
  
  async get(key) {
    try {
      const setting = await prisma.setting.findUnique({
        where: { key }
      });
      return setting ? setting.value : null;
    } catch (error) {
      console.warn(`Error getting setting ${key}:`, error);
      return null;
    }
  },
  
  async set(key, value) {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      
      // Check if setting exists
      const existing = await prisma.setting.findUnique({
        where: { key }
      });
      
      if (existing) {
        return await prisma.setting.update({
          where: { key },
          data: {
            value: stringValue,
            updatedAt: new Date()
          }
        });
      } else {
        return await prisma.setting.create({
          data: {
            id: uuidv4(),
            key,
            value: stringValue,
            description: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
    } catch (error) {
      console.warn(`Error setting ${key}:`, error);
      return null;
    }
  }
};

// Notification template operations
const notificationTemplateStorage = {
  async getAll() {
    const templates = await prisma.notificationTemplate.findMany();
    
    return templates.map(template => {
      const parsedTemplate = parseJsonFields(template, ['variables']);
      return {
        id: template.id,
        name: template.name,
        type: template.type,
        subject: template.subject,
        content: template.content,
        variables: parsedTemplate.variables || [],
        description: null,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      };
    });
  },
  
  async getById(id) {
    const template = await prisma.notificationTemplate.findUnique({
      where: { id }
    });
    
    if (!template) return null;
    
    const parsedTemplate = parseJsonFields(template, ['variables']);
    return {
      id: template.id,
      name: template.name,
      type: template.type,
      subject: template.subject,
      content: template.content,
      variables: parsedTemplate.variables || [],
      description: null,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    };
  },
  
  async getByName(name) {
    const template = await prisma.notificationTemplate.findUnique({
      where: { name }
    });
    
    if (!template) return null;
    
    const parsedTemplate = parseJsonFields(template, ['variables']);
    return {
      id: template.id,
      name: template.name,
      type: template.type,
      subject: template.subject,
      content: template.content,
      variables: parsedTemplate.variables || [],
      description: null,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    };
  },
  
  async create(templateData) {
    // Convert arrays to JSON strings
    const variables = Array.isArray(templateData.variables) 
      ? JSON.stringify(templateData.variables) 
      : JSON.stringify([]);
    
    return await prisma.notificationTemplate.create({
      data: {
        id: templateData.id || uuidv4(),
        name: templateData.name,
        type: templateData.type,
        subject: templateData.subject || null,
        content: templateData.content,
        variables,
        createdAt: templateData.createdAt || new Date(),
        updatedAt: templateData.updatedAt || new Date()
      }
    });
  },
  
  async update(id, templateData) {
    // Handle arrays for SQLite
    if (templateData.variables && Array.isArray(templateData.variables)) {
      templateData.variables = JSON.stringify(templateData.variables);
    }
    
    return await prisma.notificationTemplate.update({
      where: { id },
      data: {
        name: templateData.name,
        type: templateData.type,
        subject: templateData.subject,
        content: templateData.content,
        variables: templateData.variables,
        updatedAt: new Date()
      }
    });
  },
  
  async delete(id) {
    return await prisma.notificationTemplate.delete({
      where: { id }
    });
  }
};

// Notification operations
const notificationStorage = {
  async getAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      userEmail
    } = options;

    // Build where clause
    const where = {};
    
    if (type) {
      where.type = type;
    }
    
    if (status === 'read') {
      where.isRead = true;
    } else if (status === 'unread') {
      where.isRead = false;
    }
    
    if (userEmail) {
      where.user = {
        email: userEmail
      };
    }

    try {
      const notifications = await prisma.notification.findMany({
        where,
        include: {
          user: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      });

      return notifications.map(notification => ({
        ...notification,
        data: notification.data ? JSON.parse(notification.data) : null,
        userName: notification.user?.name || 'Unknown',
        userEmail: notification.user?.email || 'Unknown'
      }));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },
  
  async getCount(options = {}) {
    const {
      type,
      status,
      userEmail
    } = options;

    // Build where clause
    const where = {};
    
    if (type) {
      where.type = type;
    }
    
    if (status === 'read') {
      where.isRead = true;
    } else if (status === 'unread') {
      where.isRead = false;
    }
    
    if (userEmail) {
      where.user = {
        email: userEmail
      };
    }

    try {
      return await prisma.notification.count({ where });
    } catch (error) {
      console.error('Error counting notifications:', error);
      return 0;
    }
  },
  
  async getByUserId(userId) {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId },
        include: {
          user: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return notifications.map(notification => ({
        ...notification,
        data: notification.data ? JSON.parse(notification.data) : null,
        userName: notification.user?.name || 'Unknown',
        userEmail: notification.user?.email || 'Unknown'
      }));
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      return [];
    }
  },
  
  async create(notificationData) {
    try {
      // Convert data to JSON string if it's an object
      const data = notificationData.data 
        ? (typeof notificationData.data === 'object' 
            ? JSON.stringify(notificationData.data) 
            : notificationData.data)
        : null;
      
      return await prisma.notification.create({
        data: {
          userId: notificationData.userId,
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          data,
          isRead: notificationData.isRead || false,
          createdAt: notificationData.createdAt || new Date()
        },
        include: {
          user: true
        }
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  },
  
  async markAsRead(id) {
    try {
      return await prisma.notification.update({
        where: { id },
        data: {
          isRead: true
        },
        include: {
          user: true
        }
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return null;
    }
  },
  
  async delete(id) {
    try {
      return await prisma.notification.delete({
        where: { id }
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      return null;
    }
  }
};

// Payment operations
const paymentStorage = {
  async getAll() {
    return await prisma.payment.findMany({
      include: {
        order: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  },
  
  async getById(id) {
    return await prisma.payment.findUnique({
      where: { id },
      include: {
        order: true
      }
    });
  },
  
  async getByOrderId(orderId) {
    return await prisma.payment.findMany({
      where: { orderId },
      orderBy: {
        createdAt: 'desc'
      }
    });
  },
  
  async create(paymentData) {
    return await prisma.payment.create({
      data: {
        id: paymentData.id || uuidv4(),
        orderId: paymentData.orderId,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        transactionId: paymentData.transactionId || null,
        status: paymentData.status || 'pending',
        createdAt: paymentData.createdAt || new Date(),
        updatedAt: paymentData.updatedAt || new Date()
      },
      include: {
        order: true
      }
    });
  },
  
  async update(id, paymentData) {
    return await prisma.payment.update({
      where: { id },
      data: {
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        transactionId: paymentData.transactionId,
        status: paymentData.status,
        updatedAt: new Date()
      },
      include: {
        order: true
      }
    });
  },
  
  async delete(id) {
    return await prisma.payment.delete({
      where: { id }
    });
  }
};

// Review operations
const reviewStorage = {
  async getAll() {
    return await prisma.review.findMany({
      include: {
        order: true,
        user: true,
        receiver: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  },
  
  async getById(id) {
    return await prisma.review.findUnique({
      where: { id },
      include: {
        order: true,
        user: true,
        receiver: true
      }
    });
  },
  
  async getByOrderId(orderId) {
    return await prisma.review.findMany({
      where: { orderId },
      include: {
        user: true,
        receiver: true
      }
    });
  },
  
  async getByUserId(userId) {
    return await prisma.review.findMany({
      where: { userId },
      include: {
        order: true,
        receiver: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  },
  
  async getByReceiverId(receiverId) {
    return await prisma.review.findMany({
      where: { receiverId },
      include: {
        order: true,
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  },
  
  async create(reviewData) {
    return await prisma.review.create({
      data: {
        id: reviewData.id || uuidv4(),
        orderId: reviewData.orderId,
        userId: reviewData.userId,
        receiverId: reviewData.receiverId,
        rating: reviewData.rating,
        comment: reviewData.comment || null,
        createdAt: reviewData.createdAt || new Date(),
        updatedAt: reviewData.updatedAt || new Date()
      },
      include: {
        order: true,
        user: true,
        receiver: true
      }
    });
  },
  
  async update(id, reviewData) {
    return await prisma.review.update({
      where: { id },
      data: {
        rating: reviewData.rating,
        comment: reviewData.comment,
        updatedAt: new Date()
      },
      include: {
        order: true,
        user: true,
        receiver: true
      }
    });
  },
  
  async delete(id) {
    return await prisma.review.delete({
      where: { id }
    });
  },
  
  async getVendorStats(vendorId) {
    // Get all reviews for this vendor
    const reviews = await prisma.review.findMany({
      where: { 
        receiverId: vendorId
      }
    });
    
    if (reviews.length === 0) {
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
};

// Inventory operations
const inventoryStorage = {
  async getAll() {
    const inventories = await prisma.inventory.findMany();
    return inventories.map(inventory => parseJsonFields(inventory, ['items']));
  },
  
  async getById(id) {
    const inventory = await prisma.inventory.findUnique({
      where: { id }
    });
    return inventory ? parseJsonFields(inventory, ['items']) : null;
  },
  
  async getByVendorId(vendorId) {
    const inventory = await prisma.inventory.findUnique({
      where: { vendorId }
    });
    return inventory ? parseJsonFields(inventory, ['items']) : null;
  },
  
  async create(inventoryData) {
    // Ensure items is stored as a JSON string
    const data = {
      ...inventoryData,
      items: typeof inventoryData.items === 'string' 
        ? inventoryData.items 
        : JSON.stringify(inventoryData.items),
      createdAt: inventoryData.createdAt || new Date(),
      updatedAt: inventoryData.updatedAt || new Date()
    };
    
    const inventory = await prisma.inventory.create({
      data
    });
    
    return parseJsonFields(inventory, ['items']);
  },
  
  async update(id, inventoryData) {
    // Prepare data for update
    const data = { ...inventoryData };
    
    // Convert items to JSON string if it's an object
    if (data.items && typeof data.items !== 'string') {
      data.items = JSON.stringify(data.items);
    }
    
    // Always update the updatedAt timestamp
    data.updatedAt = new Date();
    
    const inventory = await prisma.inventory.update({
      where: { id },
      data
    });
    
    return parseJsonFields(inventory, ['items']);
  },
  
  async delete(id) {
    return await prisma.inventory.delete({
      where: { id }
    });
  }
};

// Analytics operations
const analyticsStorage = {
  async getAll() {
    const events = await prisma.analyticsEvent.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return events.map(event => parseJsonFields(event, ['eventData']));
  },
  
  async getById(id) {
    const event = await prisma.analyticsEvent.findUnique({
      where: { id }
    });
    return event ? parseJsonFields(event, ['eventData']) : null;
  },
  
  async getByEventType(eventType) {
    const events = await prisma.analyticsEvent.findMany({
      where: { eventType },
      orderBy: { createdAt: 'desc' }
    });
    return events.map(event => parseJsonFields(event, ['eventData']));
  },
  
  async getByUserId(userId) {
    const events = await prisma.analyticsEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    return events.map(event => parseJsonFields(event, ['eventData']));
  },
  
  async create(eventData) {
    // Ensure eventData is stored as a JSON string
    const data = {
      ...eventData,
      eventData: typeof eventData.eventData === 'string' 
        ? eventData.eventData 
        : JSON.stringify(eventData.eventData),
      createdAt: eventData.createdAt || new Date()
    };
    
    const event = await prisma.analyticsEvent.create({
      data
    });
    
    return parseJsonFields(event, ['eventData']);
  },
  
  async delete(id) {
    return await prisma.analyticsEvent.delete({
      where: { id }
    });
  },
  
  async deleteByEventType(eventType) {
    return await prisma.analyticsEvent.deleteMany({
      where: { eventType }
    });
  }
};

// Audit operations
const auditStorage = {
  async getAll() {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: true
      }
    });
    return logs.map(log => parseJsonFields(log, ['details']));
  },
  
  async getById(id) {
    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: true
      }
    });
    return log ? parseJsonFields(log, ['details']) : null;
  },
  
  async getByUserId(userId) {
    const logs = await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true
      }
    });
    return logs.map(log => parseJsonFields(log, ['details']));
  },
  
  async getByEntityType(entityType) {
    const logs = await prisma.auditLog.findMany({
      where: { entityType },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true
      }
    });
    return logs.map(log => parseJsonFields(log, ['details']));
  },
  
  async getByEntityId(entityId) {
    const logs = await prisma.auditLog.findMany({
      where: { entityId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true
      }
    });
    return logs.map(log => parseJsonFields(log, ['details']));
  },
  
  async create(logData) {
    // Ensure details is stored as a JSON string
    const data = {
      ...logData,
      details: typeof logData.details === 'string' 
        ? logData.details 
        : JSON.stringify(logData.details || {}),
      createdAt: logData.createdAt || new Date()
    };
    
    const log = await prisma.auditLog.create({
      data,
      include: {
        user: true
      }
    });
    
    return parseJsonFields(log, ['details']);
  },
  
  async getPaginated(options = {}) {
    const {
      page = 1,
      limit = 20,
      userId,
      entityType,
      action,
      startDate,
      endDate
    } = options;
    
    // Build where clause based on filters
    const where = {};
    
    if (userId) {
      where.userId = userId;
    }
    
    if (entityType) {
      where.entityType = entityType;
    }
    
    if (action) {
      where.action = {
        contains: action
      };
    }
    
    if (startDate) {
      where.createdAt = {
        ...(where.createdAt || {}),
        gte: new Date(startDate)
      };
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1); // Include the end date fully
      
      where.createdAt = {
        ...(where.createdAt || {}),
        lt: end
      };
    }
    
    // Get total count for pagination
    const totalLogs = await prisma.auditLog.count({ where });
    
    // Get paginated logs
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: true
      }
    });
    
    return {
      logs: logs.map(log => parseJsonFields(log, ['details'])),
      pagination: {
        page,
        limit,
        totalLogs,
        totalPages: Math.ceil(totalLogs / limit)
      }
    };
  }
};

// System Health operations
const systemHealthStorage = {
  async getAllApiMetrics() {
    const metrics = await prisma.apiMetric.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return metrics;
  },
  
  async getApiMetricsByEndpoint(endpoint) {
    const metrics = await prisma.apiMetric.findMany({
      where: { path: endpoint },
      orderBy: { createdAt: 'desc' }
    });
    return metrics;
  },
  
  async getApiMetricsByStatusCode(statusCode) {
    const metrics = await prisma.apiMetric.findMany({
      where: { statusCode },
      orderBy: { createdAt: 'desc' }
    });
    return metrics;
  },
  
  async getApiMetricsByMethod(method) {
    const metrics = await prisma.apiMetric.findMany({
      where: { method },
      orderBy: { createdAt: 'desc' }
    });
    return metrics;
  },
  
  async createApiMetric(metricData) {
    const metric = await prisma.apiMetric.create({
      data: {
        ...metricData,
        createdAt: metricData.createdAt || new Date()
      }
    });
    return metric;
  },
  
  async getApiMetricsSummary() {
    // Get total count
    const totalCount = await prisma.apiMetric.count();
    
    // Get average response time
    const avgResponseTimeResult = await prisma.$queryRaw`
      SELECT AVG(responseTime) as avgResponseTime FROM ApiMetric
    `;
    const avgResponseTime = avgResponseTimeResult[0]?.avgResponseTime || 0;
    
    // Get error count (status >= 400)
    const errorCount = await prisma.apiMetric.count({
      where: {
        statusCode: {
          gte: 400
        }
      }
    });
    
    // Get endpoint stats
    const endpointStats = await prisma.$queryRaw`
      SELECT path as endpoint, COUNT(*) as count, AVG(responseTime) as avgResponseTime
      FROM ApiMetric
      GROUP BY path
      ORDER BY count DESC
    `;
    
    // Get method stats
    const methodStats = await prisma.$queryRaw`
      SELECT method, COUNT(*) as count
      FROM ApiMetric
      GROUP BY method
      ORDER BY count DESC
    `;
    
    // Get status code stats
    const statusCodeStats = await prisma.$queryRaw`
      SELECT statusCode, COUNT(*) as count
      FROM ApiMetric
      GROUP BY statusCode
      ORDER BY statusCode ASC
    `;
    
    return {
      totalRequests: totalCount,
      avgResponseTime,
      errorCount,
      errorRate: totalCount > 0 ? (errorCount / totalCount) * 100 : 0,
      endpointStats,
      methodStats,
      statusCodeStats
    };
  },
  
  async deleteOldApiMetrics(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await prisma.apiMetric.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });
    
    return result;
  }
};

// Export all storage modules
module.exports = {
  userStorage,
  vendorStorage,
  riderStorage,
  orderStorage,
  pincodeStorage,
  settingsStorage,
  notificationTemplateStorage,
  notificationStorage,
  paymentStorage,
  reviewStorage,
  inventoryStorage,
  analyticsStorage,
  auditStorage,
  systemHealthStorage
}; 