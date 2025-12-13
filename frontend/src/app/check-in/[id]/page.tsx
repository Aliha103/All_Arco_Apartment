'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * Legacy check-in URL redirect handler.
 *
 * This route handles old UUID-based check-in URLs like /check-in/{uuid}
 * and redirects them to the new format: /booking/{booking_id}/check-in
 *
 * This ensures backward compatibility with old email links.
 */
export default function CheckInRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const bookingUuid = params.id as string;

  useEffect(() => {
    const redirectToCorrectUrl = async () => {
      try {
        // Fetch booking by UUID to get the booking_id
        const response = await api.bookings.get(bookingUuid);
        const booking = response.data;

        if (booking && booking.booking_id) {
          // Redirect to the correct check-in URL format
          router.replace(`/booking/${encodeURIComponent(booking.booking_id)}/check-in`);
        } else {
          // If no booking found, redirect to home
          router.replace('/');
        }
      } catch (error) {
        console.error('Failed to fetch booking for redirect:', error);
        // On error, redirect to home
        router.replace('/');
      }
    };

    if (bookingUuid) {
      redirectToCorrectUrl();
    }
  }, [bookingUuid, router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-[#F8F7F4] to-white">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C4A572] mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to check-in page...</p>
      </div>
    </div>
  );
}
