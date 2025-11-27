'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import {
  format,
  differenceInDays,
  startOfDay,
  addMonths,
} from 'date-fns';
import {
  Users,
  Minus,
  Plus,
  Info,
  CheckCircle,
  PawPrint,
  Baby,
  User,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Building2,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import Link from 'next/link';

// Pricing configuration
const PRICING = {
  baseNightlyRate: 189, // EUR per night
  serviceFeePercent: 0.12, // 12% service fee
  maxGuestsCountable: 5, // adults + children max
  minNights: 2,
  maxNights: 30,
  // Cleaning fees
  cleaningFeeShort: 25, // <= 2 nights
  cleaningFeeLong: 35, // > 2 nights
  // Pet fees
  petFeeShort: 15, // <= 2 nights
  petFeeLong: 25, // > 2 nights
  // City tax (pay at property)
  cityTaxPerAdult: 4, // per night
  cityTaxMaxNights: 5, // max nights taxed
};

// Luxury easing for smooth animations
const luxuryEase = [0.43, 0.13, 0.23, 0.96] as const;

// Type definitions
interface GuestCount {
  adults: number;
  children: number;
  infants: number;
}

interface PriceBreakdown {
  nightlyRate: number;
  nights: number;
  subtotal: number;
  cleaningFee: number;
  petFee: number;
  serviceFee: number;
  total: number;
  cityTax: number; // Shown separately (pay at property)
}

// Premium Calendar Component - Always visible, 2 months
function PremiumCalendar({
  selected,
  onSelect,
  disabledDays,
}: {
  selected: DateRange | undefined;
  onSelect: (range: DateRange | undefined) => void;
  disabledDays?: Date[];
}) {
  const today = startOfDay(new Date());
  const [currentMonth, setCurrentMonth] = useState(today);

  return (
    <div className="w-full">
      <DayPicker
        mode="range"
        selected={selected}
        onSelect={onSelect}
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        numberOfMonths={2}
        showOutsideDays={false}
        disabled={[
          { before: today },
          ...(disabledDays || []),
        ]}
        modifiersClassNames={{
          selected: 'rdp-day_selected',
          today: 'rdp-day_today',
          range_start: 'rdp-day_range_start',
          range_end: 'rdp-day_range_end',
          range_middle: 'rdp-day_range_middle',
        }}
        classNames={{
          months: 'flex flex-col sm:flex-row gap-6 sm:gap-8 justify-center',
          month: 'space-y-4',
          caption: 'flex justify-center pt-1 relative items-center h-10',
          caption_label: 'text-base font-semibold text-gray-900',
          nav: 'space-x-1 flex items-center',
          nav_button: cn(
            'h-9 w-9 bg-transparent p-0 opacity-70 hover:opacity-100',
            'inline-flex items-center justify-center rounded-full',
            'hover:bg-[#C4A572]/10 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-[#C4A572]/30'
          ),
          nav_button_previous: 'absolute left-1',
          nav_button_next: 'absolute right-1',
          table: 'w-full border-collapse space-y-1',
          head_row: 'flex',
          head_cell: cn(
            'text-gray-500 rounded-md w-11 sm:w-12 font-semibold text-[0.7rem]',
            'uppercase tracking-wider text-center'
          ),
          row: 'flex w-full mt-1',
          cell: cn(
            'relative h-11 w-11 sm:h-12 sm:w-12 text-center text-sm p-0',
            'focus-within:relative focus-within:z-20',
            '[&:has([aria-selected])]:bg-[#C4A572]/10',
            '[&:has([aria-selected].rdp-day_range_start)]:rounded-l-full',
            '[&:has([aria-selected].rdp-day_range_end)]:rounded-r-full',
            'first:[&:has([aria-selected])]:rounded-l-full',
            'last:[&:has([aria-selected])]:rounded-r-full'
          ),
          day: cn(
            'h-11 w-11 sm:h-12 sm:w-12 p-0 font-normal rounded-full',
            'hover:bg-gray-100 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-[#C4A572] focus:ring-offset-1',
            'aria-selected:opacity-100 cursor-pointer'
          ),
          day_range_start: cn(
            'rdp-day_range_start !bg-[#C4A572] !text-white',
            'hover:!bg-[#B39562] rounded-full font-semibold'
          ),
          day_range_end: cn(
            'rdp-day_range_end !bg-[#C4A572] !text-white',
            'hover:!bg-[#B39562] rounded-full font-semibold'
          ),
          day_selected: '!bg-[#C4A572] !text-white hover:!bg-[#B39562] font-semibold',
          day_today: 'bg-gray-100 text-gray-900 font-bold ring-1 ring-gray-300',
          day_outside: 'text-gray-300 opacity-50',
          day_disabled: 'text-gray-300 opacity-40 cursor-not-allowed hover:bg-transparent',
          day_range_middle: 'aria-selected:!bg-[#C4A572]/10 aria-selected:!text-gray-900 !rounded-none',
          day_hidden: 'invisible',
        }}
        components={{
          IconLeft: () => <ChevronLeft className="h-5 w-5 text-gray-600" />,
          IconRight: () => <ChevronRight className="h-5 w-5 text-gray-600" />,
        }}
      />

      {/* Clear dates button */}
      {selected?.from && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mt-4"
        >
          <button
            type="button"
            onClick={() => onSelect(undefined)}
            className="text-sm text-gray-500 hover:text-[#C4A572] underline underline-offset-2 transition-colors"
          >
            Clear dates
          </button>
        </motion.div>
      )}
    </div>
  );
}

// Guest Counter Row Component
function GuestCounterRow({
  icon: Icon,
  label,
  description,
  value,
  onDecrease,
  onIncrease,
  minValue = 0,
  disabled = false,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  minValue?: number;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#C4A572]/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#C4A572]" />
        </div>
        <div>
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <motion.button
          type="button"
          onClick={onDecrease}
          disabled={value <= minValue}
          whileTap={{ scale: 0.9 }}
          className={cn(
            'h-9 w-9 rounded-full border-2 flex items-center justify-center transition-all duration-200',
            value <= minValue
              ? 'border-gray-200 text-gray-300 cursor-not-allowed'
              : 'border-gray-300 text-gray-600 hover:border-[#C4A572] hover:text-[#C4A572]'
          )}
          aria-label={`Decrease ${label}`}
        >
          <Minus className="h-4 w-4" />
        </motion.button>
        <span className="w-8 text-center font-semibold text-lg text-gray-900">{value}</span>
        <motion.button
          type="button"
          onClick={onIncrease}
          disabled={disabled}
          whileTap={{ scale: 0.9 }}
          className={cn(
            'h-9 w-9 rounded-full border-2 flex items-center justify-center transition-all duration-200',
            disabled
              ? 'border-gray-200 text-gray-300 cursor-not-allowed'
              : 'border-gray-300 text-gray-600 hover:border-[#C4A572] hover:text-[#C4A572]'
          )}
          aria-label={`Increase ${label}`}
        >
          <Plus className="h-4 w-4" />
        </motion.button>
      </div>
    </div>
  );
}

// Pet Toggle Component
function PetToggle({
  hasPet,
  onChange,
}: {
  hasPet: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-t border-gray-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#C4A572]/10 flex items-center justify-center">
          <PawPrint className="w-5 h-5 text-[#C4A572]" />
        </div>
        <div>
          <p className="font-medium text-gray-900">Bringing a pet?</p>
          <p className="text-sm text-gray-500">Pet cleaning fee applies</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <motion.button
          type="button"
          onClick={() => onChange(false)}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
            !hasPet
              ? 'bg-[#C4A572] text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          No
        </motion.button>
        <motion.button
          type="button"
          onClick={() => onChange(true)}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
            hasPet
              ? 'bg-[#C4A572] text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          Yes
        </motion.button>
      </div>
    </div>
  );
}

// Price Breakdown Component - Enhanced
function PriceBreakdownDisplay({
  breakdown,
  hasPet,
}: {
  breakdown: PriceBreakdown;
  hasPet: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: luxuryEase }}
      className="space-y-3"
    >
      {/* Accommodation */}
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">
          {formatCurrency(breakdown.nightlyRate)} × {breakdown.nights} night{breakdown.nights !== 1 ? 's' : ''}
        </span>
        <span className="text-gray-900 font-medium">{formatCurrency(breakdown.subtotal)}</span>
      </div>

      {/* Cleaning fee */}
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 flex items-center gap-1">
          Cleaning fee
          <span className="text-xs text-gray-400">
            ({breakdown.nights <= 2 ? '≤2 nights' : '>2 nights'})
          </span>
        </span>
        <span className="text-gray-900 font-medium">{formatCurrency(breakdown.cleaningFee)}</span>
      </div>

      {/* Pet fee (if applicable) */}
      {hasPet && breakdown.petFee > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex justify-between text-sm"
        >
          <span className="text-gray-600 flex items-center gap-1">
            <PawPrint className="h-3.5 w-3.5" />
            Pet cleaning fee
          </span>
          <span className="text-gray-900 font-medium">{formatCurrency(breakdown.petFee)}</span>
        </motion.div>
      )}

      {/* Service fee */}
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 flex items-center gap-1">
          Service fee
          <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
        </span>
        <span className="text-gray-900 font-medium">{formatCurrency(breakdown.serviceFee)}</span>
      </div>

      {/* Total */}
      <div className="flex justify-between font-bold text-lg pt-4 border-t border-gray-200">
        <span className="text-gray-900">Total</span>
        <span className="text-gray-900">{formatCurrency(breakdown.total)}</span>
      </div>

      {/* City Tax Notice */}
      {breakdown.cityTax > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100 mt-3"
        >
          <Building2 className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-700">
            <p className="font-semibold">City Tax: {formatCurrency(breakdown.cityTax)}</p>
            <p className="mt-0.5">
              €{PRICING.cityTaxPerAdult}/adult/night (max {PRICING.cityTaxMaxNights} nights) · Pay at property
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// Main Booking Widget Component
export default function BookingWidget() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState<GuestCount>({ adults: 2, children: 0, infants: 0 });
  const [hasPet, setHasPet] = useState(false);

  // Calculate nights
  const nights = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 0;
    return differenceInDays(dateRange.to, dateRange.from);
  }, [dateRange]);

  // Total countable guests (adults + children, infants don't count)
  const totalCountableGuests = guests.adults + guests.children;

  // Calculate price breakdown
  const priceBreakdown = useMemo<PriceBreakdown | null>(() => {
    if (!dateRange?.from || !dateRange?.to) return null;
    if (nights < PRICING.minNights) return null;

    const subtotal = PRICING.baseNightlyRate * nights;

    // Cleaning fee based on nights
    const cleaningFee = nights <= 2 ? PRICING.cleaningFeeShort : PRICING.cleaningFeeLong;

    // Pet fee if applicable
    const petFee = hasPet ? (nights <= 2 ? PRICING.petFeeShort : PRICING.petFeeLong) : 0;

    // Service fee
    const serviceFee = Math.round(subtotal * PRICING.serviceFeePercent);

    // Total (excluding city tax which is paid at property)
    const total = subtotal + cleaningFee + petFee + serviceFee;

    // City tax calculation (pay at property)
    const taxableNights = Math.min(nights, PRICING.cityTaxMaxNights);
    const cityTax = guests.adults * PRICING.cityTaxPerAdult * taxableNights;

    return {
      nightlyRate: PRICING.baseNightlyRate,
      nights,
      subtotal,
      cleaningFee,
      petFee,
      serviceFee,
      total,
      cityTax,
    };
  }, [dateRange, nights, hasPet, guests.adults]);

  // Can book validation
  const canBook = priceBreakdown && nights >= PRICING.minNights;

  // Guest update handlers
  const updateGuests = (type: keyof GuestCount, delta: number) => {
    const newValue = guests[type] + delta;
    if (newValue < 0) return;
    if (type === 'adults' && newValue < 1) return; // At least 1 adult

    // Check max guests (adults + children only)
    if (type !== 'infants') {
      const newTotal = (type === 'adults' ? newValue : guests.adults) +
                       (type === 'children' ? newValue : guests.children);
      if (newTotal > PRICING.maxGuestsCountable) return;
    }

    setGuests({ ...guests, [type]: newValue });
  };

  // Format date range for display
  const formatDateRange = () => {
    if (!dateRange?.from) return 'Select your dates';
    if (!dateRange?.to) return format(dateRange.from, 'EEE, MMM d');
    return `${format(dateRange.from, 'EEE, MMM d')} → ${format(dateRange.to, 'EEE, MMM d')}`;
  };

  // Build booking URL with all parameters
  const bookingUrl = useMemo(() => {
    if (!canBook || !dateRange?.from || !dateRange?.to) return '#';
    const params = new URLSearchParams({
      checkin: dateRange.from.toISOString(),
      checkout: dateRange.to.toISOString(),
      adults: guests.adults.toString(),
      children: guests.children.toString(),
      infants: guests.infants.toString(),
      pet: hasPet ? '1' : '0',
    });
    return `/book?${params.toString()}`;
  }, [canBook, dateRange, guests, hasPet]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: luxuryEase }}
        className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
      >
        {/* Header with price */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500 font-medium mb-1">From</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-bold text-gray-900">
                  {formatCurrency(PRICING.baseNightlyRate)}
                </span>
                <span className="text-gray-500 text-lg">/ night</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Free cancellation up to 48h before check-in</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
          {/* Left: Calendar (Always Visible) */}
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Select Dates</h3>
              {nights > 0 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-3 py-1 bg-[#C4A572] text-white text-sm font-semibold rounded-full"
                >
                  {nights} night{nights !== 1 ? 's' : ''}
                </motion.span>
              )}
            </div>

            <PremiumCalendar
              selected={dateRange}
              onSelect={setDateRange}
            />

            {/* Selected dates display */}
            <AnimatePresence>
              {dateRange?.from && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-6 p-4 bg-[#C4A572]/5 rounded-xl border border-[#C4A572]/20"
                >
                  <p className="text-sm text-gray-600 mb-1">Your stay</p>
                  <p className="text-lg font-semibold text-gray-900">{formatDateRange()}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Minimum nights notice */}
            {nights > 0 && nights < PRICING.minNights && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-sm text-amber-600 flex items-center gap-2"
              >
                <Info className="h-4 w-4" />
                Minimum stay is {PRICING.minNights} nights
              </motion.p>
            )}
          </div>

          {/* Right: Guests, Pet & Price */}
          <div className="p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Guests & Options</h3>

            {/* Guest Selectors */}
            <div className="divide-y divide-gray-100">
              <GuestCounterRow
                icon={User}
                label="Adults"
                description="Age 13+"
                value={guests.adults}
                onDecrease={() => updateGuests('adults', -1)}
                onIncrease={() => updateGuests('adults', 1)}
                minValue={1}
                disabled={totalCountableGuests >= PRICING.maxGuestsCountable}
              />
              <GuestCounterRow
                icon={UserPlus}
                label="Children"
                description="Ages 2-12"
                value={guests.children}
                onDecrease={() => updateGuests('children', -1)}
                onIncrease={() => updateGuests('children', 1)}
                disabled={totalCountableGuests >= PRICING.maxGuestsCountable}
              />
              <GuestCounterRow
                icon={Baby}
                label="Infants"
                description="Under 2 (free)"
                value={guests.infants}
                onDecrease={() => updateGuests('infants', -1)}
                onIncrease={() => updateGuests('infants', 1)}
              />
              <PetToggle hasPet={hasPet} onChange={setHasPet} />
            </div>

            {/* Guest limit notice */}
            <p className="text-xs text-gray-500 mt-4 pb-4 border-b border-gray-100">
              Maximum {PRICING.maxGuestsCountable} guests (adults + children). Infants stay free.
            </p>

            {/* Price Breakdown */}
            <div className="mt-6">
              <AnimatePresence mode="wait">
                {priceBreakdown ? (
                  <PriceBreakdownDisplay breakdown={priceBreakdown} hasPet={hasPet} />
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-8 text-gray-500"
                  >
                    <CreditCard className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Select dates to see pricing</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Book Button */}
            <motion.div className="mt-6">
              <Link
                href={bookingUrl}
                onClick={(e) => !canBook && e.preventDefault()}
                className={cn(
                  'flex items-center justify-center gap-2 w-full py-4 px-6 rounded-xl',
                  'font-bold text-lg transition-all duration-300',
                  canBook
                    ? 'bg-[#C4A572] text-white hover:bg-[#B39562] hover:shadow-xl active:scale-[0.98] cursor-pointer'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                {canBook ? (
                  <>
                    Reserve Now
                    <span className="text-white/80 font-normal">·</span>
                    <span className="font-normal">{formatCurrency(priceBreakdown?.total || 0)}</span>
                  </>
                ) : nights > 0 && nights < PRICING.minNights ? (
                  `Minimum ${PRICING.minNights} nights required`
                ) : (
                  'Select dates to continue'
                )}
              </Link>
            </motion.div>

            {/* Trust indicators */}
            <p className="text-center text-sm text-gray-500 mt-4">
              You won&apos;t be charged yet
            </p>
          </div>
        </div>
      </motion.div>

      {/* Bottom trust badge */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="flex items-center justify-center gap-2 mt-6 text-sm text-gray-500"
      >
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span>Best price guarantee when booking directly</span>
      </motion.div>
    </div>
  );
}
