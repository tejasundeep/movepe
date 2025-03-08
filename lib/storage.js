import fs from 'fs/promises'
import path from 'path'

const DATA_PATH = process.env.DATA_PATH || path.join(process.cwd(), 'data')

class Storage {
  constructor() {
    // Initialize cache for performance
    this.cache = new Map()
    this.locks = new Map()
    
    // Ensure data directory exists on initialization
    this.ensureDataDirectory()
  }

  async ensureDataDirectory() {
    try {
      await fs.mkdir(DATA_PATH, { recursive: true })
    } catch (error) {
      console.error('Error creating data directory:', error)
    }
  }

  async readData(filename) {
    try {
      // Check cache first for performance
      if (this.cache.has(filename)) {
        return this.cache.get(filename)
      }

      // Ensure data directory exists
      await this.ensureDataDirectory()

      // Read from file
      const filePath = path.join(DATA_PATH, filename)
      
      try {
        const data = await fs.readFile(filePath, 'utf8')
        const parsedData = JSON.parse(data)
        
        // Update cache
        this.cache.set(filename, parsedData)
        return parsedData
      } catch (error) {
        // Check if file doesn't exist
        if (error.code === 'ENOENT') {
          console.warn(`File ${filename} not found, returning null`)
          return null
        }
        
        // Re-throw other errors
        throw error
      }
    } catch (error) {
      console.error(`Error reading ${filename}:`, error)
      return null
    }
  }

  async writeData(filename, data) {
    // Ensure data directory exists
    await this.ensureDataDirectory()
    
    // Get or create a lock for this file
    let lock = this.locks.get(filename)
    if (!lock) {
      lock = Promise.resolve()
      this.locks.set(filename, lock)
    }

    // Create a new lock promise
    const newLock = lock.then(async () => {
      try {
        const filePath = path.join(DATA_PATH, filename)
        const jsonData = JSON.stringify(data, null, 2)

        // Write to file
        await fs.writeFile(filePath, jsonData)
        
        // Update cache
        this.cache.set(filename, data)
        return true
      } catch (error) {
        console.error(`Error writing ${filename}:`, error)
        return false
      }
    })

    // Update the lock
    this.locks.set(filename, newLock)

    // Wait for the write to complete
    return newLock
  }

  async updateData(filename, updateFn) {
    try {
      // Read current data
      const currentData = await this.readData(filename)
      
      // If file doesn't exist or is empty, start with an empty array or object
      const dataToUpdate = currentData || (filename.endsWith('.json') ? [] : {})

      // Apply update
      const updatedData = updateFn(dataToUpdate)

      // Write back to file
      return await this.writeData(filename, updatedData)
    } catch (error) {
      console.error(`Error updating ${filename}:`, error)
      return false
    }
  }

  clearCache(filename) {
    if (filename) {
      this.cache.delete(filename)
    } else {
      this.cache.clear()
    }
  }
}

export const storage = new Storage() 