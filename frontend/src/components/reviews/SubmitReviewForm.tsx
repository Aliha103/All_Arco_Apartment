'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2, Send, Calendar, User, MapPin } from 'lucide-react';
import CategoryRating, { ALL_CATEGORIES, type CategoryKey, calculateOverallRating } from './CategoryRating';
import type { ReviewSubmitData } from '@/types';

/**
 * SubmitReviewForm Component
 *
 * Main review submission form shown after booking code verification.
 * Collects all review details including category ratings, title, and text.
 *
 * Features:
 * - Pre-filled guest name and location (editable)
 * - 6 category ratings (all required)
 * - Review title (5-200 chars)
 * - Review text (50-2000 chars with counter)
 * - Stay date display (read-only)
 * - Client-side validation
 * - Loading state during submission
 * - Error handling
 */

// ============================================================================
// TYPES
// ============================================================================
interface SubmitReviewFormProps {
  /** Review token from URL */
  token: string;
  /** Booking code from verification */
  bookingCode: string;
  /** Pre-filled booking data from verification */
  bookingData: {
    guest_name: string;
    guest_location: string;
    check_in_date: string;
    check_out_date: string;
  };
  /** Callback when review is submitted successfully */
  onSuccess: () => void;
  /** API submit function */
  onSubmit: (data: ReviewSubmitData) => Promise<any>;
}

interface FormData {
  guest_name: string;
  location: string;
  title: string;
  text: string;
  ratings: Record<CategoryKey, number>;
}

interface FormErrors {
  guest_name?: string;
  location?: string;
  title?: string;
  text?: string;
  ratings?: string;
  submit?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================
const MIN_TITLE_LENGTH = 5;
const MAX_TITLE_LENGTH = 200;
const MIN_TEXT_LENGTH = 50;
const MAX_TEXT_LENGTH = 2000;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 150;
const MAX_LOCATION_LENGTH = 150;

// ============================================================================
// COMPONENT
// ============================================================================
export default function SubmitReviewForm({
  token,
  bookingCode,
  bookingData,
  onSuccess,
  onSubmit,
}: SubmitReviewFormProps) {
  const [formData, setFormData] = useState<FormData>({
    guest_name: bookingData.guest_name,
    location: bookingData.guest_location || '',
    title: '',
    text: '',
    ratings: {
      cleanliness: 0,
      communication: 0,
      checkin: 0,
      accuracy: 0,
      location: 0,
      value: 0,
    },
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  /**
   * Format stay date for display
   */
  const formattedStayDate = new Date(bookingData.check_in_date).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  /**
   * Validate a single field
   */
  const validateField = (name: keyof FormData, value: any): string | undefined => {
    switch (name) {
      case 'guest_name':
        if (!value || value.trim().length < MIN_NAME_LENGTH) {
          return `Name must be at least ${MIN_NAME_LENGTH} characters`;
        }
        if (value.length > MAX_NAME_LENGTH) {
          return `Name must be less than ${MAX_NAME_LENGTH} characters`;
        }
        break;

      case 'location':
        if (value && value.length > MAX_LOCATION_LENGTH) {
          return `Location must be less than ${MAX_LOCATION_LENGTH} characters`;
        }
        break;

      case 'title':
        if (!value || value.trim().length < MIN_TITLE_LENGTH) {
          return `Title must be at least ${MIN_TITLE_LENGTH} characters`;
        }
        if (value.length > MAX_TITLE_LENGTH) {
          return `Title must be less than ${MAX_TITLE_LENGTH} characters`;
        }
        break;

      case 'text':
        if (!value || value.trim().length < MIN_TEXT_LENGTH) {
          return `Review must be at least ${MIN_TEXT_LENGTH} characters`;
        }
        if (value.length > MAX_TEXT_LENGTH) {
          return `Review must be less than ${MAX_TEXT_LENGTH} characters`;
        }
        break;

      case 'ratings':
        const allRated = ALL_CATEGORIES.every(cat => value[cat] > 0);
        if (!allRated) {
          return 'Please rate all categories';
        }
        break;
    }
    return undefined;
  };

  /**
   * Validate entire form
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    newErrors.guest_name = validateField('guest_name', formData.guest_name);
    newErrors.location = validateField('location', formData.location);
    newErrors.title = validateField('title', formData.title);
    newErrors.text = validateField('text', formData.text);
    newErrors.ratings = validateField('ratings', formData.ratings);

    setErrors(newErrors);

    return !Object.values(newErrors).some(error => error !== undefined);
  };

  /**
   * Handle field change
   */
  const handleFieldChange = (name: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  /**
   * Handle field blur
   */
  const handleFieldBlur = (name: keyof FormData) => {
    setTouched(prev => ({ ...prev, [name]: true }));

    // Validate field on blur
    const error = validateField(name, formData[name]);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  /**
   * Handle category rating change
   */
  const handleRatingChange = (category: CategoryKey, value: number) => {
    const newRatings = { ...formData.ratings, [category]: value };
    handleFieldChange('ratings', newRatings);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      guest_name: true,
      location: true,
      title: true,
      text: true,
      ratings: true,
    });

    // Validate
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Prepare submission data
      const submitData: ReviewSubmitData = {
        token,
        booking_code: bookingCode,
        guest_name: formData.guest_name.trim(),
        location: formData.location.trim(),
        title: formData.title.trim(),
        text: formData.text.trim(),
        rating_cleanliness: formData.ratings.cleanliness,
        rating_communication: formData.ratings.communication,
        rating_checkin: formData.ratings.checkin,
        rating_accuracy: formData.ratings.accuracy,
        rating_location: formData.ratings.location,
        rating_value: formData.ratings.value,
      };

      await onSubmit(submitData);

      // Success - parent will show success screen
      onSuccess();
    } catch (err: any) {
      // Handle submission errors
      if (err.response?.data?.error) {
        setErrors({ submit: err.response.data.error });
      } else if (err.response?.status === 400) {
        setErrors({ submit: 'Invalid submission. Please check all fields.' });
      } else if (err.response?.status === 409) {
        setErrors({ submit: 'You have already submitted a review for this booking.' });
      } else {
        setErrors({ submit: 'Something went wrong. Please try again later.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const textLength = formData.text.length;
  const textRemaining = MAX_TEXT_LENGTH - textLength;
  const textProgress = (textLength / MAX_TEXT_LENGTH) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-3xl mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">
          Share Your Experience
        </h2>
        <p className="text-sm text-gray-600">
          Your feedback helps us improve and assists future guests
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Guest Information Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Guest Information</h3>

          {/* Guest Name */}
          <div>
            <label htmlFor="guest_name" className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline-block mr-1" />
              Your Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="guest_name"
              value={formData.guest_name}
              onChange={(e) => handleFieldChange('guest_name', e.target.value)}
              onBlur={() => handleFieldBlur('guest_name')}
              placeholder="Enter your name"
              className={`
                w-full px-4 py-3 rounded-lg border
                ${touched.guest_name && errors.guest_name
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-[#C4A572] focus:border-[#C4A572]'
                }
                focus:outline-none focus:ring-2 transition-colors
                disabled:bg-gray-100 disabled:cursor-not-allowed
              `}
              disabled={isSubmitting}
              maxLength={MAX_NAME_LENGTH}
            />
            {touched.guest_name && errors.guest_name && (
              <p className="mt-1 text-xs text-red-600">{errors.guest_name}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline-block mr-1" />
              Your Location <span className="text-gray-500 text-xs">(optional)</span>
            </label>
            <input
              type="text"
              id="location"
              value={formData.location}
              onChange={(e) => handleFieldChange('location', e.target.value)}
              onBlur={() => handleFieldBlur('location')}
              placeholder="e.g., New York, USA"
              className={`
                w-full px-4 py-3 rounded-lg border
                ${touched.location && errors.location
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-[#C4A572] focus:border-[#C4A572]'
                }
                focus:outline-none focus:ring-2 transition-colors
                disabled:bg-gray-100 disabled:cursor-not-allowed
              `}
              disabled={isSubmitting}
              maxLength={MAX_LOCATION_LENGTH}
            />
            {touched.location && errors.location && (
              <p className="mt-1 text-xs text-red-600">{errors.location}</p>
            )}
          </div>

          {/* Stay Date (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline-block mr-1" />
              Stay Date
            </label>
            <div className="px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-600">
              {formattedStayDate}
            </div>
          </div>
        </div>

        {/* Category Ratings Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Rate Your Experience <span className="text-red-500">*</span>
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Please rate each aspect of your stay
          </p>

          <div className="space-y-3">
            {ALL_CATEGORIES.map((category) => (
              <CategoryRating
                key={category}
                category={category}
                value={formData.ratings[category]}
                onChange={(value) => handleRatingChange(category, value)}
                readOnly={isSubmitting}
                required
                error={touched.ratings && !formData.ratings[category]}
              />
            ))}
          </div>

          {touched.ratings && errors.ratings && (
            <p className="mt-3 text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {errors.ratings}
            </p>
          )}
        </div>

        {/* Review Content Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Review</h3>

          {/* Review Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Review Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              onBlur={() => handleFieldBlur('title')}
              placeholder="Sum up your experience in a few words"
              className={`
                w-full px-4 py-3 rounded-lg border
                ${touched.title && errors.title
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-[#C4A572] focus:border-[#C4A572]'
                }
                focus:outline-none focus:ring-2 transition-colors
                disabled:bg-gray-100 disabled:cursor-not-allowed
              `}
              disabled={isSubmitting}
              maxLength={MAX_TITLE_LENGTH}
            />
            <div className="flex items-center justify-between mt-1">
              {touched.title && errors.title ? (
                <p className="text-xs text-red-600">{errors.title}</p>
              ) : (
                <p className="text-xs text-gray-500">
                  {MIN_TITLE_LENGTH}-{MAX_TITLE_LENGTH} characters
                </p>
              )}
              <p className="text-xs text-gray-400">{formData.title.length}/{MAX_TITLE_LENGTH}</p>
            </div>
          </div>

          {/* Review Text */}
          <div>
            <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
              Detailed Review <span className="text-red-500">*</span>
            </label>
            <textarea
              id="text"
              value={formData.text}
              onChange={(e) => handleFieldChange('text', e.target.value)}
              onBlur={() => handleFieldBlur('text')}
              placeholder="Share your experience with future guests. What did you love most about your stay?"
              rows={6}
              className={`
                w-full px-4 py-3 rounded-lg border
                ${touched.text && errors.text
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-[#C4A572] focus:border-[#C4A572]'
                }
                focus:outline-none focus:ring-2 transition-colors
                disabled:bg-gray-100 disabled:cursor-not-allowed
                resize-none
              `}
              disabled={isSubmitting}
              maxLength={MAX_TEXT_LENGTH}
            />

            {/* Character Counter with Progress Bar */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                {touched.text && errors.text ? (
                  <p className="text-xs text-red-600">{errors.text}</p>
                ) : (
                  <p className={`text-xs ${textLength >= MIN_TEXT_LENGTH ? 'text-green-600' : 'text-gray-500'}`}>
                    {textLength < MIN_TEXT_LENGTH
                      ? `${MIN_TEXT_LENGTH - textLength} characters needed`
                      : `${textRemaining} characters remaining`
                    }
                  </p>
                )}
                <p className="text-xs text-gray-400">{textLength}/{MAX_TEXT_LENGTH}</p>
              </div>
              {/* Progress bar */}
              <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    textLength < MIN_TEXT_LENGTH
                      ? 'bg-gray-400'
                      : textLength > MAX_TEXT_LENGTH * 0.9
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(textProgress, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Submission Failed</p>
              <p className="text-xs text-red-700 mt-0.5">{errors.submit}</p>
            </div>
          </motion.div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="
            w-full px-6 py-4 bg-gray-900 text-white font-medium rounded-lg text-lg
            hover:bg-gray-800 active:scale-[0.98]
            focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
            transition-all duration-200
            flex items-center justify-center gap-2
          "
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Submitting Review...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Submit Review</span>
            </>
          )}
        </button>

        {/* Privacy Notice */}
        <p className="text-xs text-gray-500 text-center">
          By submitting this review, you confirm that it reflects your genuine experience at All&apos;Arco Apartment.
        </p>
      </form>
    </motion.div>
  );
}
