import { userStorage } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

class UserService {
  /**
   * Get a user by email
   * @param {string} email - The user's email
   * @returns {Object|null} - The user object or null if not found
   */
  async getUserByEmail(email) {
    return await userStorage.getByEmail(email);
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
      id: userData.id || uuidv4(),
      name,
      email,
      password: hashedPassword,
      role: userData.role || 'user',
      phone: userData.phone,
      whatsapp: userData.whatsapp,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create user in database
    const createdUser = await userStorage.create(newUser);

    if (!createdUser) {
      throw new Error('Failed to create user');
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = createdUser;
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
    
    // Get user by email
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Prepare update data
    const updateData = {
      ...(name && { name }),
      ...(phone && { phone }),
      updatedAt: new Date()
    };
    
    // Update user in database
    const updatedUser = await userStorage.update(user.id, updateData);
    
    if (!updatedUser) {
      throw new Error('Failed to update user profile');
    }

    return updatedUser;
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
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }
    
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new Error('Invalid current password');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const updatedUser = await userStorage.update(user.id, {
      password: hashedPassword,
      updatedAt: new Date()
    });

    return !!updatedUser;
  }
}

export const userService = new UserService(); 