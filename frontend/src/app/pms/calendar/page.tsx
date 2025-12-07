'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Calendar page has been unified with Bookings page.
 * This page automatically redirects to /pms/bookings?view=calendar
 */
export default function CalendarRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pms/bookings?view=calendar');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
        <p className="text-gray-700 text-lg">Redirecting to Calendar...</p>
      </div>
    </div>
  );
}
