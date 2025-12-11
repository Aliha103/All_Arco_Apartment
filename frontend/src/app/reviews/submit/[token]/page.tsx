'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import BookingCodeVerification from '@/components/reviews/BookingCodeVerification';
import SubmitReviewForm from '@/components/reviews/SubmitReviewForm';
import ReviewSubmitSuccess from '@/components/reviews/ReviewSubmitSuccess';
import { api } from '@/lib/api';
import type { ReviewSubmitData } from '@/types';

/**
 * Review Submission Page
 *
 * Public page for guests to submit reviews after their stay.
 * Accessed via unique tokenized link from review request email.
 *
 * Flow:
 * 1. Verify booking code (security check)
 * 2. Show review form with pre-filled data
 * 3. Submit review (creates with status='pending')
 * 4. Show success confirmation
 *
 * URL: /reviews/submit/[token]
 * Access: Public (no authentication required)
 */

// ============================================================================
// TYPES
// ============================================================================
type Step = 'verify' | 'form' | 'success';

interface BookingData {
  guest_name: string;
  guest_location: string;
  check_in_date: string;
  check_out_date: string;
  booking_code: string;
}

// ============================================================================
// COMPONENT
// ============================================================================
export default function ReviewSubmitPage() {
  const params = useParams();
  const token = params.token as string;

  const [step, setStep] = useState<Step>('verify');
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [bookingCode, setBookingCode] = useState('');

  /**
   * Handle booking verification success
   */
  const handleVerified = (data: BookingData) => {
    setBookingData(data);
    setBookingCode(data.booking_code);
    setStep('form');
  };

  /**
   * Handle review submission success
   */
  const handleSubmitSuccess = () => {
    setStep('success');
  };

  /**
   * API call to verify token and booking code
   */
  const handleVerify = async (token: string, bookingCode: string) => {
    return await api.reviews.verifyToken(token, bookingCode);
  };

  /**
   * API call to submit review
   */
  const handleSubmit = async (data: ReviewSubmitData) => {
    return await api.reviews.submit(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl sm:text-4xl font-light text-gray-900 mb-2">
            All&apos;Arco Apartment
          </h1>
          <p className="text-sm text-gray-600">Share your experience with us</p>
        </motion.div>
      </div>

      {/* Step Indicator */}
      {step !== 'success' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="max-w-md mx-auto mb-8"
        >
          <div className="flex items-center justify-center gap-2">
            {/* Step 1 */}
            <div className="flex items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                  ${step === 'verify'
                    ? 'bg-[#C4A572] text-white'
                    : 'bg-green-500 text-white'
                  }
                  transition-colors duration-300
                `}
              >
                {step === 'verify' ? '1' : '✓'}
              </div>
              <span className="ml-2 text-sm text-gray-600 hidden sm:inline">Verify</span>
            </div>

            {/* Connector */}
            <div className="w-12 sm:w-20 h-0.5 bg-gray-300">
              <div
                className={`h-full bg-[#C4A572] transition-all duration-500 ${
                  step === 'form' ? 'w-full' : 'w-0'
                }`}
              />
            </div>

            {/* Step 2 */}
            <div className="flex items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                  ${step === 'form'
                    ? 'bg-[#C4A572] text-white'
                    : 'bg-gray-300 text-gray-600'
                  }
                  transition-colors duration-300
                `}
              >
                2
              </div>
              <span className="ml-2 text-sm text-gray-600 hidden sm:inline">Review</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {step === 'verify' && (
          <motion.div
            key="verify"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <BookingCodeVerification
              token={token}
              onVerified={handleVerified}
              onVerify={handleVerify}
            />
          </motion.div>
        )}

        {step === 'form' && bookingData && (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <SubmitReviewForm
              token={token}
              bookingCode={bookingCode}
              bookingData={bookingData}
              onSuccess={handleSubmitSuccess}
              onSubmit={handleSubmit}
            />
          </motion.div>
        )}

        {step === 'success' && bookingData && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <ReviewSubmitSuccess guestName={bookingData.guest_name} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-12 text-center text-xs text-gray-500"
      >
        <p>
          &copy; {new Date().getFullYear()} All&apos;Arco Apartment. All rights reserved.
        </p>
        <p className="mt-1">
          <a href="/" className="text-[#C4A572] hover:text-[#A38652] underline">
            Visit our website
          </a>
        </p>
      </motion.div>
    </div>
  );
}
