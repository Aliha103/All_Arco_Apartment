'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Home, Star } from 'lucide-react';
import Link from 'next/link';

/**
 * ReviewSubmitSuccess Component
 *
 * Success confirmation screen shown after a guest successfully submits their review.
 * Displays a thank you message and explains the approval process.
 *
 * Features:
 * - Success animation with checkmark
 * - Clear thank you message
 * - Explanation of approval process
 * - Link to return to homepage
 * - No option to edit (prevents duplicate submissions)
 */

// ============================================================================
// TYPES
// ============================================================================
interface ReviewSubmitSuccessProps {
  /** Guest name for personalization */
  guestName?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================
export default function ReviewSubmitSuccess({ guestName }: ReviewSubmitSuccessProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-lg mx-auto"
    >
      {/* Success Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 sm:p-10 text-center">
        {/* Animated Checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 15,
            delay: 0.2,
          }}
          className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
              delay: 0.4,
            }}
          >
            <CheckCircle className="w-12 h-12 text-green-600" />
          </motion.div>
        </motion.div>

        {/* Thank You Message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-3">
            {guestName ? `Thank you, ${guestName}!` : 'Thank you for your review!'}
          </h2>
          <p className="text-base text-gray-600 mb-6 leading-relaxed">
            Your review has been submitted successfully and is pending approval.
            It will appear on our website once approved by our team.
          </p>
        </motion.div>

        {/* Star decoration */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="flex items-center justify-center gap-1 mb-6"
        >
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.9 + i * 0.1,
                type: 'spring',
                stiffness: 200,
                damping: 15,
              }}
            >
              <Star className="w-5 h-5 fill-[#C4A572] text-[#C4A572]" />
            </motion.div>
          ))}
        </motion.div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.4 }}
          className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6"
        >
          <p className="text-sm text-blue-900 leading-relaxed">
            We carefully review all submissions to ensure authenticity.
            You&apos;ll typically see your review published within 1-2 business days.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.4 }}
          className="space-y-3"
        >
          {/* Return to Homepage */}
          <Link
            href="/"
            className="
              inline-flex items-center justify-center gap-2 w-full
              px-6 py-3 bg-gray-900 text-white font-medium rounded-lg
              hover:bg-gray-800 active:scale-[0.98]
              focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2
              transition-all duration-200
            "
          >
            <Home className="w-5 h-5" />
            <span>Return to Homepage</span>
          </Link>

          {/* Secondary text */}
          <p className="text-xs text-gray-500">
            Feel free to explore more about All&apos;Arco Apartment
          </p>
        </motion.div>
      </div>

      {/* Additional Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.4 }}
        className="mt-6 text-center"
      >
        <p className="text-sm text-gray-600">
          Your feedback helps us improve and assists future guests in making their decision.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Questions or concerns?{' '}
          <a
            href="mailto:support@allarcoapartment.com"
            className="text-[#C4A572] hover:text-[#A38652] font-medium underline"
          >
            Contact us
          </a>
        </p>
      </motion.div>
    </motion.div>
  );
}
