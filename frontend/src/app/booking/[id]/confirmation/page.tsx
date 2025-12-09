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
import { CheckCircle, AlertCircle, Mail, CreditCard } from 'lucide-react';
import SiteNav from '@/app/components/SiteNav';
import SiteFooter from '@/app/components/SiteFooter';

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
  const guestCount = (booking as any).number_of_guests ?? (booking as any).guests;
  const nightlyRate = Number((booking as any).nightly_rate ?? 0) || 0;
  const cleaningFee = Number((booking as any).cleaning_fee ?? 0) || 0;
  const touristTax = Number((booking as any).tourist_tax ?? 0) || 0;
  const appliedCredit = Number((booking as any).applied_credit ?? 0) || 0;
  const stayAmount = nightlyRate * (booking.nights || 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#fdf8ec] to-white text-gray-900">
      <SiteNav solid />

      <main className="pt-28 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 space-y-8">
          {/* Hero */}
          <Card className="border border-amber-100 shadow-xl bg-white/90 backdrop-blur">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={isPaid ? 'success' : 'secondary'}
                      className={isPaid ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}
                    >
                      {isPaid ? 'Paid' : 'Payment pending'}
                    </Badge>
                    <span className="text-sm text-gray-500">Booking reference</span>
                  </div>
                  <p className="text-3xl font-semibold tracking-tight text-gray-900">{booking.booking_id}</p>
                  <p className="text-base text-gray-700">
                    {isPaid
                      ? "You're all set—see you in Venice!"
                      : 'Please complete payment to lock in your stay.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {isPaid && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(`/api/bookings/${booking.id}/download-pdf/`, '_blank')}
                      className="border-gray-300"
                    >
                      Download PDF
                    </Button>
                  )}
                  {!isPaid && (
                    <Button onClick={() => payMutation.mutate()} disabled={payMutation.isPending}>
                      {payMutation.isPending ? 'Starting payment…' : 'Proceed to Payment'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-[2fr,1fr] gap-6">
            {/* Left column */}
            <div className="space-y-6">
              <Card className="shadow-lg border border-amber-50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Stay details</CardTitle>
                  <Badge variant="outline" className="border-gray-200 text-gray-700">
                    {booking.nights} night{booking.nights === 1 ? '' : 's'}
                  </Badge>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4 text-sm text-gray-800">
                  <div>
                    <p className="text-gray-500">Guest</p>
                    <p className="font-semibold">{booking.guest_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Guests</p>
                    <p className="font-semibold">{guestCount}</p>
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
                    <p className="text-gray-500">Email</p>
                    <p className="font-semibold">{booking.guest_email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Cancellation policy</p>
                    <p className="font-semibold">
                      {booking.cancellation_policy === 'non_refundable'
                        ? 'Non-refundable (10% discount applied)'
                        : 'Flexible — free until 24h before check-in'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border border-amber-50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Payment summary</CardTitle>
                  <Badge variant="secondary" className="bg-gray-50 text-gray-700 border-gray-200">
                    <CreditCard className="w-4 h-4 mr-1" /> Stripe
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-800">
                  <div className="flex items-center justify-between">
                    <span>Stay ({booking.nights} night{booking.nights === 1 ? '' : 's'})</span>
                    <span className="font-semibold">{formatCurrency(stayAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cleaning</span>
                    <span className="font-semibold">{formatCurrency(cleaningFee)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tourist tax</span>
                    <span className="font-semibold">{formatCurrency(touristTax)}</span>
                  </div>
                  {appliedCredit > 0 && (
                    <div className="flex items-center justify-between text-emerald-700">
                      <span>Credit applied</span>
                      <span className="font-semibold">- {formatCurrency(appliedCredit)}</span>
                    </div>
                  )}
                  <div className="border-t border-dashed border-gray-200 pt-3 flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(booking.total_price)}</span>
                  </div>
                  {isPaid ? (
                    <div className="flex items-center gap-2 text-emerald-700 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>Payment confirmed. A receipt was emailed from reservations@allarcoapartment.com.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-700 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>Payment is pending. Complete checkout to confirm your stay.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <Card className="shadow-lg border border-amber-50">
                <CardHeader>
                  <CardTitle className="text-lg">Next steps</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-700">
                  <div className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">Confirmation email sent</p>
                      <p className="text-gray-600">We emailed your receipt and booking summary to {booking.guest_email}.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Mail className="w-5 h-5 text-[#C4A572] mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">Check-in details</p>
                      <p className="text-gray-600">Arrival instructions will be sent 48 hours before check-in.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border border-amber-50">
                <CardHeader>
                  <CardTitle className="text-lg">Need help?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-gray-700">
                  <p>
                    <span className="font-semibold text-gray-900">Reservations: </span>
                    <a href="mailto:reservations@allarcoapartment.com" className="text-blue-600 hover:underline">
                      reservations@allarcoapartment.com
                    </a>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-900">Check-in questions: </span>
                    <a href="mailto:check-in@allarcoapartment.com" className="text-blue-600 hover:underline">
                      check-in@allarcoapartment.com
                    </a>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-900">Support: </span>
                    <a href="mailto:support@allarcoapartment.com" className="text-blue-600 hover:underline">
                      support@allarcoapartment.com
                    </a>
                  </p>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3">
                {isPaid ? (
                  <>
                    <Link href="/dashboard" className="w-full">
                      <Button className="w-full">View my bookings</Button>
                    </Link>
                    <Link href="/" className="w-full">
                      <Button variant="outline" className="w-full">Back to home</Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Button className="w-full" onClick={() => payMutation.mutate()} disabled={payMutation.isPending}>
                      {payMutation.isPending ? 'Starting payment…' : 'Proceed to Payment'}
                    </Button>
                    <Link href="/" className="w-full">
                      <Button variant="outline" className="w-full">Back to home</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
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
