/**
 * Authentication utility functions
 */

import { User } from '../atoms/authState';

/**
 * Parse JWT token to get payload
 * @param token JWT token
 * @returns Decoded token payload or null if invalid
 */
export function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('[Auth] Error parsing JWT:', error);
    return null;
  }
}

/**
 * Check if token is expired
 * @param token JWT token
 * @returns True if token is expired or invalid, false otherwise
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  
  try {
    const payload = parseJwt(token);
    if (!payload || !payload.exp) return true;
    
    // exp is in seconds, Date.now() is in milliseconds
    return Date.now() > payload.exp * 1000;
  } catch (error) {
    console.error('[Auth] Error checking token expiration:', error);
    return true;
  }
}

/**
 * Get time remaining until token expires
 * @param token JWT token
 * @returns Time remaining in seconds, or 0 if token is expired or invalid
 */
export function getTokenTimeRemaining(token: string | null): number {
  if (!token) return 0;
  
  try {
    const payload = parseJwt(token);
    if (!payload || !payload.exp) return 0;
    
    const timeRemaining = payload.exp * 1000 - Date.now();
    return timeRemaining > 0 ? Math.floor(timeRemaining / 1000) : 0;
  } catch (error) {
    console.error('[Auth] Error getting token time remaining:', error);
    return 0;
  }
}

/**
 * Format user display name
 * @param user User object
 * @returns Formatted display name
 */
export function formatUserDisplayName(user: User | null): string {
  if (!user) return 'Guest';
  
  if (user.fullName) return user.fullName;
  if (user.username) return user.username;
  return user.email || 'Unknown User';
}

/**
 * Get user initials for avatar
 * @param user User object
 * @returns User initials (up to 2 characters)
 */
export function getUserInitials(user: User | null): string {
  if (!user) return 'G';
  
  if (user.fullName) {
    const nameParts = user.fullName.split(' ');
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    }
    return user.fullName[0].toUpperCase();
  }
  
  if (user.username) return user.username[0].toUpperCase();
  if (user.email) return user.email[0].toUpperCase();
  
  return 'U';
}

/**
 * Get role display name
 * @param role Role identifier
 * @returns Human-readable role name
 */
export function getRoleDisplayName(role: string | undefined): string {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'moderator':
      return 'Moderator';
    case 'user':
      return 'User';
    default:
      return 'Guest';
  }
}

/**
 * Get Thai role display name
 * @param role Role identifier
 * @returns Human-readable Thai role name
 */
export function getThaiRoleDisplayName(role: string | undefined): string {
  switch (role) {
    case 'admin':
      return 'ผู้ดูแลระบบ';
    case 'moderator':
      return 'ผู้ตรวจสอบ';
    case 'user':
      return 'ผู้ใช้งาน';
    default:
      return 'ผู้เยี่ยมชม';
  }
} 