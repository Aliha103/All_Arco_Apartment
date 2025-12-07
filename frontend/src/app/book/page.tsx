'use client';

import { Suspense, useEffect, useMemo, useState, useCallback, useTransition, memo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format, isAfter, isValid, parseISO } from 'date-fns';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  Clock3,
  ShieldCheck,
  Sparkles,
  UserRound,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
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

// Utility functions
function sanitizeDate(value: string | null): string {
  if (!value) return '';
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, 'yyyy-MM-dd') : '';
}

function safeFormatCurrency(value: string | number | undefined | null, fallback = '0.00'): string {
  if (value === undefined || value === null || value === '') return formatCurrency(fallback);
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(numValue) ? formatCurrency(fallback) : formatCurrency(numValue);
}

// Debounce hook for performance
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

const cardVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
    },
  }),
};

// Price Summary Skeleton
function PriceSummarySkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex justify-between">
          <div className="h-4 bg-white/10 rounded w-1/2"></div>
          <div className="h-4 bg-white/10 rounded w-1/4"></div>
        </div>
      ))}
      <div className="border-t border-white/10 pt-4">
        <div className="flex justify-between">
          <div className="h-6 bg-white/10 rounded w-1/3"></div>
          <div className="h-6 bg-white/10 rounded w-1/3"></div>
        </div>
      </div>
    </div>
  );
}

// Guest Counter Component (memoized for performance)
const GuestCounter = memo(({
  label,
  value,
  onChange,
  min = 0,
  max = 5,
  hint
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  hint?: string;
}) => {
  const handleIncrement = useCallback(() => {
    onChange(Math.min(max, value + 1));
  }, [value, max, onChange]);

  const handleDecrement = useCallback(() => {
    onChange(Math.max(min, value - 1));
  }, [value, min, onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || 0;
    onChange(Math.max(min, Math.min(max, newValue)));
  }, [min, max, onChange]);

  return (
    <motion.div
      className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-200"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-white/80">
          <UserRound className="w-4 h-4" />
          <span className="capitalize font-medium">{label}</span>
        </div>
        <Badge variant="outline" className="border-white/15 text-white/70 font-mono">
          {value}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all"
          onClick={handleDecrement}
          disabled={value <= min}
        >
          -
        </Button>
        <Input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={handleInputChange}
          className="text-center bg-white/5 border-white/10 text-white font-mono"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all"
          onClick={handleIncrement}
          disabled={value >= max}
        >
          +
        </Button>
      </div>
      {hint && (
        <p className="text-xs text-white/50 mt-2 italic">{hint}</p>
      )}
    </motion.div>
  );
});

GuestCounter.displayName = 'GuestCounter';

function BookingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [isPending, startTransition] = useTransition();

  const [[step, direction], setStepState] = useState<[Step, number]>(['plan', 0]);
  const [dates, setDates] = useState({ checkIn: '', checkOut: '' });
  const [guestCounts, setGuestCounts] = useState({ adults: 2, children: 0, infants: 0 });
  const [guestInfo, setGuestInfo] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    special_requests: '',
  });

  // Sync URL params
  const updateURL = useCallback((params: Record<string, string>) => {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      } else {
        url.searchParams.delete(key);
      }
    });
    startTransition(() => {
      router.replace(url.pathname + url.search, { scroll: false });
    });
  }, [router]);

  // Prefill from query params
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

  // Debounce guest counts for URL update
  const debouncedGuests = useDebounce(guestCounts, 500);

  useEffect(() => {
    if (dates.checkIn || dates.checkOut || debouncedGuests.adults > 0) {
      updateURL({
        checkIn: dates.checkIn,
        checkOut: dates.checkOut,
        adults: debouncedGuests.adults.toString(),
        children: debouncedGuests.children.toString(),
        infants: debouncedGuests.infants.toString(),
      });
    }
  }, [dates.checkIn, dates.checkOut, debouncedGuests, updateURL]);

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

  // Calculate accommodation_total locally if API returns 0 or null
  const correctedPricing = useMemo(() => {
    if (!pricing) return null;

    const nightlyRate = parseFloat(pricing.nightly_rate || '0');
    const apiAccommodation = parseFloat(pricing.accommodation_total || '0');

    // If API didn't calculate accommodation_total, do it locally
    const accommodation_total = apiAccommodation > 0
      ? pricing.accommodation_total
      : (nightlyRate * nights).toFixed(2);

    return {
      ...pricing,
      accommodation_total,
    };
  }, [pricing, nights]);

  const createBooking = useCreateBooking();
  const createCheckout = useCreateCheckoutSession();

  const setDateField = useCallback((field: 'checkIn' | 'checkOut', value: string) => {
    setDates((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setGuestCount = useCallback((key: keyof typeof guestCounts, value: number) => {
    setGuestCounts((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleContinueToGuest = useCallback(() => {
    if (!dates.checkIn || !dates.checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }
    if (!availability?.available) {
      toast.error('Selected dates are not available');
      return;
    }
    setStepState(['guest', 1]);
  }, [dates.checkIn, dates.checkOut, availability]);

  const handleBackToPlan = useCallback(() => {
    setStepState(['plan', -1]);
  }, []);

  const handleSubmitBooking = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const bookingData = {
        check_in_date: dates.checkIn,
        check_out_date: dates.checkOut,
        guests: totalGuests,
        ...guestInfo,
      };

      const booking = await createBooking.mutateAsync(bookingData);

      try {
        const checkout = await createCheckout.mutateAsync(booking.id);

        if (checkout?.session_url) {
          window.location.href = checkout.session_url;
          return;
        }

        throw new Error('Checkout session could not be created');
      } catch (checkoutError) {
        try {
          await api.bookings.delete(booking.id);
          toast.error('Payment failed to start. Booking was not completed—please try again.');
          return;
        } catch (cleanupError) {
          console.warn('Failed to roll back booking after checkout failure', cleanupError);
          toast.error(`Payment failed to start. Booking ID ${booking.booking_id || booking.id} needs manual cleanup.`);
          return;
        }
      }
    } catch (error) {
      console.error('Booking failed:', error);
      toast.error('Failed to create booking. Please try again.');
    }
  }, [dates, totalGuests, guestInfo, createBooking, createCheckout]);

  const isProcessing = createBooking.isPending || createCheckout.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B0C10] via-[#101119] to-[#0B0C10] text-white">
      {/* Hero / Header */}
      <motion.header
        className="border-b border-white/10 bg-black/30 backdrop-blur-xl sticky top-0 z-40"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight text-white hover:text-[#C4A572] transition-colors">
            All&apos;Arco Apartment
          </Link>
          <div className="hidden sm:flex items-center gap-2 text-sm text-white/70">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            256-bit checkout • Instant confirmation
          </div>
        </div>
      </motion.header>

      <motion.div
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="flex flex-col gap-3" variants={itemVariants}>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[#C4A572]">
            <Sparkles className="w-4 h-4 animate-pulse" />
            Quantum Booking Flow
          </div>
          <h1 className="text-3xl sm:text-4xl font-light text-white leading-tight">
            Reserve your Venice escape with a frictionless, Discord-inspired flow.
          </h1>
          <p className="text-white/70 max-w-2xl">
            Real-time availability, transparent pricing, and a checkout built for speed. Adjust dates,
            guests, and glide straight to payment.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[2fr_1fr] gap-6 lg:gap-8 items-start">
          {/* Booking Flow Card */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
              <CardHeader className="border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-white text-xl flex items-center gap-2">
                      Step {step === 'plan' ? '01' : '02'}
                      {step === 'guest' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    </CardTitle>
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

              <CardContent className="p-6 sm:p-8">
                <AnimatePresence mode="wait" custom={direction}>
                  {step === 'plan' && (
                    <motion.div
                      key="plan"
                      custom={direction}
                      variants={prefersReducedMotion ? undefined : cardVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      className="space-y-6"
                    >
                      <div className="grid sm:grid-cols-2 gap-4">
                        <motion.div
                          className="space-y-2"
                          whileHover={{ scale: 1.01 }}
                          transition={{ type: 'spring', stiffness: 400 }}
                        >
                          <Label htmlFor="checkIn" className="text-white/80 font-medium">Check-in</Label>
                          <Input
                            id="checkIn"
                            type="date"
                            min={today}
                            value={dates.checkIn}
                            onChange={(e) => setDateField('checkIn', e.target.value)}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent transition-all"
                          />
                        </motion.div>
                        <motion.div
                          className="space-y-2"
                          whileHover={{ scale: 1.01 }}
                          transition={{ type: 'spring', stiffness: 400 }}
                        >
                          <Label htmlFor="checkOut" className="text-white/80 font-medium">Check-out</Label>
                          <Input
                            id="checkOut"
                            type="date"
                            min={dates.checkIn || today}
                            value={dates.checkOut}
                            onChange={(e) => setDateField('checkOut', e.target.value)}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent transition-all"
                          />
                        </motion.div>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4">
                        <GuestCounter
                          label="adults"
                          value={guestCounts.adults}
                          onChange={(v) => setGuestCount('adults', v)}
                          min={1}
                        />
                        <GuestCounter
                          label="children"
                          value={guestCounts.children}
                          onChange={(v) => setGuestCount('children', v)}
                        />
                        <GuestCounter
                          label="infants"
                          value={guestCounts.infants}
                          onChange={(v) => setGuestCount('infants', v)}
                          hint="Infants don't count toward max guests"
                        />
                      </div>

                      <AnimatePresence mode="wait">
                        {dates.checkIn && dates.checkOut && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10 p-4 space-y-2 backdrop-blur-sm"
                          >
                            <div className="flex items-center gap-2 text-white/80">
                              <CalendarCheck2 className="w-4 h-4 text-emerald-400" />
                              <span className="font-medium">
                                {nights || 0} night{nights === 1 ? '' : 's'} • {dates.checkIn} → {dates.checkOut}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              {checkingAvailability ? (
                                <>
                                  <Loader2 className="w-4 h-4 text-blue-300 animate-spin" />
                                  <span className="text-blue-200">Checking availability…</span>
                                </>
                              ) : availability?.available === false ? (
                                <>
                                  <AlertCircle className="w-4 h-4 text-amber-300" />
                                  <span className="text-amber-200">Those dates are taken. Try adjusting.</span>
                                </>
                              ) : availability?.available ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                                  <span className="text-emerald-200">Locked in. Proceed to guest details.</span>
                                </>
                              ) : null}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          onClick={handleContinueToGuest}
                          disabled={!availability?.available || checkingAvailability}
                          className="w-full bg-[#C4A572] text-black hover:bg-[#D8B77A] font-semibold shadow-lg disabled:opacity-50 transition-all"
                        >
                          Continue to guest info
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}

                  {step === 'guest' && (
                    <motion.form
                      key="guest"
                      custom={direction}
                      variants={prefersReducedMotion ? undefined : cardVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      onSubmit={handleSubmitBooking}
                      className="space-y-5"
                      aria-busy={isProcessing}
                    >
                      <div className="grid sm:grid-cols-2 gap-4">
                        <motion.div
                          className="space-y-2"
                          whileHover={{ scale: 1.01 }}
                        >
                          <Label htmlFor="guest_name" className="text-white/80 font-medium">Full Name</Label>
                          <Input
                            id="guest_name"
                            placeholder="Ada Lovelace"
                            value={guestInfo.guest_name}
                            onChange={(e) => setGuestInfo({ ...guestInfo, guest_name: e.target.value })}
                            required
                            disabled={isProcessing}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent transition-all"
                          />
                        </motion.div>
                        <motion.div
                          className="space-y-2"
                          whileHover={{ scale: 1.01 }}
                        >
                          <Label htmlFor="guest_email" className="text-white/80 font-medium">Email</Label>
                          <Input
                            id="guest_email"
                            type="email"
                            placeholder="you@example.com"
                            value={guestInfo.guest_email}
                            onChange={(e) => !isProcessing && setGuestInfo({ ...guestInfo, guest_email: e.target.value })}
                            required
                            disabled={isProcessing}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent transition-all"
                          />
                        </motion.div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <motion.div
                          className="space-y-2"
                          whileHover={{ scale: 1.01 }}
                        >
                          <Label htmlFor="guest_phone" className="text-white/80 font-medium">Phone</Label>
                          <Input
                            id="guest_phone"
                            type="tel"
                            placeholder="+39 123 456 7890"
                            value={guestInfo.guest_phone}
                            onChange={(e) => !isProcessing && setGuestInfo({ ...guestInfo, guest_phone: e.target.value })}
                            required
                            disabled={isProcessing}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent transition-all"
                          />
                        </motion.div>
                        <div className="space-y-2">
                          <Label className="text-white/80 font-medium">Guests</Label>
                          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/80 font-medium">
                            {guestCounts.adults} adults, {guestCounts.children} children, {guestCounts.infants} infants
                          </div>
                        </div>
                      </div>

                      <motion.div
                        className="space-y-2"
                        whileHover={{ scale: 1.01 }}
                      >
                        <Label htmlFor="special_requests" className="text-white/80 font-medium">Special Requests (optional)</Label>
                        <Textarea
                          id="special_requests"
                          placeholder="Late check-in, allergies, anniversary notes…"
                          value={guestInfo.special_requests}
                          onChange={(e) => !isProcessing && setGuestInfo({ ...guestInfo, special_requests: e.target.value })}
                          disabled={isProcessing}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/40 min-h-[120px] focus:ring-2 focus:ring-[#C4A572] focus:border-transparent transition-all"
                        />
                      </motion.div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <motion.div
                          className="flex-1"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleBackToPlan}
                            disabled={isProcessing}
                            className="w-full border-white/20 text-white hover:bg-white/10 transition-all"
                          >
                            Back to dates
                          </Button>
                        </motion.div>
                        <motion.div
                          className="flex-1"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            type="submit"
                            disabled={isProcessing}
                            className="w-full bg-[#C4A572] text-black hover:bg-[#D8B77A] font-semibold shadow-lg disabled:opacity-50 transition-all"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing…
                              </>
                            ) : (
                              'Proceed to payment'
                            )}
                          </Button>
                        </motion.div>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pricing / Ops card */}
          <motion.div className="space-y-4" variants={itemVariants}>
            <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-xl sticky top-24">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C4A572]" />
                  Price summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <AnimatePresence mode="wait">
                  {calculatingPrice ? (
                    <motion.div
                      key="skeleton"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <PriceSummarySkeleton />
                    </motion.div>
                  ) : correctedPricing ? (
                    <motion.div
                      key="pricing"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="space-y-3 text-sm text-white/80">
                        <div className="flex justify-between">
                          <span>{safeFormatCurrency(correctedPricing.nightly_rate)} × {nights || 0} night{nights === 1 ? '' : 's'}</span>
                          <span className="text-white font-medium">{safeFormatCurrency(correctedPricing.accommodation_total)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cleaning fee</span>
                          <span className="text-white font-medium">{safeFormatCurrency(correctedPricing.cleaning_fee)}</span>
                        </div>
                        {parseFloat(correctedPricing.extra_guest_fee || '0') > 0 && (
                          <div className="flex justify-between">
                            <span>Extra guest fee</span>
                            <span className="text-white font-medium">{safeFormatCurrency(correctedPricing.extra_guest_fee)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Tourist tax</span>
                          <span className="text-white font-medium">{safeFormatCurrency(correctedPricing.tourist_tax)}</span>
                        </div>
                      </div>
                      <motion.div
                        className="border-t border-white/10 pt-4 mt-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="flex justify-between text-lg font-semibold text-white">
                          <span>Total</span>
                          <span>{safeFormatCurrency(correctedPricing.total)}</span>
                        </div>
                        <p className="text-xs text-white/50 mt-1">
                          Charged securely when you confirm. Includes all required taxes.
                        </p>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="rounded-lg border border-dashed border-white/15 p-4 text-white/60 text-sm text-center"
                    >
                      Select your dates and guests to unlock live pricing.
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-[#11131A]/80 border-white/5 backdrop-blur">
                <CardContent className="p-4 space-y-3 text-sm text-white/80">
                  <motion.div
                    className="flex items-center gap-2"
                    whileHover={{ x: 5 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Protected by secure Stripe checkout</span>
                  </motion.div>
                  <motion.div
                    className="flex items-center gap-2"
                    whileHover={{ x: 5 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <Sparkles className="w-4 h-4 text-[#C4A572] flex-shrink-0" />
                    <span>Instant confirmation email with your booking code</span>
                  </motion.div>
                  <motion.div
                    className="flex items-center gap-2"
                    whileHover={{ x: 5 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <Clock3 className="w-4 h-4 text-blue-300 flex-shrink-0" />
                    <span>24/7 check-in flexibility — let us know your arrival window</span>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

// Main export with Suspense boundary
export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0B0C10] via-[#101119] to-[#0B0C10]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <Loader2 className="w-12 h-12 animate-spin text-[#C4A572] mx-auto mb-4" />
            <p className="text-white/70">Preparing your quantum booking experience...</p>
          </motion.div>
        </div>
      }
    >
      <BookingPageContent />
    </Suspense>
  );
}
