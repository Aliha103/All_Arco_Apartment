'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

/**
 * BookingCodeVerification Component
 *
 * First step in the review submission flow - verifies the guest's booking code
 * against the review token to ensure only legitimate guests can submit reviews.
 *
 * Features:
 * - Booking code input field
 * - Verification button
 * - Loading state during API call
 * - Error handling with clear messages
 * - Success confirmation before proceeding
 */

// ============================================================================
// TYPES
// ============================================================================
interface BookingCodeVerificationProps {
  /** Review token from URL */
  token: string;
  /** Callback when verification succeeds */
  onVerified: (bookingData: {
    guest_name: string;
    guest_location: string;
    check_in_date: string;
    check_out_date: string;
    booking_code: string;
  }) => void;
  /** API verify function */
  onVerify: (token: string, bookingCode: string) => Promise<any>;
}

// ============================================================================
// COMPONENT
// ============================================================================
export default function BookingCodeVerification({
  token,
  onVerified,
  onVerify,
}: BookingCodeVerificationProps) {
  const [bookingCode, setBookingCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle verification submit
   */
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset error
    setError(null);

    // Validate booking code
    if (!bookingCode.trim()) {
      setError('Please enter your booking code');
      return;
    }

    setIsVerifying(true);

    try {
      const response = await onVerify(token, bookingCode.trim().toUpperCase());

      if (response.data?.valid && response.data?.booking) {
        // Success - pass booking data to parent
        onVerified(response.data.booking);
      } else if (response.data?.valid === false) {
        // Invalid token or booking code
        setError(response.data.error || 'Invalid booking code or review link');
      } else {
        setError('Unable to verify booking code. Please try again.');
      }
    } catch (err: any) {
      // Handle API errors
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.valid === false) {
        setError(err.response.data.error || 'Invalid booking code');
      } else if (err.response?.status === 404) {
        setError('Invalid review link. Please check your email.');
      } else if (err.response?.status === 400) {
        setError('This review link has expired or is no longer valid.');
      } else {
        setError('Something went wrong. Please try again later.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md mx-auto"
    >
      {/* Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8">
        {/* Header with icon */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#C4A572]/10 rounded-full mb-4">
            <Lock className="w-8 h-8 text-[#C4A572]" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Verify Your Booking
          </h2>
          <p className="text-sm text-gray-600">
            Enter the booking code from your reservation confirmation email to continue.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          {/* Booking Code Input */}
          <div>
            <label htmlFor="bookingCode" className="block text-sm font-medium text-gray-700 mb-2">
              Booking Code
            </label>
            <input
              type="text"
              id="bookingCode"
              value={bookingCode}
              onChange={(e) => {
                setBookingCode(e.target.value.toUpperCase());
                setError(null); // Clear error on input
              }}
              placeholder="e.g., ABC123"
              className={`
                w-full px-4 py-3 rounded-lg border
                ${error
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-[#C4A572] focus:border-[#C4A572]'
                }
                text-center text-lg font-semibold tracking-wider uppercase
                focus:outline-none focus:ring-2 transition-colors
                disabled:bg-gray-100 disabled:cursor-not-allowed
              `}
              disabled={isVerifying}
              maxLength={20}
              autoComplete="off"
              autoFocus
            />
            <p className="mt-2 text-xs text-gray-500">
              Your booking code can be found in your confirmation email
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Verification Failed</p>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
              </div>
            </motion.div>
          )}

          {/* Verify Button */}
          <button
            type="submit"
            disabled={isVerifying || !bookingCode.trim()}
            className="
              w-full px-6 py-3 bg-gray-900 text-white font-medium rounded-lg
              hover:bg-gray-800 active:scale-[0.98]
              focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
              transition-all duration-200
              flex items-center justify-center gap-2
            "
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Verify Booking</span>
              </>
            )}
          </button>
        </form>

        {/* Help Text */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            Can&apos;t find your booking code?{' '}
            <a
              href="mailto:support@allarcoapartment.com"
              className="text-[#C4A572] hover:text-[#A38652] font-medium underline"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>

      {/* Security Notice */}
      <p className="text-xs text-gray-500 text-center mt-4">
        <Lock className="w-3 h-3 inline-block mr-1" />
        Your information is secure and will only be used to verify your booking
      </p>
    </motion.div>
  );
}
