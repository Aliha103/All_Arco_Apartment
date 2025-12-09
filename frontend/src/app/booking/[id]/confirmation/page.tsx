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
import { CheckCircle, AlertCircle, Mail, CreditCard, Shield, CalendarClock, Clock, Info, Download, Users, Home, FileText } from 'lucide-react';
import SiteNav from '@/app/components/SiteNav';
import SiteFooter from '@/app/components/SiteFooter';
import { motion } from 'framer-motion';

export const dynamic = 'force-dynamic';

function ConfirmationContent() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();

  const pathId = params.id as string | undefined;
  const queryId = search?.get('booking_id') || undefined;
  const sessionId = search?.get('session_id') || undefined;
  const isCityTax = search?.get('city_tax') === '1';
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
      const response = isCityTax
        ? await api.payments.confirmCityTaxSession(sessionId, bookingId)
        : await api.payments.confirmCheckoutSession(sessionId, bookingId);
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
  const totalPrice = Number((booking as any).total_price ?? 0) || 0;
  const chargedNow = Math.max(totalPrice - touristTax, 0);
  const today = new Date().toISOString().slice(0, 10);
  const isSameDay = booking.check_in_date === today;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#F8F7F4] to-white text-gray-900">
      <SiteNav solid />

      <main className="pt-28 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 space-y-8">
          {/* Enhanced Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className={`border-2 shadow-2xl overflow-hidden ${
              isPaid ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/50 via-white to-white' : 'border-amber-200 bg-gradient-to-br from-amber-50/50 via-white to-white'
            }`}>
              <CardContent className="p-6 sm:p-10">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
                  <div className="flex-1 space-y-5">
                    {/* Status Badge */}
                    <div className="flex flex-wrap items-center gap-3">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Badge
                          className={`px-4 py-1.5 text-sm font-semibold ${
                            isPaid
                              ? 'bg-emerald-500 text-white border-0 shadow-lg'
                              : 'bg-amber-500 text-white border-0 shadow-lg'
                          }`}
                        >
                          {isPaid ? (
                            <><CheckCircle className="w-4 h-4 mr-1.5 inline" /> Paid</>
                          ) : (
                            <><Clock className="w-4 h-4 mr-1.5 inline" /> Payment pending</>
                          )}
                        </Badge>
                      </motion.div>
                      <Badge variant="outline" className="border-2 border-gray-300 text-gray-700 px-3 py-1 text-sm font-medium">
                        <FileText className="w-3.5 h-3.5 mr-1.5 inline" />
                        {booking.booking_id}
                      </Badge>
                    </div>

                    {/* Main Heading */}
                    <div className="space-y-2">
                      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 flex items-center gap-3">
                        <Shield className="w-8 h-8 text-[#C4A572] flex-shrink-0" />
                        <span>You're all set—see you in Venice!</span>
                      </h1>
                      <p className="text-lg text-gray-600 leading-relaxed">
                        We've locked in your dates. Save your PDF confirmation and complete online check-in at your convenience.
                      </p>
                    </div>

                    {/* Booking Reference Display */}
                    <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur border-2 border-gray-200 rounded-xl px-5 py-3 shadow-sm">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Booking Reference</span>
                        <span className="text-xl font-bold text-gray-900 font-mono tracking-wide">{booking.booking_id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 lg:min-w-[220px]">
                    {isPaid && (
                      <Button
                        onClick={() => window.open(`/api/bookings/${booking.id}/download-pdf/`, '_blank')}
                        className="h-12 bg-[#C4A572] hover:bg-[#B39562] text-white font-semibold shadow-lg transition-all"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        Download PDF
                      </Button>
                    )}
                    {!isPaid && (
                      <Button
                        onClick={() => payMutation.mutate()}
                        disabled={payMutation.isPending}
                        className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg transition-all"
                      >
                        {payMutation.isPending ? 'Starting payment…' : 'Proceed to Payment'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid lg:grid-cols-[2fr,1fr] gap-6">
            {/* Left column */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {/* Stay Details Card */}
              <Card className="shadow-xl border-2 border-blue-100 bg-gradient-to-br from-blue-50/30 via-white to-white overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-50/50 to-white border-b border-blue-100 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Home className="w-5 h-5 text-blue-600" />
                      </div>
                      <CardTitle className="text-xl font-bold text-gray-900">Stay details</CardTitle>
                    </div>
                    <Badge className="bg-blue-500 text-white border-0 px-3 py-1 text-sm font-semibold shadow-md">
                      {booking.nights} night{booking.nights === 1 ? '' : 's'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Guest Name</p>
                      <p className="text-base font-semibold text-gray-900">{booking.guest_name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Number of Guests</p>
                      <p className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        {guestCount}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-in</p>
                      <p className="text-base font-semibold text-gray-900">{formatDate(booking.check_in_date)}</p>
                      <p className="text-xs text-gray-500">From 15:00</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-out</p>
                      <p className="text-base font-semibold text-gray-900">{formatDate(booking.check_out_date)}</p>
                      <p className="text-xs text-gray-500">By 10:00</p>
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</p>
                      <p className="text-base font-semibold text-gray-900 break-all">{booking.guest_email}</p>
                    </div>
                  </div>

                  {/* Cancellation Policy */}
                  <div className="rounded-xl bg-gradient-to-r from-amber-50 to-amber-50/50 border border-amber-200 p-4 flex items-start gap-3">
                    <CalendarClock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Cancellation policy</p>
                      <p className="font-semibold text-gray-900">
                        {((booking as any).cancellation_policy || (booking as any).policy) === 'non_refundable'
                          ? 'Non-refundable · 10% discount applied'
                          : 'Flexible · Free until 24h before check-in'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Summary Card */}
              <Card className="shadow-xl border-2 border-emerald-100 bg-gradient-to-br from-emerald-50/30 via-white to-white overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-white border-b border-emerald-100 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-emerald-600" />
                      </div>
                      <CardTitle className="text-xl font-bold text-gray-900">Payment summary</CardTitle>
                    </div>
                    <Badge className="bg-white border-2 border-gray-200 text-gray-700 px-3 py-1 text-xs font-semibold">
                      <CreditCard className="w-3.5 h-3.5 mr-1.5 inline" /> Stripe
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Line items */}
                  <div className="space-y-3 text-base">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Stay ({booking.nights} night{booking.nights === 1 ? '' : 's'})</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(stayAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Cleaning</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(cleaningFee)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Tourist tax</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(touristTax)}</span>
                    </div>
                    {appliedCredit > 0 && (
                      <div className="flex items-center justify-between text-emerald-700 bg-emerald-50 -mx-2 px-2 py-2 rounded-lg">
                        <span className="font-medium">Credit applied</span>
                        <span className="font-bold">- {formatCurrency(appliedCredit)}</span>
                      </div>
                    )}
                  </div>

                  {/* Charged Now */}
                  <div className="border-t-2 border-dashed border-gray-300 pt-4 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white -mx-6 px-6 py-4">
                    <span className="font-bold text-gray-900 text-lg">Charged now</span>
                    <span className="text-2xl font-bold text-emerald-600">{formatCurrency(chargedNow)}</span>
                  </div>

                  {/* Additional costs */}
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        City tax ({booking.city_tax_payment_status === 'paid' ? 'paid online' : 'pay at property'})
                      </span>
                      <span className="font-semibold text-gray-900">{formatCurrency(touristTax)}</span>
                    </div>
                    <div className="flex items-center justify-between text-base font-semibold">
                      <span className="text-gray-900">Total stay</span>
                      <span className="text-gray-900">{formatCurrency(booking.total_price)}</span>
                    </div>
                  </div>

                  {!isPaid && (
                    <div className="flex items-start gap-3 text-amber-800 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span className="font-medium">Payment is pending. Complete checkout to confirm your stay.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Right column */}
            <motion.div
              className="space-y-5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              {/* Next Steps Card */}
              <Card className="shadow-xl border-2 border-[#C4A572]/20 bg-gradient-to-br from-amber-50/30 via-white to-white overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-amber-50/50 to-white border-b border-amber-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#C4A572]/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-[#C4A572]" />
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-900">Next steps</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                  {/* Step 1 */}
                  <div className="flex gap-4 group">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-bold text-gray-900 text-base">Confirmation email sent</p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        We emailed your receipt and booking summary to <span className="font-semibold">{booking.guest_email}</span>.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4 group">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Mail className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-bold text-gray-900 text-base">Check-in details</p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Arrival instructions will be sent <span className="font-semibold">48 hours before check-in</span>.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4 group">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-amber-600" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-bold text-gray-900 text-base">House rules</p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Check-in from <span className="font-semibold">15:00</span> · Check-out by <span className="font-semibold">10:00</span> · City tax paid at property · Non-smoking.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Need Help Card */}
              <Card className="shadow-xl border-2 border-gray-200 bg-white overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Info className="w-5 h-5 text-gray-600" />
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-900">Need help?</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Have questions or need assistance? Our support team is here to help.
                    </p>
                    <a
                      href="mailto:support@allarcoapartment.com"
                      className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100"
                    >
                      <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Email Support</p>
                        <p className="text-sm font-bold text-blue-600">support@allarcoapartment.com</p>
                      </div>
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="space-y-3">
                {isSameDay && (
                  <div className="rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-100 to-amber-50 text-amber-900 px-5 py-4 flex gap-3 items-start w-full">
                    <Clock className="w-6 h-6 flex-shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <p className="font-bold text-base mb-1">Same-day arrival</p>
                      <p className="text-sm leading-relaxed">Please complete online check-in now to receive access instructions.</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href={`/booking/${booking.id}/check-in`}>
                    <Button className="w-full sm:w-auto h-11 px-6 bg-[#C4A572] text-white hover:bg-[#B39562] text-sm font-semibold">
                      <Shield className="w-4 h-4 mr-2" />
                      Complete online check-in
                    </Button>
                  </Link>

                  {!isPaid && (
                    <Button
                      className="w-full sm:w-auto h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
                      onClick={() => payMutation.mutate()}
                      disabled={payMutation.isPending}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      {payMutation.isPending ? 'Starting payment…' : 'Proceed to Payment'}
                    </Button>
                  )}

                  <Link href="/">
                    <Button variant="outline" className="w-full sm:w-auto h-11 px-6 border-2 border-gray-300 hover:bg-gray-50 text-sm font-semibold">
                      <Home className="w-4 h-4 mr-2" />
                      Back to home
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
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
