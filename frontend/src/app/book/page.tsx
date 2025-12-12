'use client';

import { Suspense, useEffect, useMemo, useState, useCallback, useTransition, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Coins,
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
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { useAuthStore } from '@/stores/authStore';

type Step = 'plan' | 'guest';

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia',
  'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia',
  'Cameroon', 'Canada', 'Cape Verde', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
  'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador',
  'Estonia', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece',
  'Guatemala', 'Guinea', 'Guyana', 'Haiti', 'Honduras', 'Hong Kong', 'Hungary', 'Iceland', 'India', 'Indonesia',
  'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait',
  'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania',
  'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Mauritania', 'Mauritius', 'Mexico',
  'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nepal',
  'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Macedonia', 'Norway', 'Oman', 'Pakistan',
  'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania',
  'Russia', 'Rwanda', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia',
  'Slovenia', 'Somalia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sudan', 'Sweden', 'Switzerland',
  'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
  'Turkmenistan', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay',
  'Uzbekistan', 'Venezuela', 'Vietnam', 'Zambia', 'Zimbabwe'
];

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
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      ))}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex justify-between">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
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
      className="p-4 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-200"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-gray-900">
          <UserRound className="w-4 h-4" />
          <span className="capitalize font-semibold tracking-wide text-sm">{label}</span>
        </div>
        <Badge variant="outline" className="border-gray-200 text-gray-800 bg-gray-50 font-semibold">
          {value}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="border border-gray-200 text-gray-900 hover:bg-gray-50 hover:border-gray-300 rounded-full"
          onClick={handleDecrement}
          disabled={value <= min}
        >
          -
        </Button>
        <div className="w-16 text-center bg-gray-50 border border-gray-200 text-gray-900 font-semibold rounded-full py-2">
          {value}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="border border-gray-200 text-gray-900 hover:bg-gray-50 hover:border-gray-300 rounded-full"
          onClick={handleIncrement}
          disabled={value >= max}
        >
          +
        </Button>
      </div>
      {hint && (
        <p className="text-xs text-gray-500 mt-2 italic">{hint}</p>
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
    first_name: '',
    last_name: '',
    guest_email: '',
    guest_phone: '',
    country: '',
    special_requests: '',
  });
  const [guestDetailsEnabled, setGuestDetailsEnabled] = useState(false);
  const [guestDetails, setGuestDetails] = useState([{ first_name: '', last_name: '', birth_country: '', note: '' }]);
  const [cancellationOption, setCancellationOption] = useState<'flex' | 'nonref'>('flex');
  const [applyCredits, setApplyCredits] = useState(false);
  const [creditToUse, setCreditToUse] = useState(0);
  const { isAuthenticated } = useAuthStore();

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
    const adultsParam = searchParams.get('adults');
    const childrenParam = searchParams.get('children');
    const infantsParam = searchParams.get('infants');

    if (checkInParam) {
      setDates((prev) => ({ ...prev, checkIn: checkInParam }));
    }
    if (checkOutParam && (!checkInParam || !isAfter(parseISO(checkInParam), parseISO(checkOutParam)))) {
      setDates((prev) => ({ ...prev, checkOut: checkOutParam }));
    }

    // Update guest counts if any parameter is present in URL
    if (adultsParam !== null || childrenParam !== null || infantsParam !== null) {
      const adults = Number(adultsParam || '2');
      const children = Number(childrenParam || '0');
      const infants = Number(infantsParam || '0');

      setGuestCounts({
        adults: Math.max(1, adults),
        children: Math.max(0, children),
        infants: Math.max(0, infants),
      });
    }
  }, [searchParams]);

  // Allow deep link to guest step (from homepage reserve)
  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam === 'guest') {
      setStepState(['guest', 1]);
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

  const { data: creditData } = useQuery({
    queryKey: ['referrals', 'credits'],
    queryFn: async () => {
      const response = await api.referrals.getReferralCredits();
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

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

  const displayPricing = useMemo(() => {
    if (!correctedPricing) return null;
    const baseTotal = parseFloat(String(correctedPricing.total || 0)) || 0;
    const discount = cancellationOption === 'nonref' ? baseTotal * 0.1 : 0;
    const total_after_policy = baseTotal - discount;
    return { ...correctedPricing, discount, total_after_policy };
  }, [correctedPricing, cancellationOption]);

  const availableCredits = useMemo(() => {
    if (!creditData) return 0;
    const balance = creditData.available_balance ?? creditData.available_credits ?? 0;
    const parsed = typeof balance === 'number' ? balance : parseFloat(String(balance));
    return isNaN(parsed) ? 0 : parsed;
  }, [creditData]);

  const grossTotalAfterPolicy = useMemo(() => {
    if (!displayPricing) return 0;
    const val = parseFloat(String(displayPricing.total_after_policy || 0));
    return isNaN(val) ? 0 : val;
  }, [displayPricing]);

  const maxCreditUsable = useMemo(() => {
    if (!displayPricing) return 0;
    return Math.min(availableCredits, grossTotalAfterPolicy);
  }, [availableCredits, displayPricing, grossTotalAfterPolicy]);

  useEffect(() => {
    if (applyCredits) {
      setCreditToUse((prev) => {
        const safePrev = Number.isFinite(prev) ? prev : 0;
        const clamped = Math.min(maxCreditUsable, Math.max(0, safePrev));
        return isNaN(clamped) ? 0 : clamped;
      });
    }
  }, [applyCredits, maxCreditUsable]);

  useEffect(() => {
    if (!applyCredits && creditToUse !== 0) {
      setCreditToUse(0);
    }
  }, [applyCredits, creditToUse]);

  const appliedCredit = useMemo(() => {
    if (!applyCredits) return 0;
    const requested = Number.isFinite(creditToUse) ? creditToUse : 0;
    return Math.min(maxCreditUsable, Math.max(0, requested));
  }, [applyCredits, creditToUse, maxCreditUsable]);

  const totalAfterCredit = useMemo(() => {
    if (!displayPricing) return 0;
    return Math.max(grossTotalAfterPolicy - appliedCredit, 0);
  }, [displayPricing, grossTotalAfterPolicy, appliedCredit]);

  const creditEnabled = isAuthenticated && availableCredits > 0;

  const createBooking = useCreateBooking();
  const createCheckout = useCreateCheckoutSession();

  const setDateField = useCallback((field: 'checkIn' | 'checkOut', value: string) => {
    setDates((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setGuestCount = useCallback((key: keyof typeof guestCounts, value: number) => {
    setGuestCounts((prev) => {
      // Infants are unrestricted (cap reasonably)
      if (key === 'infants') {
        return { ...prev, infants: Math.max(0, Math.min(10, value)) };
      }

      const clamped = key === 'adults'
        ? Math.max(1, Math.min(5, value))
        : Math.max(0, Math.min(5, value));

      const next = { ...prev, [key]: clamped };
      const combined = next.adults + next.children;

      if (combined > 5) {
        toast.error('Maximum 5 guests total (adults + children).');
        return prev;
      }

      return next;
    });
  }, []);

  const handleContinueToGuest = useCallback(() => {
    if (!dates.checkIn || !dates.checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }
    if (checkingAvailability) {
      toast.message('Checking availability, please wait a moment');
      return;
    }
    if (!availability) {
      toast.error('Unable to verify availability. Please retry.');
      return;
    }
    if (availability.available === false) {
      toast.error('Selected dates are not available');
      return;
    }
    setStepState(['guest', 1]);
  }, [dates.checkIn, dates.checkOut, availability, checkingAvailability]);

  const handleBackToPlan = useCallback(() => {
    // send back to homepage calendar
    window.location.href = '/';
  }, []);

  const handleSubmitBooking = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic required fields guard (client-side)
    if (!guestInfo.first_name.trim() || !guestInfo.last_name.trim() || !guestInfo.guest_email.trim() || !guestInfo.guest_phone.trim() || !guestInfo.country.trim()) {
      toast.error('Please fill first name, last name, email, phone, and country.');
      return;
    }
    if (!displayPricing) {
      toast.error('Please select valid dates and guests to calculate price.');
      return;
    }

    const guestDetailsSummary = guestDetailsEnabled
      ? guestDetails
          .map(({ first_name, last_name, birth_country, note }) => {
            const first = first_name.trim();
            const last = last_name.trim();
            if (!first && !last) return '';
            const countryPart = birth_country ? `, ${birth_country}` : '';
            const notePart = note.trim() ? ` - ${note.trim()}` : '';
            return `${first} ${last}${countryPart}${notePart}`.trim();
          })
          .filter(Boolean)
          .join('; ')
      : '';

    const specialRequestsCombined = [guestInfo.special_requests.trim(), guestDetailsSummary ? `Guest details: ${guestDetailsSummary}` : '']
      .filter(Boolean)
      .join('\n');

    try {
      const bookingData = {
        check_in_date: dates.checkIn,
        check_out_date: dates.checkOut,
        number_of_guests: totalGuests,
        guest_name: `${guestInfo.first_name} ${guestInfo.last_name}`.trim(),
        guest_email: guestInfo.guest_email,
        guest_phone: guestInfo.guest_phone,
        guest_country: guestInfo.country,
        special_requests: specialRequestsCombined,
        cancellation_policy: cancellationOption === 'nonref' ? 'non_refundable' : 'flex_24h',
        guest_details: guestDetailsEnabled ? guestDetails.map((g) => ({
          first_name: g.first_name,
          last_name: g.last_name,
          birth_country: g.birth_country,
          note: g.note,
        })) : [],
        nightly_rate: parseFloat(String(displayPricing.nightly_rate || 0)) || 0,
        cleaning_fee: parseFloat(String(displayPricing.cleaning_fee || 0)) || 0,
        tourist_tax: parseFloat(String(displayPricing.tourist_tax || 0)) || 0,
        applied_credit: appliedCredit > 0 ? Number(appliedCredit.toFixed(2)) : 0,
      };

      const booking = await createBooking.mutateAsync(bookingData);

      if (!booking?.id) {
        toast.error('Booking was created without an ID. Please try again.');
        return;
      }

      const bookingAmountDue = parseFloat(String(booking.amount_due ?? 0)) || 0;
      if (bookingAmountDue <= 0.01) {
        toast.success('Booking created. No payment due.');
        router.push(`/booking/confirmation?booking_id=${booking.id}`);
        return;
      }

      try {
        const checkout = await createCheckout.mutateAsync(booking.id);

        if (checkout?.session_url) {
          window.location.href = checkout.session_url;
          return;
        }

        throw new Error('Checkout session could not be created');
      } catch (checkoutError) {
        try {
          if (booking?.id) {
            await api.bookings.delete(booking.id);
          }
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
  }, [dates, totalGuests, guestInfo, guestDetails, guestDetailsEnabled, displayPricing, appliedCredit, cancellationOption, router, createBooking, createCheckout]);

  const isProcessing = createBooking.isPending || createCheckout.isPending;

  const submitBooking = useCallback(() => {
    handleSubmitBooking({ preventDefault() {} } as any);
  }, [handleSubmitBooking]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#F8F7F4] to-white text-gray-900">
      {/* Navigation */}
      <SiteNav solid />

      <motion.div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 pt-28 sm:pt-32 pb-12 lg:pb-16 space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="flex flex-col gap-3" variants={itemVariants}>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[#C4A572]">
            <Sparkles className="w-4 h-4 animate-pulse" />
            2-Step Booking
          </div>
          <h1 className="text-3xl sm:text-4xl font-light text-gray-900 leading-tight">
            Book All’Arco in minutes.
          </h1>
        </motion.div>

        <div className="grid lg:grid-cols-[2fr_1fr] gap-6 lg:gap-8 items-start">
          {/* Booking Flow Card */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white border border-gray-200 shadow-xl overflow-hidden">
              <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-white to-[#fdf8ec]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-gray-900 text-xl flex items-center gap-2">
                      Step {step === 'plan' ? '01' : '02'}
                      {step === 'guest' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      {step === 'plan' ? 'Select your dates and party size' : 'Enter your contact information'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      <BadgeCheck className="w-4 h-4 mr-1" />
                      Secure Booking
                    </Badge>
                    <Badge variant="outline" className="border-gray-200 text-gray-700">
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
                          <Label htmlFor="checkIn" className="text-gray-800 font-medium">Check-in</Label>
                          <Input
                            id="checkIn"
                            type="date"
                            min={today}
                            value={dates.checkIn}
                            onChange={(e) => setDateField('checkIn', e.target.value)}
                            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent transition-all"
                          />
                        </motion.div>
                        <motion.div
                          className="space-y-2"
                          whileHover={{ scale: 1.01 }}
                          transition={{ type: 'spring', stiffness: 400 }}
                        >
                          <Label htmlFor="checkOut" className="text-gray-800 font-medium">Check-out</Label>
                          <Input
                            id="checkOut"
                            type="date"
                            min={dates.checkIn || today}
                            value={dates.checkOut}
                            onChange={(e) => setDateField('checkOut', e.target.value)}
                            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent transition-all"
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

                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          onClick={handleContinueToGuest}
                          disabled={!dates.checkIn || !dates.checkOut || availability?.available === false || checkingAvailability}
                          className="w-full bg-[#C4A572] text-black hover:bg-[#D8B77A] font-semibold shadow-lg disabled:opacity-50 transition-all"
                        >
                          Continue to Guest Details
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
                        <motion.div className="space-y-2" whileHover={{ scale: 1.01 }}>
                          <Label htmlFor="guest_first" className="text-gray-800 font-medium">First name</Label>
                          <Input
                            id="guest_first"
                            placeholder="Ada"
                            value={guestInfo.first_name}
                            onChange={(e) => setGuestInfo({ ...guestInfo, first_name: e.target.value })}
                            required
                            disabled={isProcessing}
                            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent transition-all"
                          />
                        </motion.div>
                        <motion.div className="space-y-2" whileHover={{ scale: 1.01 }}>
                          <Label htmlFor="guest_last" className="text-gray-800 font-medium">Last name</Label>
                          <Input
                            id="guest_last"
                            placeholder="Lovelace"
                            value={guestInfo.last_name}
                            onChange={(e) => setGuestInfo({ ...guestInfo, last_name: e.target.value })}
                            required
                            disabled={isProcessing}
                            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent transition-all"
                          />
                        </motion.div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <motion.div className="space-y-2" whileHover={{ scale: 1.01 }}>
                          <Label htmlFor="guest_country" className="text-gray-800 font-medium">Country</Label>
                          <select
                            id="guest_country"
                            value={guestInfo.country}
                            onChange={(e) => setGuestInfo({ ...guestInfo, country: e.target.value })}
                            required
                            disabled={isProcessing}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent"
                          >
                            <option value="">Select country</option>
                            {COUNTRIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </motion.div>
                        <motion.div className="space-y-2" whileHover={{ scale: 1.01 }}>
                          <Label htmlFor="guest_email" className="text-gray-800 font-medium">Email</Label>
                          <Input
                            id="guest_email"
                            type="email"
                            placeholder="you@example.com"
                            value={guestInfo.guest_email}
                            onChange={(e) => !isProcessing && setGuestInfo({ ...guestInfo, guest_email: e.target.value })}
                            required
                            disabled={isProcessing}
                            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent transition-all"
                          />
                        </motion.div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <motion.div className="space-y-2" whileHover={{ scale: 1.01 }}>
                          <Label htmlFor="guest_phone" className="text-gray-800 font-medium">Phone</Label>
                          <Input
                            id="guest_phone"
                            type="tel"
                            placeholder="+39 123 456 7890"
                            value={guestInfo.guest_phone}
                            onChange={(e) => !isProcessing && setGuestInfo({ ...guestInfo, guest_phone: e.target.value })}
                            required
                            disabled={isProcessing}
                            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent transition-all"
                          />
                        </motion.div>
                        <div className="space-y-2">
                          <Label className="text-gray-800 font-medium">Guests</Label>
                          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-800 font-medium">
                            {guestCounts.adults} adults, {guestCounts.children} children, {guestCounts.infants} infants
                          </div>
                        </div>
                      </div>

              <motion.div
                className="space-y-2"
                whileHover={{ scale: 1.01 }}
              >
                <Label htmlFor="special_requests" className="text-gray-800 font-medium">Special Requests (optional)</Label>
                <Textarea
                  id="special_requests"
                  placeholder="Late check-in, allergies, anniversary notes…"
                  value={guestInfo.special_requests}
                  onChange={(e) => !isProcessing && setGuestInfo({ ...guestInfo, special_requests: e.target.value })}
                  disabled={isProcessing}
                  className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-500 min-h-[120px] focus:ring-2 focus:ring-[#C4A572] focus:border-transparent transition-all"
                />
              </motion.div>

              <div className="space-y-4">
                <Label className="text-gray-800 font-medium">Cancellation preference</Label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCancellationOption('flex')}
                    className={`text-left p-4 rounded-xl border ${
                      cancellationOption === 'flex' ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white'
                    } transition`}
                  >
                    <div className="font-semibold text-gray-900">Flexible</div>
                    <p className="text-sm text-gray-700">Free cancel until 24h before check-in; after that, full stay is charged.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancellationOption('nonref')}
                    className={`text-left p-4 rounded-xl border ${
                      cancellationOption === 'nonref' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white'
                    } transition`}
                  >
                    <div className="font-semibold text-gray-900">Non-refundable (save 10%)</div>
                    <p className="text-sm text-gray-700">Pay now, no cancellations. 10% discount applied.</p>
                  </button>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-900 font-medium">Guest details (optional)</p>
                    <p className="text-sm text-gray-600">Add names/notes for each guest.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setGuestDetailsEnabled(!guestDetailsEnabled)}
                            className="text-sm font-semibold text-[#C4A572] hover:text-[#B39562] focus:outline-none"
                          >
                            {guestDetailsEnabled ? 'Hide' : 'Add'}
                          </button>
                        </div>
                        {guestDetailsEnabled && (
                          <div className="space-y-3">
                            {guestDetails.map((g, idx) => (
                              <div key={idx} className="grid sm:grid-cols-2 gap-3">
                                <Input
                                  placeholder="First name"
                                  value={g.first_name}
                                  onChange={(e) => {
                                    const next = [...guestDetails];
                                    next[idx].first_name = e.target.value;
                                    setGuestDetails(next);
                                  }}
                                  className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent transition-all"
                                  disabled={isProcessing}
                                />
                                <Input
                                  placeholder="Last name"
                                  value={g.last_name}
                                  onChange={(e) => {
                                    const next = [...guestDetails];
                                    next[idx].last_name = e.target.value;
                                    setGuestDetails(next);
                                  }}
                                  className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent transition-all"
                                  disabled={isProcessing}
                                />
                                <select
                                  value={g.birth_country}
                                  onChange={(e) => {
                                    const next = [...guestDetails];
                                    next[idx].birth_country = e.target.value;
                                    setGuestDetails(next);
                                  }}
                                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent"
                                  disabled={isProcessing}
                                >
                                  <option value="">Birth country</option>
                                  {COUNTRIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                                <Input
                                  placeholder="Notes (diet, access needs)"
                                  value={g.note}
                                  onChange={(e) => {
                                    const next = [...guestDetails];
                                    next[idx].note = e.target.value;
                                    setGuestDetails(next);
                                  }}
                                  className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent transition-all"
                                  disabled={isProcessing}
                                />
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => setGuestDetails([...guestDetails, { first_name: '', last_name: '', birth_country: '', note: '' }])}
                              className="text-sm font-semibold text-[#C4A572] hover:text-[#B39562] focus:outline-none"
                              disabled={isProcessing}
                            >
                              + Add another guest
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 sm:hidden">
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
                            className="w-full border-gray-200 text-gray-800 hover:bg-gray-50 transition-all"
                          >
                            Back to Dates
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
                                Processing...
                              </>
                            ) : (
                              'Proceed to Secure Payment'
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
            <Card className="bg-white border border-gray-200 shadow-xl">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-gray-900 flex items-center gap-2">
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
                  ) : displayPricing ? (
                    <motion.div
                      key="pricing"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="space-y-3 text-sm text-gray-800">
                        <div className="flex justify-between">
                          <span>{safeFormatCurrency(displayPricing.nightly_rate)} × {nights || 0} night{nights === 1 ? '' : 's'}</span>
                          <span className="text-gray-900 font-semibold">{safeFormatCurrency(displayPricing.accommodation_total)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cleaning fee</span>
                          <span className="text-gray-900 font-semibold">{safeFormatCurrency(displayPricing.cleaning_fee)}</span>
                        </div>
                        {parseFloat(displayPricing.extra_guest_fee || '0') > 0 && (
                          <div className="flex justify-between">
                            <span>Extra guest fee</span>
                            <span className="text-gray-900 font-semibold">{safeFormatCurrency(displayPricing.extra_guest_fee)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Tourist tax (pay at property)</span>
                          <span className="text-gray-900 font-semibold">{safeFormatCurrency(displayPricing.tourist_tax)}</span>
                        </div>
                        {displayPricing.discount > 0 && (
                          <div className="flex justify-between text-emerald-700">
                            <span>Non-refundable discount</span>
                            <span>-{safeFormatCurrency(displayPricing.discount)}</span>
                          </div>
                        )}
                        {appliedCredit > 0 && (
                          <div className="flex justify-between text-emerald-700">
                            <span>Credits applied</span>
                            <span>-{safeFormatCurrency(appliedCredit)}</span>
                          </div>
                        )}
                      </div>

                      {isAuthenticated ? (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Coins className="w-4 h-4 text-amber-700" />
                              <div>
                                <p className="text-sm font-semibold text-amber-900">Credits available</p>
                                <p className="text-xs text-amber-800">{safeFormatCurrency(availableCredits)}</p>
                              </div>
                            </div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                              <input
                                type="checkbox"
                                className="w-4 h-4 accent-[#C4A572]"
                                checked={applyCredits && creditEnabled}
                                disabled={!creditEnabled || isProcessing}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setApplyCredits(checked && creditEnabled);
                                  if (checked && creditEnabled) {
                                    setCreditToUse(maxCreditUsable);
                                  }
                                }}
                              />
                              Apply
                            </label>
                          </div>
                          {creditEnabled ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={0}
                                max={maxCreditUsable}
                                step="1"
                                value={creditToUse}
                                disabled={!applyCredits || isProcessing}
                                onChange={(e) => {
                                  const raw = parseFloat(e.target.value);
                                  const safeValue = isNaN(raw) ? 0 : raw;
                                  const clamped = Math.min(maxCreditUsable, Math.max(0, safeValue));
                                  setCreditToUse(clamped);
                                  if (clamped > 0 && !applyCredits) {
                                    setApplyCredits(true);
                                  }
                                }}
                                className="bg-white border-gray-200 text-gray-900"
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={!applyCredits || isProcessing || maxCreditUsable <= 0}
                                onClick={() => {
                                  setApplyCredits(true);
                                  setCreditToUse(maxCreditUsable);
                                }}
                                className="text-sm font-semibold bg-white border border-amber-300 text-amber-900 hover:bg-amber-100"
                              >
                                Use max
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs text-amber-800">No credits available yet.</p>
                          )}
                          <p className="text-xs text-amber-700">Credits reduce what you pay today. Any remaining balance goes to Stripe checkout.</p>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 flex items-center gap-2">
                          <Coins className="w-4 h-4 text-gray-600" />
                          <span>Log in to apply your credits at checkout.</span>
                        </div>
                      )}
                      <motion.div
                        className="border-t border-gray-200 pt-4 mt-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="flex justify-between text-lg font-semibold text-gray-900">
                          <span>Total</span>
                          <span>{safeFormatCurrency(totalAfterCredit)}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Charged securely when you confirm. City tax is paid at the property.
                        </p>
                      </motion.div>

                      <div className="hidden sm:flex gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleBackToPlan}
                          disabled={isProcessing}
                          className="w-1/2 border-gray-200 text-gray-800 hover:bg-gray-50 transition-all justify-center"
                        >
                          Back to Dates
                        </Button>
                        <Button
                          type="button"
                          disabled={isProcessing}
                          className="w-1/2 bg-[#C4A572] text-black hover:bg-[#D8B77A] font-semibold shadow-lg disabled:opacity-50 transition-all justify-center text-center whitespace-normal"
                          onClick={submitBooking}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            'Proceed to Secure Payment'
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="rounded-lg border border-dashed border-gray-200 p-4 text-gray-600 text-sm text-center"
                    >
                      Select your dates and party size to view pricing details.
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
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-4 space-y-3 text-sm text-gray-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Secure payment processing via Stripe</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#C4A572] flex-shrink-0" />
                    <span>Instant confirmation with booking reference</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock3 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span>Responsive host team for pre-arrival questions</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Footer */}
      <SiteFooter />
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
            <p className="text-white/70">Preparing your booking experience...</p>
          </motion.div>
        </div>
      }
    >
      <BookingPageContent />
    </Suspense>
  );
}
