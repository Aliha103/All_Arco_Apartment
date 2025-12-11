'use client';

import { Sparkles, MessageCircle, Key, CheckCircle, MapPin, Heart } from 'lucide-react';
import StarRating from './StarRating';

/**
 * CategoryRating Component
 *
 * Displays a single category rating row with icon, label, question, and star rating.
 * Used in the review submission form for collecting detailed ratings across 6 categories.
 *
 * Categories (Airbnb standard):
 * 1. Cleanliness - How clean was the apartment?
 * 2. Communication - How responsive was the host?
 * 3. Check-in - How smooth was the check-in process?
 * 4. Accuracy - Did the listing match the apartment?
 * 5. Location - How convenient was the location?
 * 6. Value - Was it worth the price?
 */

// ============================================================================
// TYPES
// ============================================================================
export type CategoryKey =
  | 'cleanliness'
  | 'communication'
  | 'checkin'
  | 'accuracy'
  | 'location'
  | 'value';

interface CategoryRatingProps {
  /** Category identifier */
  category: CategoryKey;
  /** Current rating value (0-10 scale) */
  value: number;
  /** Callback when rating changes (receives 0-10 scale value) */
  onChange: (value: number) => void;
  /** Read-only mode */
  readOnly?: boolean;
  /** Show as required field */
  required?: boolean;
  /** Show error state */
  error?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Category configurations with icons, labels, and questions */
const CATEGORY_CONFIG: Record<CategoryKey, {
  icon: React.ElementType;
  label: string;
  question: string;
}> = {
  cleanliness: {
    icon: Sparkles,
    label: 'Cleanliness',
    question: 'How clean was the apartment?',
  },
  communication: {
    icon: MessageCircle,
    label: 'Communication',
    question: 'How responsive was the host?',
  },
  checkin: {
    icon: Key,
    label: 'Check-in',
    question: 'How smooth was the check-in process?',
  },
  accuracy: {
    icon: CheckCircle,
    label: 'Accuracy',
    question: 'Did the listing match the apartment?',
  },
  location: {
    icon: MapPin,
    label: 'Location',
    question: 'How convenient was the location?',
  },
  value: {
    icon: Heart,
    label: 'Value',
    question: 'Was it worth the price?',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================
export default function CategoryRating({
  category,
  value,
  onChange,
  readOnly = false,
  required = false,
  error = false,
}: CategoryRatingProps) {
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;

  // Convert 0-10 decimal to 1-5 stars for display
  const starValue = value > 0 ? Math.ceil(value / 2) : 0;

  return (
    <div
      className={`
        flex flex-col sm:flex-row sm:items-center sm:justify-between
        gap-3 sm:gap-4
        p-4 rounded-lg border
        ${error
          ? 'border-red-300 bg-red-50'
          : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300'
        }
        transition-all duration-200
      `}
    >
      {/* Left side: Icon + Label + Question */}
      <div className="flex items-start gap-3 flex-1">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-9 h-9 rounded-lg bg-[#C4A572]/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-[#C4A572]" />
          </div>
        </div>

        {/* Label and Question */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900">
              {config.label}
            </h4>
            {required && !readOnly && (
              <span className="text-red-500 text-xs font-medium">*</span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
            {config.question}
          </p>
        </div>
      </div>

      {/* Right side: Star Rating */}
      <div className="flex items-center sm:justify-end pl-12 sm:pl-0">
        <StarRating
          value={starValue}
          onChange={onChange}
          readOnly={readOnly}
          size="md"
          showValue={false}
        />
      </div>

      {/* Error message */}
      {error && !readOnly && (
        <p className="text-xs text-red-600 mt-1 sm:mt-0 sm:col-span-2">
          Please rate this category
        </p>
      )}
    </div>
  );
}

/**
 * Export helper function to get all category keys in order
 */
export const ALL_CATEGORIES: CategoryKey[] = [
  'cleanliness',
  'communication',
  'checkin',
  'accuracy',
  'location',
  'value',
];

/**
 * Helper function to validate all categories are rated
 */
export const validateCategoryRatings = (
  ratings: Record<CategoryKey, number>
): boolean => {
  return ALL_CATEGORIES.every(category => ratings[category] > 0);
};

/**
 * Helper function to calculate overall rating from categories
 */
export const calculateOverallRating = (
  ratings: Record<CategoryKey, number>
): number => {
  const sum = ALL_CATEGORIES.reduce((acc, category) => acc + ratings[category], 0);
  return parseFloat((sum / ALL_CATEGORIES.length).toFixed(1));
};
