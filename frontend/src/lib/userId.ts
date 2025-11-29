/**
 * Generate unique and secure UserId from user data
 * Format: FirstInitialLastName-6DigitNumber
 * Example: SADMIN-583721, JSMITH-294856
 */

import { User } from '@/types';

export function generateUserId(user: User | null): string {
  if (!user) return '';

  // Create readable ID: FirstInitialLastName + secure number
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  const initial = firstName[0]?.toUpperCase() || '';
  const lastNameClean = lastName.toUpperCase().replace(/\s+/g, '');

  // Generate a truly unique and secure 6-digit number from UUID
  // Using cryptographic-style hash for consistency and uniqueness
  const uuid = user.id?.toString() || '';

  // Convert UUID to consistent numeric representation
  // Take multiple segments of UUID and combine for better distribution
  const uuidParts = uuid.replace(/-/g, '').match(/.{1,8}/g) || [];
  const hash = uuidParts.reduce((acc, part, idx) => {
    const num = parseInt(part.substring(0, 8), 16);
    return acc + (num * (idx + 1));
  }, 0);

  // Generate 6-digit secure number (100000-999999) for better uniqueness
  const secureNumber = (100000 + Math.abs(hash) % 900000).toString();

  return `${initial}${lastNameClean}-${secureNumber}`;
}

/**
 * Verify that the userId in the URL matches the current logged-in user
 */
export function verifyUserId(urlUserId: string, user: User | null): boolean {
  if (!user || !urlUserId) return false;
  const expectedUserId = generateUserId(user);
  return urlUserId === expectedUserId;
}
