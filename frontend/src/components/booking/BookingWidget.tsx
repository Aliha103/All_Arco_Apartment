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

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  pricing: {
    baseRate: 189,
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

// Available promo codes (in production, this would come from API/database)
const PROMOTIONS: Record<string, Promotion> = {
  'WELCOME10': { code: 'WELCOME10', percent: 10, description: '10% off your first stay' },
  'EARLYBIRD': { code: 'EARLYBIRD', percent: 15, description: '15% early bird discount' },
  'LONGSTAY20': { code: 'LONGSTAY20', percent: 20, description: '20% off for 7+ nights' },
};

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

// Price Breakdown Modal
function PriceModal({
  isOpen,
  onClose,
  pricing,
  guests,
}: {
  isOpen: boolean;
  onClose: () => void;
  pricing: PricingBreakdown;
  guests: GuestState;
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
                  €{CONFIG.pricing.baseRate} × {pricing.nights} nights
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

  const today = startOfDay(new Date());

  // Computed values
  const nights = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 0;
    return differenceInDays(dateRange.to, dateRange.from);
  }, [dateRange]);

  const isValidBooking = nights > 0;

  const maxAdults = CONFIG.guests.maxTotal - guests.children;
  const maxChildren = CONFIG.guests.maxTotal - guests.adults;

  // Pricing calculation
  const pricing = useMemo((): PricingBreakdown | null => {
    if (!isValidBooking) return null;

    const accommodation = CONFIG.pricing.baseRate * nights;
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
  }, [nights, hasPet, guests.adults, isValidBooking, appliedPromo]);

  // Handlers
  const handleGuestChange = useCallback((type: keyof GuestState, value: number) => {
    setGuests(prev => {
      const next = { ...prev, [type]: value };
      // Enforce max total guests
      if (type === 'adults' && next.adults + next.children > CONFIG.guests.maxTotal) {
        next.children = CONFIG.guests.maxTotal - next.adults;
      }
      if (type === 'children' && next.adults + next.children > CONFIG.guests.maxTotal) {
        next.adults = CONFIG.guests.maxTotal - next.children;
      }
      return next;
    });
  }, []);

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCalendarMonth(prev => addMonths(prev, direction === 'next' ? 1 : -1));
  }, []);

  // Promo code handlers
  const handleApplyPromo = useCallback(() => {
    const code = promoCode.trim().toUpperCase();
    setPromoError(null);

    if (!code) {
      setPromoError('Please enter a promo code');
      return;
    }

    const promo = PROMOTIONS[code];
    if (promo) {
      // Check if LONGSTAY20 requires 7+ nights
      if (code === 'LONGSTAY20' && nights < 7) {
        setPromoError('This code requires 7+ nights stay');
        return;
      }
      setAppliedPromo(promo);
      setPromoError(null);
    } else {
      setPromoError('Invalid promo code');
      setAppliedPromo(null);
    }
  }, [promoCode, nights]);

  const handleRemovePromo = useCallback(() => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoError(null);
  }, []);

  // Build booking URL
  const bookingUrl = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return '#';
    const params = new URLSearchParams({
      checkIn: format(dateRange.from, 'yyyy-MM-dd'),
      checkOut: format(dateRange.to, 'yyyy-MM-dd'),
      adults: String(guests.adults),
      children: String(guests.children),
      infants: String(guests.infants),
      pet: String(hasPet),
    });
    // Include promo code if applied
    if (appliedPromo) {
      params.set('promo', appliedPromo.code);
    }
    return `/book?${params.toString()}`;
  }, [dateRange, guests, hasPet, appliedPromo]);

  return (
    <>
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#1a1a2e] to-[#16213e]">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-gray-400">From</span>
              <span className="text-3xl font-bold text-white">€{CONFIG.pricing.baseRate}</span>
              <span className="text-gray-400">/ night</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">Free cancellation</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row">
          {/* Calendar Section */}
          <div className="flex-1 p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-gray-100">
            {/* Calendar */}
            <DayPicker
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              disabled={[{ before: today }]}
              showOutsideDays={false}
              className="!font-sans"
              classNames={{
                months: 'flex flex-col sm:flex-row gap-8',
                month: 'space-y-4',
                caption: 'flex justify-center relative items-center h-10',
                caption_label: 'text-lg font-semibold text-gray-900',
                nav: 'flex items-center gap-1',
                nav_button: `h-10 w-10 bg-transparent rounded-full inline-flex items-center justify-center
                             text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors
                             focus:outline-none focus:ring-2 focus:ring-[#C4A572] focus:ring-offset-2`,
                nav_button_previous: 'absolute left-0',
                nav_button_next: 'absolute right-0',
                table: 'w-full border-collapse',
                head_row: 'flex mb-2',
                head_cell: 'w-12 h-10 text-sm font-medium text-gray-500 flex items-center justify-center',
                row: 'flex w-full',
                cell: `relative w-12 h-12 p-0 text-center focus-within:z-20
                       [&:has([aria-selected].day-range-start)]:rounded-l-full
                       [&:has([aria-selected].day-range-end)]:rounded-r-full
                       [&:has([aria-selected])]:bg-[#C4A572]/10`,
                day: `w-12 h-12 p-0 font-normal text-base rounded-full transition-all duration-200
                      hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C4A572] focus:ring-inset
                      touch-manipulation`,
                day_selected: 'bg-[#C4A572] text-white hover:bg-[#B39562] focus:bg-[#B39562]',
                day_today: 'bg-gray-100 font-semibold',
                day_outside: 'text-gray-300 opacity-50',
                day_disabled: 'text-gray-300 cursor-not-allowed hover:bg-transparent',
                day_range_start: 'day-range-start rounded-full',
                day_range_end: 'day-range-end rounded-full',
                day_range_middle: 'rounded-none',
              }}
              components={{
                IconLeft: () => <ChevronLeft className="w-5 h-5" />,
                IconRight: () => <ChevronRight className="w-5 h-5" />,
              }}
            />
          </div>

          {/* Booking Details Section */}
          <div className="w-full lg:w-[360px] flex flex-col">
            {/* Selected Dates */}
            <AnimatePresence>
              {dateRange?.from && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-6 border-b border-gray-100"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-[#C4A572]" />
                    <h3 className="font-semibold text-gray-900">Your stay</h3>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 p-4 bg-gray-50 rounded-2xl">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Check-in</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {format(dateRange.from, 'EEE, MMM d')}
                      </p>
                    </div>
                    {dateRange.to && (
                      <div className="flex-1 p-4 bg-gray-50 rounded-2xl">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Check-out</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {format(dateRange.to, 'EEE, MMM d')}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Guests */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#C4A572]" />
                  <h3 className="font-semibold text-gray-900">Guests</h3>
                </div>
                <span className="text-sm text-gray-400">Max {CONFIG.guests.maxTotal}</span>
              </div>

              <div className="divide-y divide-gray-100">
                <GuestCounter
                  label="Adults"
                  description="Age 13+"
                  value={guests.adults}
                  min={1}
                  max={maxAdults}
                  onChange={(v) => handleGuestChange('adults', v)}
                />
                <GuestCounter
                  label="Children"
                  description="Ages 2-12"
                  value={guests.children}
                  max={maxChildren}
                  onChange={(v) => handleGuestChange('children', v)}
                />
                <GuestCounter
                  label="Infants"
                  description="Under 2 (free)"
                  value={guests.infants}
                  max={CONFIG.guests.maxInfants}
                  onChange={(v) => handleGuestChange('infants', v)}
                />
              </div>

              {/* Pet Toggle */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <PawPrint className="w-5 h-5 text-[#C4A572]" />
                  <span className="font-medium text-gray-900">Traveling with pet?</span>
                </div>
                <div className="flex rounded-xl overflow-hidden border-2 border-gray-200" role="radiogroup">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!hasPet}
                    onClick={() => setHasPet(false)}
                    className={`px-5 py-2 text-sm font-semibold transition-all touch-manipulation
                               focus:outline-none focus:ring-2 focus:ring-[#C4A572] focus:ring-inset
                               ${!hasPet
                                 ? 'bg-[#C4A572] text-white'
                                 : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={hasPet}
                    onClick={() => setHasPet(true)}
                    className={`px-5 py-2 text-sm font-semibold transition-all border-l-2 border-gray-200 touch-manipulation
                               focus:outline-none focus:ring-2 focus:ring-[#C4A572] focus:ring-inset
                               ${hasPet
                                 ? 'bg-[#C4A572] text-white'
                                 : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <AnimatePresence>
              {pricing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-6 border-b border-gray-100"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xl font-bold text-gray-900">Total</span>
                      <span className="text-sm text-gray-500 ml-2">for {pricing.nights} nights</span>
                    </div>
                    <div className="text-right">
                      {pricing.discount > 0 && (
                        <span className="text-sm text-gray-400 line-through mr-2">€{pricing.subtotal}</span>
                      )}
                      <span className="text-2xl font-bold text-gray-900">€{pricing.total}</span>
                    </div>
                  </div>

                  {pricing.discount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-center gap-2 mb-3 text-emerald-600"
                    >
                      <Percent className="w-4 h-4" />
                      <span className="text-sm font-medium">You save €{pricing.discount} ({pricing.discountPercent}% off)</span>
                    </motion.div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowPriceModal(true)}
                    className="text-sm text-[#C4A572] hover:text-[#B39562] font-medium underline underline-offset-4
                               transition-colors focus:outline-none focus:ring-2 focus:ring-[#C4A572] focus:ring-offset-2 rounded"
                  >
                    View price breakdown
                  </button>

                  <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 rounded-xl">
                    <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700">
                      + €{pricing.cityTax} city tax at property
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reserve Button */}
            <div className="p-6">
              <Link
                href={isValidBooking ? bookingUrl : '#'}
                onClick={(e) => !isValidBooking && e.preventDefault()}
                className={`block w-full py-4 rounded-2xl font-semibold text-center text-lg transition-all
                           focus:outline-none focus:ring-2 focus:ring-offset-2 touch-manipulation
                           ${isValidBooking
                             ? 'bg-gradient-to-r from-[#C4A572] to-[#B39562] text-white hover:shadow-xl hover:shadow-[#C4A572]/25 active:scale-[0.98] focus:ring-[#C4A572]'
                             : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                           }`}
                aria-disabled={!isValidBooking}
              >
                {isValidBooking ? `Reserve · €${pricing?.total}` : 'Select dates to book'}
              </Link>

              {/* Trust Badges */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex justify-center gap-6">
                  {[
                    { icon: CheckCircle2, label: 'Free cancellation', color: 'text-emerald-500' },
                    { icon: Shield, label: 'Secure payment', color: 'text-blue-500' },
                    { icon: Star, label: 'Best price', color: 'text-amber-500' },
                  ].map(({ icon: Icon, label, color }) => (
                    <div key={label} className="flex items-center gap-1.5 text-gray-500">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className="text-xs font-medium">{label}</span>
                    </div>
                  ))}
                </div>
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
        />
      )}
    </>
  );
}
