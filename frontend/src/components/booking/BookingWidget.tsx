'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, differenceInDays, addMonths, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Users,
  PawPrint,
  Info,
  Minus,
  Plus,
  CheckCircle2,
  Shield,
  Star,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Tag,
  Percent,
} from 'lucide-react';
import 'react-day-picker/dist/style.css';
import api from '@/lib/api';
import { parseISO, isWithinInterval } from 'date-fns';
import { toast } from 'sonner';

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  pricing: {
    baseRate: 189, // Default fallback if API fails
    cleaningShort: 25,
    cleaningLong: 35,
    petShort: 15,
    petLong: 25,
    cityTaxPerAdult: 4,
    cityTaxMaxNights: 5,
  },
  guests: {
    maxTotal: 5,
    maxInfants: 3,
  },
  stay: {
    minNights: 1,
    maxNights: 30,
  },
} as const;

// ============================================================================
// TYPES
// ============================================================================
interface GuestState {
  adults: number;
  children: number;
  infants: number;
}

interface PricingBreakdown {
  nights: number;
  accommodation: number;
  cleaning: number;
  pet: number;
  discount: number;
  discountPercent: number;
  subtotal: number;
  total: number;
  cityTax: number;
  cityTaxNights: number;
}

interface Promotion {
  code: string;
  percent: number;
  description: string;
}

// Promo codes are now fetched and validated from API in real-time

// ============================================================================
// HOOKS
// ============================================================================
function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

function useKeyboardNavigation(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Guest Counter with accessibility
function GuestCounter({
  label,
  description,
  value,
  min = 0,
  max = 10,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  const decrease = useCallback(() => onChange(Math.max(min, value - 1)), [onChange, min, value]);
  const increase = useCallback(() => onChange(Math.min(max, value + 1)), [onChange, max, value]);

  return (
    <div className="flex items-center justify-between py-4 group">
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <div className="flex items-center gap-4" role="group" aria-label={`${label} counter`}>
        <button
          type="button"
          onClick={decrease}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center
                     text-gray-600 transition-all duration-200 touch-manipulation
                     hover:border-[#C4A572] hover:text-[#C4A572] hover:bg-[#C4A572]/5
                     focus:outline-none focus:ring-2 focus:ring-[#C4A572] focus:ring-offset-2
                     disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-200
                     disabled:hover:text-gray-600 disabled:hover:bg-transparent
                     active:scale-95"
        >
          <Minus className="w-5 h-5" strokeWidth={2} />
        </button>
        <span
          className="w-8 text-center text-lg font-semibold text-gray-900 tabular-nums"
          aria-live="polite"
          aria-atomic="true"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={increase}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center
                     text-gray-600 transition-all duration-200 touch-manipulation
                     hover:border-[#C4A572] hover:text-[#C4A572] hover:bg-[#C4A572]/5
                     focus:outline-none focus:ring-2 focus:ring-[#C4A572] focus:ring-offset-2
                     disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-200
                     disabled:hover:text-gray-600 disabled:hover:bg-transparent
                     active:scale-95"
        >
          <Plus className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

// Compact Guest Counter for smaller panels
function GuestCounterCompact({
  label,
  description,
  value,
  min = 0,
  max = 10,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  const decrease = useCallback(() => onChange(Math.max(min, value - 1)), [onChange, min, value]);
  const increase = useCallback(() => onChange(Math.min(max, value + 1)), [onChange, max, value]);

  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900">{label}</span>
        <span className="text-xs text-gray-400">{description}</span>
      </div>
      <div className="flex items-center gap-2" role="group" aria-label={`${label} counter`}>
        <button
          type="button"
          onClick={decrease}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center
                     text-gray-500 transition-all duration-150 touch-manipulation
                     hover:border-[#C4A572] hover:text-[#C4A572]
                     focus:outline-none focus:ring-2 focus:ring-[#C4A572] focus:ring-offset-1
                     disabled:opacity-30 disabled:cursor-not-allowed
                     active:scale-95"
        >
          <Minus className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
        <span className="w-6 text-center text-sm font-semibold text-gray-900 tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={increase}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center
                     text-gray-500 transition-all duration-150 touch-manipulation
                     hover:border-[#C4A572] hover:text-[#C4A572]
                     focus:outline-none focus:ring-2 focus:ring-[#C4A572] focus:ring-offset-1
                     disabled:opacity-30 disabled:cursor-not-allowed
                     active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

// Price Breakdown Modal
function PriceModal({
  isOpen,
  onClose,
  pricing,
  guests,
  baseRate,
}: {
  isOpen: boolean;
  onClose: () => void;
  pricing: PricingBreakdown;
  guests: GuestState;
  baseRate: number;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  useClickOutside(modalRef, onClose);
  useKeyboardNavigation(isOpen, onClose);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="price-modal-title"
        >
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 id="price-modal-title" className="text-xl font-semibold text-gray-900">
                Price breakdown
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center
                           text-gray-500 transition-colors focus:outline-none focus:ring-2
                           focus:ring-[#C4A572] focus:ring-offset-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="flex justify-between text-base">
                <span className="text-gray-600">
                  €{baseRate} × {pricing.nights} nights
                </span>
                <span className="font-medium text-gray-900">€{pricing.accommodation}</span>
              </div>

              <div className="flex justify-between text-base">
                <span className="text-gray-600">Cleaning fee</span>
                <span className="font-medium text-gray-900">€{pricing.cleaning}</span>
              </div>

              {pricing.pet > 0 && (
                <div className="flex justify-between text-base">
                  <span className="text-gray-600">Pet fee</span>
                  <span className="font-medium text-gray-900">€{pricing.pet}</span>
                </div>
              )}

              {pricing.discount > 0 && (
                <>
                  <div className="h-px bg-gray-200 my-4" />
                  <div className="flex justify-between text-base">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">€{pricing.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-emerald-600 flex items-center gap-1">
                      <Percent className="w-4 h-4" />
                      Promo discount ({pricing.discountPercent}%)
                    </span>
                    <span className="font-medium text-emerald-600">-€{pricing.discount}</span>
                  </div>
                </>
              )}

              <div className="h-px bg-gray-200 my-4" />

              <div className="flex justify-between">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <div className="text-right">
                  {pricing.discount > 0 && (
                    <span className="text-sm text-gray-400 line-through mr-2">€{pricing.subtotal}</span>
                  )}
                  <span className="text-2xl font-bold text-gray-900">€{pricing.total}</span>
                </div>
              </div>

              {/* City Tax Info */}
              <div className="mt-4 p-4 bg-amber-50 rounded-2xl">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">City tax payable at property</p>
                    <p className="text-amber-700">
                      €{pricing.cityTax} ({pricing.cityTaxNights} nights × {guests.adults} adults × €{CONFIG.pricing.cityTaxPerAdult})
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
interface BlockedRange {
  start: string;
  end: string;
  type: 'booking' | 'blocked';
}

export default function BookingWidget() {
  // State
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState<GuestState>({ adults: 2, children: 0, infants: 0 });
  const [hasPet, setHasPet] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [baseRate, setBaseRate] = useState<number>(CONFIG.pricing.baseRate);
  const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([]);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);

  const today = startOfDay(new Date());

  // Fetch pricing from API
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await api.pricing.getSettings();
        const settings = response.data;
        if (settings.default_nightly_rate) {
          setBaseRate(Number(settings.default_nightly_rate));
        }
      } catch (error) {
        // Silently fall back to default rate
      } finally {
        setIsLoadingPricing(false);
      }
    };

    fetchPricing();
  }, []);

  // Fetch blocked dates from API
  useEffect(() => {
    const fetchBlockedDates = async () => {
      try {
        const response = await api.bookings.getBlockedDates();
        setBlockedRanges(response.data.blocked_ranges || []);
      } catch (error) {
        // Silently fall back to empty array
      } finally {
        setIsLoadingAvailability(false);
      }
    };

    fetchBlockedDates();
  }, []);

  // Computed values
  const nights = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 0;
    return differenceInDays(dateRange.to, dateRange.from);
  }, [dateRange]);

  const isValidBooking = nights > 0;

  const maxAdults = Math.max(1, CONFIG.guests.maxTotal - guests.children);
  const maxChildren = Math.max(0, CONFIG.guests.maxTotal - guests.adults);

  // Build a quick lookup set for blocked dates (start..end-1)
  const blockedDateSet = useMemo(() => {
    const set = new Set<string>();
    if (!Array.isArray(blockedRanges)) return set;

    blockedRanges.forEach((range) => {
      if (!range || !range.start || !range.end) return;

      try {
        const startDate = parseISO(range.start);
        const endDate = parseISO(range.end);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return;

        // Block nights from start to end-1 (checkout day is free for availability checks)
        const lastBlockedDate = new Date(endDate);
        lastBlockedDate.setDate(lastBlockedDate.getDate() - 1);

        let current = new Date(startDate);
        while (current <= lastBlockedDate) {
          set.add(format(startOfDay(current), 'yyyy-MM-dd'));
          current.setDate(current.getDate() + 1);
        }
      } catch {
        return;
      }
    });

    return set;
  }, [blockedRanges]);

  // Disable past dates and blocked nights, but allow picking a blocked date as the range end
  const disabledMatcher = useCallback((date: Date) => {
    const dayKey = format(startOfDay(date), 'yyyy-MM-dd');

    if (date < today) return true;

    const isBlocked = blockedDateSet.has(dayKey);
    if (!isBlocked) return false;

    // If selecting an end date and it falls on a blocked day, allow it;
    // availability check will still catch overlaps.
    if (dateRange?.from && !dateRange?.to && date > dateRange.from) {
      return false;
    }

    return true;
  }, [blockedDateSet, dateRange, today]);

  const rangeHasBlockedNights = useCallback((range: DateRange | undefined) => {
    if (!range?.from || !range?.to) return false;
    let cursor = startOfDay(range.from);
    const end = startOfDay(range.to);
    while (cursor < end) {
      if (blockedDateSet.has(format(cursor, 'yyyy-MM-dd'))) {
        return true;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return false;
  }, [blockedDateSet]);

  // Pricing calculation
  const pricing = useMemo((): PricingBreakdown | null => {
    if (!isValidBooking) return null;

    const accommodation = baseRate * nights;
    const cleaning = nights <= 2 ? CONFIG.pricing.cleaningShort : CONFIG.pricing.cleaningLong;
    const pet = hasPet ? (nights <= 2 ? CONFIG.pricing.petShort : CONFIG.pricing.petLong) : 0;
    const subtotal = accommodation + cleaning + pet;

    // Apply discount if promo code is valid
    const discountPercent = appliedPromo?.percent ?? 0;
    const discount = Math.round(subtotal * (discountPercent / 100));
    const total = subtotal - discount;

    const cityTaxNights = Math.min(nights, CONFIG.pricing.cityTaxMaxNights);
    const cityTax = guests.adults * CONFIG.pricing.cityTaxPerAdult * cityTaxNights;

    return { nights, accommodation, cleaning, pet, discount, discountPercent, subtotal, total, cityTax, cityTaxNights };
  }, [nights, hasPet, guests.adults, isValidBooking, appliedPromo, baseRate]);

  // Handlers
  const handleGuestChange = useCallback((type: keyof GuestState, value: number) => {
    setGuests(prev => {
      const next = { ...prev };

      if (type === 'infants') {
        next.infants = Math.max(0, Math.min(CONFIG.guests.maxInfants, value));
        return next;
      }

      // Clamp adults/children
      const minVal = type === 'adults' ? 1 : 0;
      next[type] = Math.max(minVal, Math.min(CONFIG.guests.maxTotal, value));

      const combined = next.adults + next.children;
      if (combined > CONFIG.guests.maxTotal) {
        // Reduce the changed type back within limit
        const allowable = CONFIG.guests.maxTotal - (type === 'adults' ? next.children : next.adults);
        next[type] = Math.max(minVal, allowable);
        toast.error('Maximum 5 guests total (adults + children).');
      }

      return next;
    });
  }, []);

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCalendarMonth(prev => addMonths(prev, direction === 'next' ? 1 : -1));
  }, []);

  // Promo code handlers
  const handleApplyPromo = useCallback(async () => {
    const code = promoCode.trim().toUpperCase();
    setPromoError(null);

    if (!code) {
      setPromoError('Please enter a promo code');
      return;
    }

    try {
      // Calculate booking amount for validation (if dates are selected)
      const bookingAmount = pricing ? pricing.subtotal : undefined;

      // Call API to validate promo code
      const response = await api.pricing.validatePromoCode(code, bookingAmount);

      if (response.data.valid) {
        // Convert API response to Promotion format
        const promo: Promotion = {
          code: response.data.code,
          percent: response.data.discount_value,
          description: response.data.description,
        };
        setAppliedPromo(promo);
        setPromoError(null);
      }
    } catch (error: any) {
      // Handle validation errors
      const message = error.response?.data?.message || 'Invalid promo code';
      setPromoError(message);
      setAppliedPromo(null);
    }
  }, [promoCode, pricing]);

  const handleRemovePromo = useCallback(() => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoError(null);
  }, []);

  // Build booking URL
  const bookingUrl = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return '#';
    if (rangeHasBlockedNights(dateRange)) return '#';
    const params = new URLSearchParams({
      checkIn: format(dateRange.from, 'yyyy-MM-dd'),
      checkOut: format(dateRange.to, 'yyyy-MM-dd'),
      adults: String(guests.adults),
      children: String(guests.children),
      infants: String(guests.infants),
      pet: String(hasPet),
      step: 'guest',
    });
    // Include promo code if applied
    if (appliedPromo) {
      params.set('promo', appliedPromo.code);
    }
    return `/book?${params.toString()}`;
  }, [dateRange, guests, hasPet, appliedPromo, rangeHasBlockedNights]);

  return (
    <>
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#1a1a2e] to-[#16213e]">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-gray-400">From</span>
              {appliedPromo ? (
                <>
                  <span className="text-lg text-gray-500 line-through">€{baseRate}</span>
                  <span className="text-3xl font-bold text-white">
                    €{Math.round(baseRate * (1 - appliedPromo.percent / 100))}
                  </span>
                </>
              ) : (
                <span className="text-3xl font-bold text-white">€{baseRate}</span>
              )}
              <span className="text-gray-400">/ night</span>
              {appliedPromo && (
                <span className="ml-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full">
                  -{appliedPromo.percent}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">Free cancel 24h before</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row">
          {/* Calendar Section */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-gray-100 overflow-hidden">
          {/* Calendar */}
          <DayPicker
            mode="range"
            selected={dateRange}
            onSelect={(range) => {
              if (rangeHasBlockedNights(range)) {
                toast.error('Those dates include an unavailable night. Please pick different dates.');
                return;
              }
              setDateRange(range);
            }}
            numberOfMonths={2}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            disabled={disabledMatcher}
            showOutsideDays={false}
              className="!font-sans [&_button]:!text-gray-900 [&_.rdp-day]:!text-gray-900"
              classNames={{
                months: 'grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full',
                month: 'space-y-3 sm:space-y-4',
                caption: 'flex justify-center relative items-center h-10',
                caption_label: 'text-base sm:text-lg font-semibold text-gray-900',
                nav: 'flex items-center gap-1',
                nav_button: `h-8 w-8 sm:h-10 sm:w-10 bg-transparent rounded-full inline-flex items-center justify-center
                             text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors
                             focus:outline-none focus:ring-2 focus:ring-[#C4A572] focus:ring-offset-2`,
                nav_button_previous: 'absolute left-0',
                nav_button_next: 'absolute right-0',
                table: 'w-full border-collapse',
                head_row: 'flex mb-1 sm:mb-2',
                head_cell: 'w-9 sm:w-10 md:w-12 h-8 sm:h-10 text-xs sm:text-sm font-medium text-gray-500 flex items-center justify-center',
                row: 'flex w-full',
                cell: `relative w-9 sm:w-10 md:w-12 h-9 sm:h-10 md:h-12 p-0 text-center focus-within:z-20
                       [&:has([aria-selected].day-range-start)]:rounded-l-full
                       [&:has([aria-selected].day-range-end)]:rounded-r-full
                       [&:has([aria-selected])]:bg-[#C4A572]/10`,
                day: `w-9 sm:w-10 md:w-12 h-9 sm:h-10 md:h-12 p-0 font-medium text-sm sm:text-base !text-gray-900 rounded-full transition-all duration-200
                      hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C4A572] focus:ring-inset
                      touch-manipulation`,
                day_selected: 'bg-[#C4A572] !text-white hover:bg-[#B39562] focus:bg-[#B39562]',
                day_today: 'bg-gray-100 font-semibold !text-gray-900',
                day_outside: '!text-gray-300 opacity-50',
                day_disabled: '!text-gray-300 cursor-not-allowed hover:bg-transparent',
                day_range_start: 'day-range-start rounded-full',
                day_range_end: 'day-range-end rounded-full',
                day_range_middle: 'rounded-none !text-gray-900',
              }}
              components={{
                IconLeft: () => <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />,
                IconRight: () => <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />,
              }}
            />
          </div>

          {/* Booking Details Section */}
          <div className="w-full lg:w-[360px] flex flex-col">
            {/* Selected Dates - Compact */}
            <AnimatePresence>
              {dateRange?.from && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-5 py-4 border-b border-gray-100"
                >
                  <div className="flex gap-3">
                    <div className="flex-1 p-3 bg-gray-50 rounded-xl">
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Check-in</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {format(dateRange.from, 'EEE, MMM d')}
                      </p>
                    </div>
                    {dateRange.to && (
                      <div className="flex-1 p-3 bg-gray-50 rounded-xl">
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Check-out</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {format(dateRange.to, 'EEE, MMM d')}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Guests - Compact */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#C4A572]" />
                  <h3 className="text-sm font-semibold text-gray-900">Guests</h3>
                </div>
                <span className="text-xs text-gray-400">Max {CONFIG.guests.maxTotal}</span>
              </div>

              <div className="divide-y divide-gray-50">
                <GuestCounterCompact
                  label="Adults"
                  description="13+"
                  value={guests.adults}
                  min={1}
                  max={maxAdults}
                  onChange={(v) => handleGuestChange('adults', v)}
                />
                <GuestCounterCompact
                  label="Children"
                  description="2-12"
                  value={guests.children}
                  max={maxChildren}
                  onChange={(v) => handleGuestChange('children', v)}
                />
                <GuestCounterCompact
                  label="Infants"
                  description="Free"
                  value={guests.infants}
                  max={CONFIG.guests.maxInfants}
                  onChange={(v) => handleGuestChange('infants', v)}
                />
              </div>

              {/* Pet Toggle - Modern Switch */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <PawPrint className="w-4 h-4 text-[#C4A572]" />
                  <span className="text-sm font-medium text-gray-900">Pet</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={hasPet}
                  onClick={() => setHasPet(!hasPet)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 touch-manipulation
                             focus:outline-none focus:ring-2 focus:ring-[#C4A572] focus:ring-offset-2
                             ${hasPet ? 'bg-[#C4A572]' : 'bg-gray-200'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm
                               transition-transform duration-200 ${hasPet ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            </div>

            {/* Promo Code Section */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-[#C4A572]" />
                <h3 className="text-sm font-semibold text-gray-900">Promo code</h3>
              </div>

              {appliedPromo ? (
                /* Applied Promo Display */
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-100 rounded-lg">
                        <Percent className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-900">{appliedPromo.code}</p>
                        <p className="text-xs text-emerald-700">{appliedPromo.description}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      aria-label="Remove promo code"
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors
                                 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Promo Code Input */
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                      placeholder="Enter code"
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg
                                 focus:outline-none focus:ring-2 focus:ring-[#C4A572] focus:border-transparent
                                 placeholder:text-gray-400 transition-all"
                      aria-label="Promo code input"
                      aria-describedby={promoError ? 'promo-error' : undefined}
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      disabled={!promoCode.trim()}
                      className="px-4 py-2 bg-[#C4A572] text-white text-sm font-medium rounded-lg
                                 hover:bg-[#B39562] transition-colors touch-manipulation
                                 focus:outline-none focus:ring-2 focus:ring-[#C4A572] focus:ring-offset-2
                                 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#C4A572]"
                    >
                      Apply
                    </button>
                  </div>
                  {promoError && (
                    <p id="promo-error" className="text-xs text-red-600 flex items-center gap-1">
                      <span className="inline-block w-1 h-1 bg-red-600 rounded-full" />
                      {promoError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Pricing - Compact */}
            <AnimatePresence>
              {pricing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-5 py-4 border-b border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-base font-bold text-gray-900">Total</span>
                      <span className="text-xs text-gray-400 ml-1">{pricing.nights} nights</span>
                    </div>
                    <div className="text-right">
                      {pricing.discount > 0 && (
                        <span className="text-xs text-gray-400 line-through mr-1">€{pricing.subtotal}</span>
                      )}
                      <span className="text-xl font-bold text-gray-900">€{pricing.total}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <button
                      type="button"
                      onClick={() => setShowPriceModal(true)}
                      className="text-xs text-[#C4A572] hover:text-[#B39562] font-medium underline underline-offset-2
                                 transition-colors focus:outline-none focus:ring-2 focus:ring-[#C4A572] focus:ring-offset-2 rounded"
                    >
                      View breakdown
                    </button>
                    <span className="text-xs text-amber-600">+ €{pricing.cityTax} city tax</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reserve Button - Compact */}
            <div className="px-5 py-4">
              <Link
                href={isValidBooking ? bookingUrl : '#'}
                onClick={(e) => !isValidBooking && e.preventDefault()}
                className={`block w-full py-3 rounded-xl font-semibold text-center text-base transition-all
                           focus:outline-none focus:ring-2 focus:ring-offset-2 touch-manipulation
                           ${isValidBooking
                             ? 'bg-gradient-to-r from-[#C4A572] to-[#B39562] text-white hover:shadow-lg hover:shadow-[#C4A572]/25 active:scale-[0.98] focus:ring-[#C4A572]'
                             : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                           }`}
                aria-disabled={!isValidBooking}
              >
                {isValidBooking ? `Reserve · €${pricing?.total}` : 'Select dates'}
              </Link>

              {/* Trust Badges - Compact */}
              <div className="flex justify-center gap-4 mt-3">
                {[
                  { icon: CheckCircle2, label: 'Free cancel', color: 'text-emerald-500' },
                  { icon: Shield, label: 'Secure', color: 'text-blue-500' },
                  { icon: Star, label: 'Best price', color: 'text-amber-500' },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex items-center gap-1 text-gray-400">
                    <Icon className={`w-3 h-3 ${color}`} />
                    <span className="text-[10px] font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Price Modal */}
      {pricing && (
        <PriceModal
          isOpen={showPriceModal}
          onClose={() => setShowPriceModal(false)}
          pricing={pricing}
          guests={guests}
          baseRate={baseRate}
        />
      )}
    </>
  );
}
