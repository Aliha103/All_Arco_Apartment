'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, isAfter, isValid, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  Clock3,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAvailability, usePriceCalculation, useCreateBooking, useCreateCheckoutSession } from '@/hooks/useBooking';
import { calculateNights, formatCurrency } from '@/lib/utils';

type Step = 'plan' | 'guest';

const today = format(new Date(), 'yyyy-MM-dd');

function sanitizeDate(value: string | null): string {
  if (!value) return '';
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, 'yyyy-MM-dd') : '';
}

function BookingPageContent() {
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>('plan');
  const [dates, setDates] = useState({ checkIn: '', checkOut: '' });
  const [guestCounts, setGuestCounts] = useState({ adults: 2, children: 0, infants: 0 });
  const [guestInfo, setGuestInfo] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    special_requests: '',
  });

  // Prefill from query params (e.g., ?checkIn=2026-01-01&checkOut=2026-01-02&adults=2...)
  useEffect(() => {
    const checkInParam = sanitizeDate(searchParams.get('checkIn'));
    const checkOutParam = sanitizeDate(searchParams.get('checkOut'));
    const adults = Number(searchParams.get('adults') || '0');
    const children = Number(searchParams.get('children') || '0');
    const infants = Number(searchParams.get('infants') || '0');

    if (checkInParam) {
      setDates((prev) => ({ ...prev, checkIn: checkInParam }));
    }
    if (checkOutParam && (!checkInParam || !isAfter(parseISO(checkInParam), parseISO(checkOutParam)))) {
      setDates((prev) => ({ ...prev, checkOut: checkOutParam }));
    }
    if (adults + children > 0) {
      setGuestCounts({
        adults: Math.max(1, adults || 0),
        children: Math.max(0, children || 0),
        infants: Math.max(0, infants || 0),
      });
    }
  }, [searchParams]);

  const totalGuests = useMemo(
    () => Math.max(1, guestCounts.adults + guestCounts.children),
    [guestCounts]
  );

  const nights = useMemo(() => {
    if (!dates.checkIn || !dates.checkOut) return 0;
    return calculateNights(new Date(dates.checkIn), new Date(dates.checkOut));
  }, [dates.checkIn, dates.checkOut]);

  const { data: availability, isLoading: checkingAvailability } = useAvailability(
    dates.checkIn,
    dates.checkOut
  );

  const { data: pricing, isLoading: calculatingPrice } = usePriceCalculation(
    dates.checkIn,
    dates.checkOut,
    totalGuests
  );

  const createBooking = useCreateBooking();
  const createCheckout = useCreateCheckoutSession();

  const setDateField = (field: 'checkIn' | 'checkOut', value: string) => {
    setDates((prev) => ({ ...prev, [field]: value }));
  };

  const handleContinueToGuest = () => {
    if (!dates.checkIn || !dates.checkOut) {
      alert('Please select check-in and check-out dates');
      return;
    }
    if (!availability?.available) {
      alert('Selected dates are not available');
      return;
    }
    setStep('guest');
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const bookingData = {
        check_in_date: dates.checkIn,
        check_out_date: dates.checkOut,
        guests: totalGuests,
        ...guestInfo,
      };

      const booking = await createBooking.mutateAsync(bookingData);
      const checkout = await createCheckout.mutateAsync(booking.id);

      if (checkout.session_url) {
        window.location.href = checkout.session_url;
      }
    } catch (error) {
      console.error('Booking failed:', error);
      alert('Failed to create booking. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B0C10] via-[#101119] to-[#0B0C10] text-white">
      {/* Hero / Header */}
      <header className="border-b border-white/10 bg-black/30 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight text-white">
            All&apos;Arco Apartment
          </Link>
          <div className="hidden sm:flex items-center gap-2 text-sm text-white/70">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            256-bit checkout • Instant confirmation
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 space-y-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[#C4A572]">
            <Sparkles className="w-4 h-4" />
            Quantum Booking Flow
          </div>
          <h1 className="text-3xl sm:text-4xl font-light text-white leading-tight">
            Reserve your Venice escape with a frictionless, Discord-inspired flow.
          </h1>
          <p className="text-white/70 max-w-2xl">
            Real-time availability, transparent pricing, and a checkout built for speed. Adjust dates,
            guests, and glide straight to payment.
          </p>
        </div>

        <div className="grid lg:grid-cols-[2fr_1fr] gap-6 lg:gap-8 items-start">
          {/* Booking Flow Card */}
          <Card className="bg-white/5 border-white/10 backdrop-blur shadow-2xl">
            <CardHeader className="border-b border-white/5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-white text-xl">Step {step === 'plan' ? '01' : '02'}</CardTitle>
                  <CardDescription className="text-white/60">
                    {step === 'plan' ? 'Choose dates and guests' : 'Confirm guest details'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-200 border-emerald-400/30">
                    <BadgeCheck className="w-4 h-4 mr-1" />
                    Secure Checkout
                  </Badge>
                  <Badge variant="outline" className="border-white/20 text-white">
                    {nights > 0 ? `${nights} night${nights === 1 ? '' : 's'}` : 'Dates pending'}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 sm:p-8 space-y-8">
              {step === 'plan' && (
                <div className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="checkIn" className="text-white/80">Check-in</Label>
                      <Input
                        id="checkIn"
                        type="date"
                        min={today}
                        value={dates.checkIn}
                        onChange={(e) => setDateField('checkIn', e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkOut" className="text-white/80">Check-out</Label>
                      <Input
                        id="checkOut"
                        type="date"
                        min={dates.checkIn || today}
                        value={dates.checkOut}
                        onChange={(e) => setDateField('checkOut', e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    {(['adults', 'children', 'infants'] as const).map((key) => (
                      <div key={key} className="p-4 rounded-xl border border-white/10 bg-white/5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 text-white/80">
                            <UserRound className="w-4 h-4" />
                            <span className="capitalize">{key}</span>
                          </div>
                          <Badge variant="outline" className="border-white/15 text-white/70">
                            {guestCounts[key]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="border-white/20 text-white"
                            onClick={() =>
                              setGuestCounts((prev) => ({
                                ...prev,
                                [key]: Math.max(key === 'adults' ? 1 : 0, prev[key as keyof typeof prev] - 1),
                              }))
                            }
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            min={key === 'adults' ? 1 : 0}
                            max={5}
                            value={guestCounts[key]}
                            onChange={(e) =>
                              setGuestCounts((prev) => ({
                                ...prev,
                                [key]: Math.max(key === 'adults' ? 1 : 0, Math.min(5, Number(e.target.value) || 0)),
                              }))
                            }
                            className="text-center bg-white/5 border-white/10 text-white"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="border-white/20 text-white"
                            onClick={() =>
                              setGuestCounts((prev) => ({
                                ...prev,
                                [key]: Math.min(5, prev[key as keyof typeof prev] + 1),
                              }))
                            }
                          >
                            +
                          </Button>
                        </div>
                        {key === 'infants' && (
                          <p className="text-xs text-white/50 mt-2">Infants don&apos;t count toward max guests</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {dates.checkIn && dates.checkOut && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-white/80">
                        <CalendarCheck2 className="w-4 h-4 text-emerald-400" />
                        <span>
                          {nights || 0} night{nights === 1 ? '' : 's'} • {dates.checkIn} → {dates.checkOut}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock3 className="w-4 h-4 text-blue-300" />
                        {checkingAvailability && <span className="text-blue-200">Checking availability…</span>}
                        {availability?.available === false && (
                          <span className="text-amber-200">Those dates are taken. Try adjusting.</span>
                        )}
                        {availability?.available && (
                          <span className="text-emerald-200">Locked in. Proceed to guest details.</span>
                        )}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleContinueToGuest}
                    disabled={!availability?.available || checkingAvailability}
                    className="w-full bg-[#C4A572] text-black hover:bg-[#D8B77A]"
                  >
                    Continue to guest info
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {step === 'guest' && (
                <form
                  onSubmit={handleSubmitBooking}
                  className="space-y-5"
                  aria-busy={createBooking.isPending || createCheckout.isPending}
                >
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="guest_name" className="text-white/80">Full Name</Label>
                      <Input
                        id="guest_name"
                        placeholder="Ada Lovelace"
                        value={guestInfo.guest_name}
                        onChange={(e) => setGuestInfo({ ...guestInfo, guest_name: e.target.value })}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guest_email" className="text-white/80">Email</Label>
                      <Input
                        id="guest_email"
                        type="email"
                        placeholder="you@example.com"
                        value={guestInfo.guest_email}
                        onChange={(e) =>
                          !createBooking.isPending &&
                          !createCheckout.isPending &&
                          setGuestInfo({ ...guestInfo, guest_email: e.target.value })
                        }
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="guest_phone" className="text-white/80">Phone</Label>
                      <Input
                        id="guest_phone"
                        type="tel"
                        placeholder="+39 123 456 7890"
                        value={guestInfo.guest_phone}
                        onChange={(e) =>
                          !createBooking.isPending &&
                          !createCheckout.isPending &&
                          setGuestInfo({ ...guestInfo, guest_phone: e.target.value })
                        }
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/80">Guests</Label>
                      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/80">
                        {guestCounts.adults} adults, {guestCounts.children} children, {guestCounts.infants} infants
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="special_requests" className="text-white/80">Special Requests (optional)</Label>
                    <Textarea
                      id="special_requests"
                      placeholder="Late check-in, allergies, anniversary notes…"
                      value={guestInfo.special_requests}
                      onChange={(e) =>
                        !createBooking.isPending &&
                        !createCheckout.isPending &&
                        setGuestInfo({ ...guestInfo, special_requests: e.target.value })
                      }
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/40 min-h-[120px]"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep('plan')}
                      className="flex-1 border-white/20 text-white"
                    >
                      Back to dates
                    </Button>
                    <Button
                      type="submit"
                      disabled={createBooking.isPending || createCheckout.isPending}
                      className="flex-1 bg-[#C4A572] text-black hover:bg-[#D8B77A]"
                    >
                      {createBooking.isPending || createCheckout.isPending ? 'Processing…' : 'Proceed to payment'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Pricing / Ops card */}
          <div className="space-y-4">
            <Card className="bg-white/5 border-white/10 backdrop-blur shadow-xl sticky top-4">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C4A572]" />
                  Price summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pricing ? (
                  <>
                    <div className="space-y-3 text-sm text-white/80">
                      <div className="flex justify-between">
                        <span>{formatCurrency(pricing.nightly_rate)} × {nights || 0} night{nights === 1 ? '' : 's'}</span>
                        <span className="text-white">{formatCurrency(pricing.accommodation_total)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cleaning fee</span>
                        <span className="text-white">{formatCurrency(pricing.cleaning_fee)}</span>
                      </div>
                      {parseFloat(pricing.extra_guest_fee) > 0 && (
                        <div className="flex justify-between">
                          <span>Extra guest fee</span>
                          <span className="text-white">{formatCurrency(pricing.extra_guest_fee)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Tourist tax</span>
                        <span className="text-white">{formatCurrency(pricing.tourist_tax)}</span>
                      </div>
                    </div>
                    <div className="border-t border-white/10 pt-4">
                      <div className="flex justify-between text-lg font-semibold text-white">
                        <span>Total</span>
                        <span>{formatCurrency(pricing.total)}</span>
                      </div>
                      <p className="text-xs text-white/50 mt-1">
                        Charged securely when you confirm. Includes all required taxes.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-white/15 p-4 text-white/60 text-sm">
                    Select your dates and guests to unlock live pricing.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#11131A] border-white/5">
              <CardContent className="p-4 space-y-3 text-sm text-white/80">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Protected by secure Stripe checkout</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C4A572]" />
                  <span>Instant confirmation email with your booking code</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock3 className="w-4 h-4 text-blue-300" />
                  <span>24/7 check-in flexibility — let us know your arrival window</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <BookingPageContent />
    </Suspense>
  );
}
