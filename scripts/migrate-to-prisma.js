const fs = require('fs/promises');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// Helper function to read JSON files
async function readJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return [];
  }
}

// Helper function to convert arrays to JSON strings for SQLite
function convertArraysToJsonStrings(obj) {
  const result = { ...obj };
  for (const key in result) {
    if (Array.isArray(result[key])) {
      result[key] = JSON.stringify(result[key]);
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = JSON.stringify(result[key]);
    }
  }
  return result;
}

// Migrate users
async function migrateUsers() {
  console.log('Migrating users...');
  const users = await readJsonFile(path.join(process.cwd(), 'data', 'users.json'));
  
  for (const user of users) {
    try {
      await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          password: user.password,
          name: user.name,
          phone: user.phone || null,
          role: user.role || 'customer',
          isVerified: true,
          profilePicture: null,
          address: null,
          city: null,
          state: null,
          pincode: null,
          createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
          updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
        },
      });
    } catch (error) {
      console.error(`Error migrating user ${user.id}:`, error);
    }
  }
  console.log(`Migrated ${users.length} users`);
}

// Migrate vendors
async function migrateVendors() {
  console.log('Migrating vendors...');
  const vendors = await readJsonFile(path.join(process.cwd(), 'data', 'vendors.json'));
  
  for (const vendor of vendors) {
    try {
      // Find the user ID for this vendor
      let userId = vendor.vendorId;
      
      // If the vendorId is not a valid UUID, we need to find the user by email
      if (vendor.email) {
        try {
          const user = await prisma.user.findUnique({
            where: { email: vendor.email }
          });
          
          if (user) {
            userId = user.id;
          } else {
            // Create a new user for this vendor if not found
            const newUser = await prisma.user.create({
              data: {
                id: uuidv4(),
                email: vendor.email,
                password: '$2b$10$XbQXR7DcatpqbXue1LFJsuTJemud5RyNoUmc9mPRODA.sICE2Ahwi', // Default password
                name: vendor.name,
                phone: vendor.phone || null,
                role: 'vendor',
                isVerified: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              }
            });
            userId = newUser.id;
          }
        } catch (error) {
          console.error(`Error finding/creating user for vendor ${vendor.vendorId}:`, error);
          continue;
        }
      }
      
      if (!userId) {
        console.error(`No user ID found for vendor ${vendor.vendorId}`);
        continue;
      }
      
      const vendorData = {
        id: vendor.vendorId || uuidv4(),
        userId: userId,
        businessName: vendor.name,
        description: vendor.description || null,
        serviceAreas: JSON.stringify(vendor.serviceAreas || []),
        specialties: JSON.stringify(vendor.specialties || []),
        basePrice: vendor.basePrice || 0,
        isVerified: true,
        rating: vendor.rating || 0,
        totalRatings: vendor.reviews ? vendor.reviews.length : 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await prisma.vendor.create({
        data: vendorData,
      });
    } catch (error) {
      console.error(`Error migrating vendor ${vendor.vendorId}:`, error);
    }
  }
  console.log(`Migrated ${vendors.length} vendors`);
}

// Migrate riders
async function migrateRiders() {
  console.log('Migrating riders...');
  const riders = await readJsonFile(path.join(process.cwd(), 'data', 'riders.json'));
  
  for (const rider of riders) {
    try {
      // Find the user ID for this rider
      let userId = rider.riderId;
      
      // If the riderId is not a valid UUID, we need to find the user by email
      if (rider.email) {
        try {
          const user = await prisma.user.findUnique({
            where: { email: rider.email }
          });
          
          if (user) {
            userId = user.id;
          } else {
            // Create a new user for this rider if not found
            const newUser = await prisma.user.create({
              data: {
                id: uuidv4(),
                email: rider.email,
                password: '$2b$10$XbQXR7DcatpqbXue1LFJsuTJemud5RyNoUmc9mPRODA.sICE2Ahwi', // Default password
                name: rider.name,
                phone: rider.phone || null,
                role: 'rider',
                isVerified: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              }
            });
            userId = newUser.id;
          }
        } catch (error) {
          console.error(`Error finding/creating user for rider ${rider.riderId}:`, error);
          continue;
        }
      }
      
      if (!userId) {
        console.error(`No user ID found for rider ${rider.riderId}`);
        continue;
      }
      
      const riderData = {
        id: rider.riderId || uuidv4(),
        userId: userId,
        vehicleType: rider.vehicleDetails?.type || 'motorcycle',
        vehicleNumber: rider.vehicleDetails?.licensePlate || 'Unknown',
        licenseNumber: rider.vehicleDetails?.drivingLicense || 'Unknown',
        serviceAreas: JSON.stringify(rider.serviceAreas || []),
        isAvailable: rider.status === 'available',
        isVerified: true,
        rating: rider.rating || 0,
        totalRatings: 0,
        createdAt: rider.createdAt ? new Date(rider.createdAt) : new Date(),
        updatedAt: new Date(),
      };
      
      await prisma.rider.create({
        data: riderData,
      });
    } catch (error) {
      console.error(`Error migrating rider ${rider.riderId}:`, error);
    }
  }
  console.log(`Migrated ${riders.length} riders`);
}

// Migrate orders
async function migrateOrders() {
  console.log('Migrating orders...');
  const orders = await readJsonFile(path.join(process.cwd(), 'data', 'orders.json'));
  
  for (const order of orders) {
    try {
      // Find the customer by email
      let customerId = null;
      if (order.userEmail) {
        try {
          const user = await prisma.user.findUnique({
            where: { email: order.userEmail }
          });
          
          if (user) {
            customerId = user.id;
          } else {
            // Create a new user for this customer if not found
            const newUser = await prisma.user.create({
              data: {
                id: uuidv4(),
                email: order.userEmail,
                password: '$2b$10$XbQXR7DcatpqbXue1LFJsuTJemud5RyNoUmc9mPRODA.sICE2Ahwi', // Default password
                name: order.customerName || 'Customer',
                phone: order.customerPhone || null,
                role: 'customer',
                isVerified: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              }
            });
            customerId = newUser.id;
          }
        } catch (error) {
          console.error(`Error finding/creating user for order ${order.orderId}:`, error);
          continue;
        }
      }
      
      if (!customerId) {
        console.error(`No customer ID found for order ${order.orderId}`);
        continue;
      }
      
      await prisma.order.create({
        data: {
          id: order.orderId || uuidv4(),
          orderNumber: order.orderId || `ORD-${Math.floor(Math.random() * 10000)}`,
          customerId: customerId,
          vendorId: order.vendorId || null,
          riderId: order.riderId || null,
          status: order.status || 'initiated',
          orderType: order.packageDetails ? 'parcel' : 'move',
          pickupAddress: order.pickupAddress,
          pickupPincode: order.pickupPincode,
          destinationAddress: order.destinationAddress,
          destinationPincode: order.destinationPincode,
          moveSize: order.packageDetails || null,
          moveDate: order.moveDate ? new Date(order.moveDate) : null,
          specialInstructions: order.specialInstructions || null,
          totalAmount: order.amount || null,
          paidAmount: 0,
          paymentStatus: 'pending',
          createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
          updatedAt: order.updatedAt ? new Date(order.updatedAt) : new Date(),
        },
      });
      
      // Migrate order status history if available
      if (order.statusHistory && Array.isArray(order.statusHistory)) {
        for (const statusEntry of order.statusHistory) {
          await prisma.orderStatusHistory.create({
            data: {
              orderId: order.orderId,
              status: statusEntry.status,
              notes: statusEntry.comment || null,
              createdAt: statusEntry.timestamp ? new Date(statusEntry.timestamp) : new Date(),
              createdBy: null,
            },
          });
        }
      }
    } catch (error) {
      console.error(`Error migrating order ${order.orderId}:`, error);
    }
  }
  console.log(`Migrated ${orders.length} orders`);
}

// Migrate pincodes
async function migratePincodes() {
  console.log('Migrating pincodes...');
  const pincodes = await readJsonFile(path.join(process.cwd(), 'data', 'pincodes.json'));
  
  for (const pincode of pincodes) {
    try {
      await prisma.pincode.create({
        data: {
          id: uuidv4(),
          code: pincode.pincode,
          city: pincode.city,
          state: pincode.state,
          latitude: pincode.lat ? parseFloat(pincode.lat) : null,
          longitude: pincode.lon ? parseFloat(pincode.lon) : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`Error migrating pincode ${pincode.pincode}:`, error);
    }
  }
  console.log(`Migrated ${pincodes.length} pincodes`);
}

// Migrate settings
async function migrateSettings() {
  console.log('Migrating settings...');
  const settingsData = await readJsonFile(path.join(process.cwd(), 'data', 'settings.json'));
  
  // Flatten the settings object
  const flattenSettings = (obj, prefix = '') => {
    let result = [];
    for (const key in obj) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        result = [...result, ...flattenSettings(obj[key], newKey)];
      } else {
        result.push({
          key: newKey,
          value: typeof obj[key] === 'object' ? JSON.stringify(obj[key]) : String(obj[key]),
        });
      }
    }
    return result;
  };
  
  const settings = flattenSettings(settingsData);
  
  for (const setting of settings) {
    try {
      await prisma.setting.create({
        data: {
          id: uuidv4(),
          key: setting.key,
          value: setting.value,
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`Error migrating setting ${setting.key}:`, error);
    }
  }
  console.log(`Migrated ${settings.length} settings`);
}

// Migrate notification templates
async function migrateNotificationTemplates() {
  console.log('Migrating notification templates...');
  const templates = await readJsonFile(path.join(process.cwd(), 'data', 'notification_templates.json'));
  
  for (const template of templates) {
    try {
      await prisma.notificationTemplate.create({
        data: {
          id: template.id || uuidv4(),
          name: template.name,
          type: template.type,
          subject: template.subject || null,
          content: template.content,
          variables: JSON.stringify(template.variables || []),
          createdAt: template.createdAt ? new Date(template.createdAt) : new Date(),
          updatedAt: template.updatedAt ? new Date(template.updatedAt) : new Date(),
        },
      });
    } catch (error) {
      console.error(`Error migrating notification template ${template.name}:`, error);
    }
  }
  console.log(`Migrated ${templates.length} notification templates`);
}

// Main migration function
async function migrateData() {
  try {
    console.log('Starting data migration to Prisma...');
    
    // Migrate in order of dependencies
    await migrateUsers();
    await migrateVendors();
    await migrateRiders();
    await migrateOrders();
    await migratePincodes();
    await migrateSettings();
    await migrateNotificationTemplates();
    
    console.log('Data migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateData(); 