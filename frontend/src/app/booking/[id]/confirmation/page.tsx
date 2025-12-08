'use client';

import { Suspense, useEffect, useRef } from 'react';
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
  const sessionId = search?.get('session_id') || undefined;
  const bookingId = (pathId && pathId !== 'undefined') ? pathId : (queryId || '');
  const isMissingId = !bookingId;

  const { data: booking, isLoading, refetch } = useQuery<Booking>({
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

  // Fallback in case the Stripe webhook is delayed: confirm the session on the API
  const attemptedConfirm = useRef(false);
  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId || !bookingId) throw new Error('Missing booking/session id');
      const response = await api.payments.confirmCheckoutSession(sessionId, bookingId);
      return response.data;
    },
    onSuccess: () => {
      refetch();
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error || 'Unable to verify payment status.';
      toast.error(msg);
    },
  });

  useEffect(() => {
    if (sessionId && bookingId && !attemptedConfirm.current) {
      attemptedConfirm.current = true;
      confirmMutation.mutate();
    }
  }, [sessionId, bookingId, confirmMutation]);

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

  const isPaid = booking.payment_status === 'paid';

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-gray-900">
            All'Arco Apartment
          </Link>
          <Badge variant={isPaid ? 'success' : 'secondary'}>
            {isPaid ? 'Paid' : 'Payment pending'}
          </Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-10">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Hero */}
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wide">Booking reference</p>
                  <p className="text-2xl font-bold text-gray-900">{booking.booking_id}</p>
                  <p className="mt-2 text-gray-700">
                    {isPaid
                      ? "You're all set—see you in Venice!"
                      : 'Complete payment to confirm your stay.'}
                  </p>
                </div>
                {isPaid && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/api/bookings/${booking.id}/download-pdf/`, '_blank')}
                  >
                    Download PDF
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Stay details</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 text-sm text-gray-800">
              <div>
                <p className="text-gray-500">Guest</p>
                <p className="font-semibold">{booking.guest_name}</p>
              </div>
              <div>
                <p className="text-gray-500">Guests</p>
                <p className="font-semibold">{(booking as any).number_of_guests ?? (booking as any).guests}</p>
              </div>
              <div>
                <p className="text-gray-500">Check-in</p>
                <p className="font-semibold">{formatDate(booking.check_in_date)}</p>
              </div>
              <div>
                <p className="text-gray-500">Check-out</p>
                <p className="font-semibold">{formatDate(booking.check_out_date)}</p>
              </div>
              <div>
                <p className="text-gray-500">Nights</p>
                <p className="font-semibold">{booking.nights}</p>
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-semibold">{booking.guest_email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-800">
              <div className="flex items-center justify-between">
                <span>Total</span>
                <span className="text-lg font-semibold">{formatCurrency(booking.total_price)}</span>
              </div>
              {!isPaid && (
                <p className="text-sm text-amber-700">
                  Your payment is still pending. Please complete checkout to secure your booking.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {!isPaid ? (
              <>
                <Button className="flex-1" onClick={() => payMutation.mutate()} disabled={payMutation.isPending}>
                  {payMutation.isPending ? 'Starting payment…' : 'Proceed to Payment'}
                </Button>
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full">Return home</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/dashboard" className="flex-1">
                  <Button className="w-full">View my bookings</Button>
                </Link>
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full">Back to home</Button>
                </Link>
              </>
            )}
          </div>

          {/* Help */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Need help?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-700 space-y-1">
              <p>Email: <a href="mailto:support@allarcoapartment.com" className="text-blue-600 hover:underline">support@allarcoapartment.com</a></p>
              <p>Check-in questions: <a href="mailto:check-in@allarcoapartment.com" className="text-blue-600 hover:underline">check-in@allarcoapartment.com</a></p>
            </CardContent>
          </Card>
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
