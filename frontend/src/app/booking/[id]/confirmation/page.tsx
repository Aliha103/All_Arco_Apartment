'use client';

'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Booking } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { toast } from 'sonner';

export const dynamic = 'force-dynamic';

function ConfirmationContent() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();

  const pathId = params.id as string | undefined;
  const queryId = search?.get('booking_id') || undefined;
  const bookingId = (pathId && pathId !== 'undefined') ? pathId : (queryId || '');
  const isMissingId = !bookingId;

  const { data: booking, isLoading } = useQuery<Booking>({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      if (!bookingId) throw new Error('Missing booking id');
      const response = await api.bookings.get(bookingId);
      return response.data;
    },
    enabled: !!bookingId,
    retry: 1,
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      const response = await api.payments.createCheckoutSession(bookingId as string);
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.session_url) {
        window.location.href = data.session_url;
      } else {
        toast.error('Unable to start payment. Please try again.');
      }
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error || 'Unable to start payment.';
      toast.error(msg);
    },
  });

  if (isMissingId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full border-amber-200">
          <CardHeader>
            <CardTitle className="text-lg text-amber-800">Booking reference missing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <p>We couldn’t find a booking reference in this link.</p>
            <p>Please start a new booking or return home.</p>
            <div className="flex justify-center gap-3 pt-2">
              <Button onClick={() => router.push('/')}>Home</Button>
              <Button variant="outline" onClick={() => router.push('/book')}>Book Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading booking details...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Booking not found</p>
            <Link href="/" className="block text-center mt-4">
              <Button>Return to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            All'Arco Apartment
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Success Message */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {booking.payment_status === 'paid' ? 'Booking Confirmed!' : 'Booking Pending Payment'}
            </h1>
            <p className="text-lg text-gray-600">
              {booking.payment_status === 'paid'
                ? "Thank you for booking with All'Arco Apartment"
                : "Please complete your payment to confirm your stay."}
            </p>
          </div>

          {/* Booking Details Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Booking Details</CardTitle>
                <Badge variant={booking.payment_status === 'paid' ? 'success' : 'secondary'}>
                  {booking.payment_status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Booking ID</p>
                  <p className="font-semibold">{booking.booking_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Guest Name</p>
                  <p className="font-semibold">{booking.guest_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Check-in</p>
                  <p className="font-semibold">{formatDate(booking.check_in_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Check-out</p>
                  <p className="font-semibold">{formatDate(booking.check_out_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Nights</p>
                  <p className="font-semibold">{booking.nights}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Guests</p>
                  <p className="font-semibold">
                    {(booking as any).number_of_guests ?? (booking as any).guests}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(booking.total_price)}
                  </span>
                </div>
                {booking.payment_status !== 'paid' && (
                  <p className="text-sm text-red-600 mt-1">Payment pending</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>What's Next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                  1
                </div>
                <div>
                  <p className="font-medium">Confirmation Email</p>
                  <p className="text-sm text-gray-600">
                    We've sent a confirmation email to {booking.guest_email}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                  2
                </div>
                <div>
                  <p className="font-medium">Pre-Arrival Reminder</p>
                  <p className="text-sm text-gray-600">
                    You'll receive a reminder 7 days before your check-in
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                  3
                </div>
                <div>
                  <p className="font-medium">Check-in Instructions</p>
                  <p className="text-sm text-gray-600">
                    Detailed instructions will be sent 48 hours before arrival
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                If you have any questions or need to make changes to your booking, please contact us:
              </p>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Email:</span>{' '}
                  <a href="mailto:support@allarcoapartment.com" className="text-blue-600 hover:underline">
                    support@allarcoapartment.com
                  </a>
                </p>
                <p>
                  <span className="font-medium">Check-in Questions:</span>{' '}
                  <a href="mailto:check-in@allarcoapartment.com" className="text-blue-600 hover:underline">
                    check-in@allarcoapartment.com
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            {booking.payment_status !== 'paid' ? (
              <>
                <Button
                  className="flex-1"
                  onClick={() => payMutation.mutate()}
                  disabled={payMutation.isPending}
                >
                  {payMutation.isPending ? 'Starting payment…' : 'Proceed to Payment'}
                </Button>
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full">Return to Home</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/dashboard" className="flex-1">
                  <Button className="w-full">View My Bookings</Button>
                </Link>
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full">Return to Home</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading booking...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
