/**
 * Common utility functions for formatting and display
 */

import { BsStarFill, BsStarHalf, BsStar } from 'react-icons/bs'

/**
 * Format a date string to a localized date string
 * @param {string} dateString - ISO date string
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string or 'Not specified' if date is invalid
 */
export function formatDate(dateString, options = {}) {
  if (!dateString) return 'Not specified';
  
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date string to a localized date and time string
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date and time string or 'Not specified' if date is invalid
 */
export function formatDateTime(dateString) {
  if (!dateString) return 'Not specified';
  
  try {
    return new Date(dateString).toLocaleString('en-IN');
  } catch (error) {
    console.error('Error formatting date and time:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date string to a localized time string
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted time string or 'Unknown time' if date is invalid
 */
export function formatTime(dateString) {
  if (!dateString) return 'Unknown time';
  
  try {
    return new Date(dateString).toLocaleTimeString('en-IN');
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Unknown time';
  }
}

/**
 * Format a number as currency (INR)
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string or 'N/A' if amount is invalid
 */
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'N/A';
  }
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Render star rating as an array of star components
 * @param {number} rating - Rating value (0-5)
 * @returns {Array} Array of star components
 */
export function getStarRating(rating) {
  const stars = []
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)
  
  // Add full stars
  for (let i = 0; i < fullStars; i++) {
    stars.push(<BsStarFill key={`full-${i}`} className="text-warning" />)
  }
  
  // Add half star if needed
  if (hasHalfStar) {
    stars.push(<BsStarHalf key="half" className="text-warning" />)
  }
  
  // Add empty stars
  for (let i = 0; i < emptyStars; i++) {
    stars.push(<BsStar key={`empty-${i}`} className="text-warning" />)
  }
  
  return (
    <span className="d-inline-flex align-items-center">
      {stars}
    </span>
  )
}

/**
 * Get badge variant based on order status
 * @param {string} status - Order status
 * @returns {string} Bootstrap badge variant
 */
export function getStatusBadgeVariant(status) {
  switch (status) {
    case 'Initiated':
      return 'primary';
    case 'Requests Sent':
      return 'info';
    case 'Accepted':
    case 'Quotes Received':
      return 'warning';
    case 'Paid':
      return 'success';
    case 'Completed':
      return 'dark';
    default:
      return 'secondary';
  }
} 