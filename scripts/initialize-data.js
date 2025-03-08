const fs = require('fs/promises');
const path = require('path');

const DATA_PATH = process.env.DATA_PATH || path.join(process.cwd(), 'data');

// List of required data files with their default values
const requiredFiles = {
  'orders.json': [],
  'vendors.json': [],
  'users.json': [],
  'inventories.json': [],
  'analytics_events.json': []
};

async function initializeDataDirectory() {
  try {
    // Check if data directory exists
    try {
      await fs.access(DATA_PATH);
      console.log(`Data directory exists at ${DATA_PATH}`);
    } catch (error) {
      // Create data directory if it doesn't exist
      console.log(`Creating data directory at ${DATA_PATH}`);
      await fs.mkdir(DATA_PATH, { recursive: true });
    }

    // Initialize each required file
    for (const [filename, defaultValue] of Object.entries(requiredFiles)) {
      const filePath = path.join(DATA_PATH, filename);
      
      try {
        await fs.access(filePath);
        console.log(`File ${filename} already exists`);
      } catch (error) {
        // Create file with default value if it doesn't exist
        console.log(`Creating ${filename} with default value`);
        await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2));
      }
    }

    console.log('Data initialization completed successfully');
  } catch (error) {
    console.error('Error initializing data directory:', error);
  }
}

// Run the initialization
initializeDataDirectory(); 