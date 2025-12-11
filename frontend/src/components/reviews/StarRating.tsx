'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * StarRating Component
 *
 * Interactive star rating component for review submissions and displays.
 *
 * Features:
 * - 5-star UI interface (1-5 stars)
 * - Converts to 0-10 backend scale (2.0, 4.0, 6.0, 8.0, 10.0)
 * - Interactive mode with hover effects
 * - Read-only mode for display
 * - Accessible keyboard navigation
 */

// ============================================================================
// TYPES
// ============================================================================
interface StarRatingProps {
  /** Current rating value (1-5 for interactive, 0-10 for display) */
  value: number;
  /** Callback when rating changes (receives 0-10 scale value) */
  onChange?: (rating: number) => void;
  /** Read-only mode (no interaction) */
  readOnly?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show numeric value */
  showValue?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maps 5-star UI to 0-10 backend scale */
const STAR_TO_DECIMAL_MAP = {
  1: 2.0,
  2: 4.0,
  3: 6.0,
  4: 8.0,
  5: 10.0,
} as const;

/** Converts 0-10 decimal to 5-star rating */
const decimalToStars = (decimal: number): number => {
  if (decimal >= 9) return 5;
  if (decimal >= 7) return 4;
  if (decimal >= 5) return 3;
  if (decimal >= 3) return 2;
  if (decimal >= 1) return 1;
  return 0;
};

/** Size configurations */
const SIZE_CLASSES = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
} as const;

// ============================================================================
// COMPONENT
// ============================================================================
export default function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 'md',
  showValue = false,
  className = '',
}: StarRatingProps) {
  // Convert incoming value to stars (1-5) for display
  const currentStars = readOnly ? decimalToStars(value) : value;

  // Hover state for interactive mode
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // Determine which rating to display (hover takes precedence)
  const displayRating = hoverRating !== null ? hoverRating : currentStars;

  /**
   * Handle star click
   */
  const handleClick = (starIndex: number) => {
    if (readOnly || !onChange) return;

    const stars = starIndex + 1; // Convert 0-based index to 1-based rating
    const decimalValue = STAR_TO_DECIMAL_MAP[stars as keyof typeof STAR_TO_DECIMAL_MAP];
    onChange(decimalValue);
  };

  /**
   * Handle mouse enter on star
   */
  const handleMouseEnter = (starIndex: number) => {
    if (readOnly || !onChange) return;
    setHoverRating(starIndex + 1);
  };

  /**
   * Handle mouse leave from star container
   */
  const handleMouseLeave = () => {
    if (readOnly) return;
    setHoverRating(null);
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent, starIndex: number) => {
    if (readOnly || !onChange) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(starIndex);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Star rating display */}
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={handleMouseLeave}
        role={readOnly ? 'img' : 'radiogroup'}
        aria-label={`Rating: ${currentStars} out of 5 stars`}
      >
        {[...Array(5)].map((_, index) => {
          const isFilled = index < displayRating;
          const isHovering = hoverRating !== null && index < hoverRating;

          return (
            <motion.button
              key={index}
              type="button"
              onClick={() => handleClick(index)}
              onMouseEnter={() => handleMouseEnter(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              disabled={readOnly}
              whileHover={!readOnly ? { scale: 1.1 } : undefined}
              whileTap={!readOnly ? { scale: 0.95 } : undefined}
              className={`
                ${SIZE_CLASSES[size]}
                ${!readOnly ? 'cursor-pointer' : 'cursor-default'}
                ${!readOnly ? 'hover:scale-110' : ''}
                transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-[#C4A572] focus:ring-offset-2 rounded
                disabled:cursor-default
              `}
              aria-label={`Rate ${index + 1} stars out of 5`}
              aria-pressed={!readOnly && index < currentStars}
              tabIndex={readOnly ? -1 : 0}
            >
              <Star
                className={`
                  w-full h-full transition-all duration-150
                  ${isFilled
                    ? 'fill-[#C4A572] text-[#C4A572]'
                    : 'fill-gray-200 text-gray-200'
                  }
                  ${isHovering && !readOnly
                    ? 'fill-[#C4A572]/70 text-[#C4A572]/70'
                    : ''
                  }
                `}
              />
            </motion.button>
          );
        })}
      </div>

      {/* Numeric value display */}
      {showValue && (
        <span className="text-sm font-semibold text-gray-900 ml-1">
          {readOnly ? value.toFixed(1) : `${currentStars}/5`}
        </span>
      )}
    </div>
  );
}
