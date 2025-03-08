import { storage } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

class UserService {
  /**
   * Get a user by email
   * @param {string} email - The user's email
   * @returns {Object|null} - The user object or null if not found
   */
  async getUserByEmail(email) {
    const users = await storage.readData('users.json');
    return users?.find(u => u && u.email === email) || null;
  }

  /**
   * Create a new user
   * @param {Object} userData - The user data
   * @returns {Object} - The created user
   */
  async createUser(userData) {
    const { name, email, password } = userData;

    if (!name || !email || !password) {
      throw new Error('Missing required fields');
    }

    // Check if user already exists
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    // Add user to users.json
    const updated = await storage.updateData('users.json', (users) => {
      users.push(newUser);
      return users;
    });

    if (!updated) {
      throw new Error('Failed to create user');
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  /**
   * Verify user credentials
   * @param {string} email - The user's email
   * @param {string} password - The user's password
   * @returns {Object|null} - The user object without password or null if invalid credentials
   */
  async verifyCredentials(email, password) {
    const user = await this.getUserByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update user profile
   * @param {string} email - The user's email
   * @param {Object} updates - The updates to apply
   * @returns {Object} - The updated user
   */
  async updateUserProfile(email, updates) {
    const { name, phone } = updates;

    const updated = await storage.updateData('users.json', (users) => {
      const userIndex = users.findIndex(u => u && u.email === email);
      if (userIndex === -1) {
        throw new Error('User not found');
      }

      if (name) {
        users[userIndex].name = name;
      }

      if (phone) {
        users[userIndex].phone = phone;
      }

      users[userIndex].updatedAt = new Date().toISOString();
      return users;
    });

    if (!updated) {
      throw new Error('Failed to update user profile');
    }

    return this.getUserByEmail(email);
  }

  /**
   * Change user password
   * @param {string} email - The user's email
   * @param {string} currentPassword - The current password
   * @param {string} newPassword - The new password
   * @returns {boolean} - Whether the password was changed successfully
   */
  async changePassword(email, currentPassword, newPassword) {
    // Verify current password
    const isValid = await this.verifyCredentials(email, currentPassword);
    if (!isValid) {
      throw new Error('Invalid current password');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const updated = await storage.updateData('users.json', (users) => {
      const userIndex = users.findIndex(u => u && u.email === email);
      if (userIndex === -1) {
        throw new Error('User not found');
      }

      users[userIndex].password = hashedPassword;
      users[userIndex].updatedAt = new Date().toISOString();
      return users;
    });

    return updated;
  }
}

export const userService = new UserService(); 