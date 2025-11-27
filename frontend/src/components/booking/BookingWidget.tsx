'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DayPicker, DateRange } from 'react-day-picker';
import {
  format,
  differenceInDays,
  addDays,
  isBefore,
  isAfter,
  startOfDay,
} from 'date-fns';
import {
  Calendar as CalendarIcon,
  Users,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Pricing configuration (can be fetched from API in production)
const PRICING = {
  baseNightlyRate: 189, // EUR per night
  cleaningFee: 75,
  serviceFeePercent: 0.12, // 12% service fee
  maxGuests: 5,
  minNights: 2,
  maxNights: 30,
};

// Type definitions
interface GuestCount {
  adults: number;
  children: number;
}

interface PriceBreakdown {
  nightlyRate: number;
  nights: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  total: number;
}

// Custom Calendar Component with hospitality styling
function BookingCalendar({
  selected,
  onSelect,
  disabledDays,
  numberOfMonths = 2,
}: {
  selected: DateRange | undefined;
  onSelect: (range: DateRange | undefined) => void;
  disabledDays?: Date[];
  numberOfMonths?: number;
}) {
  const today = startOfDay(new Date());

  return (
    <DayPicker
      mode="range"
      selected={selected}
      onSelect={onSelect}
      numberOfMonths={numberOfMonths}
      showOutsideDays={false}
      disabled={[
        { before: today },
        ...(disabledDays || []),
      ]}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center h-10',
        caption_label: 'text-sm font-semibold text-gray-900',
        nav: 'space-x-1 flex items-center',
        nav_button:
          'h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 inline-flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors',
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse',
        head_row: 'flex',
        head_cell:
          'text-gray-500 rounded-md w-10 font-medium text-[0.75rem] uppercase tracking-wide',
        row: 'flex w-full mt-1',
        cell: cn(
          'relative h-10 w-10 text-center text-sm p-0',
          'focus-within:relative focus-within:z-20',
          '[&:has([aria-selected])]:bg-[#C4A572]/10',
          '[&:has([aria-selected].day-range-start)]:rounded-l-full',
          '[&:has([aria-selected].day-range-end)]:rounded-r-full',
          'first:[&:has([aria-selected])]:rounded-l-full',
          'last:[&:has([aria-selected])]:rounded-r-full'
        ),
        day: cn(
          'h-10 w-10 p-0 font-normal rounded-full',
          'hover:bg-gray-100 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-[#C4A572] focus:ring-offset-1',
          'aria-selected:opacity-100'
        ),
        day_range_start: 'day-range-start bg-[#C4A572] text-white hover:bg-[#B39562] rounded-full',
        day_range_end: 'day-range-end bg-[#C4A572] text-white hover:bg-[#B39562] rounded-full',
        day_selected: 'bg-[#C4A572] text-white hover:bg-[#B39562]',
        day_today: 'bg-gray-100 text-gray-900 font-semibold',
        day_outside: 'text-gray-300 opacity-50',
        day_disabled: 'text-gray-300 opacity-50 cursor-not-allowed hover:bg-transparent',
        day_range_middle: 'aria-selected:bg-[#C4A572]/10 aria-selected:text-gray-900 rounded-none',
        day_hidden: 'invisible',
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-5 w-5" />,
        IconRight: () => <ChevronRight className="h-5 w-5" />,
      }}
    />
  );
}

// Guest Selector Component
function GuestSelector({
  guests,
  onChange,
  maxGuests,
}: {
  guests: GuestCount;
  onChange: (guests: GuestCount) => void;
  maxGuests: number;
}) {
  const totalGuests = guests.adults + guests.children;

  const updateGuests = (type: 'adults' | 'children', delta: number) => {
    const newValue = guests[type] + delta;
    if (type === 'adults' && newValue < 1) return; // At least 1 adult
    if (newValue < 0) return;
    if (totalGuests + delta > maxGuests) return;
    onChange({ ...guests, [type]: newValue });
  };

  return (
    <div className="space-y-4">
      {/* Adults */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">Adults</p>
          <p className="text-sm text-gray-500">Age 13+</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => updateGuests('adults', -1)}
            disabled={guests.adults <= 1}
            className="h-8 w-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Decrease adults"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-6 text-center font-medium">{guests.adults}</span>
          <button
            type="button"
            onClick={() => updateGuests('adults', 1)}
            disabled={totalGuests >= maxGuests}
            className="h-8 w-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Increase adults"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Children */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">Children</p>
          <p className="text-sm text-gray-500">Ages 2-12</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => updateGuests('children', -1)}
            disabled={guests.children <= 0}
            className="h-8 w-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Decrease children"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-6 text-center font-medium">{guests.children}</span>
          <button
            type="button"
            onClick={() => updateGuests('children', 1)}
            disabled={totalGuests >= maxGuests}
            className="h-8 w-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Increase children"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 pt-2 border-t">
        Maximum {maxGuests} guests. Infants under 2 stay free.
      </p>
    </div>
  );
}

// Price Breakdown Component
function PriceBreakdownDisplay({ breakdown }: { breakdown: PriceBreakdown }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-3 pt-4 border-t"
    >
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">
          {formatCurrency(breakdown.nightlyRate)} × {breakdown.nights} night{breakdown.nights !== 1 ? 's' : ''}
        </span>
        <span className="text-gray-900">{formatCurrency(breakdown.subtotal)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Cleaning fee</span>
        <span className="text-gray-900">{formatCurrency(breakdown.cleaningFee)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 flex items-center gap-1">
          Service fee
          <Info className="h-3.5 w-3.5 text-gray-400" />
        </span>
        <span className="text-gray-900">{formatCurrency(breakdown.serviceFee)}</span>
      </div>
      <div className="flex justify-between font-semibold text-base pt-3 border-t">
        <span>Total</span>
        <span>{formatCurrency(breakdown.total)}</span>
      </div>
    </motion.div>
  );
}

// Main Booking Widget Component
export default function BookingWidget() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState<GuestCount>({ adults: 2, children: 0 });
  const [showCalendar, setShowCalendar] = useState(false);
  const [showGuests, setShowGuests] = useState(false);

  // Calculate price breakdown
  const priceBreakdown = useMemo<PriceBreakdown | null>(() => {
    if (!dateRange?.from || !dateRange?.to) return null;

    const nights = differenceInDays(dateRange.to, dateRange.from);
    if (nights < PRICING.minNights) return null;

    const subtotal = PRICING.baseNightlyRate * nights;
    const serviceFee = Math.round(subtotal * PRICING.serviceFeePercent);
    const total = subtotal + PRICING.cleaningFee + serviceFee;

    return {
      nightlyRate: PRICING.baseNightlyRate,
      nights,
      subtotal,
      cleaningFee: PRICING.cleaningFee,
      serviceFee,
      total,
    };
  }, [dateRange]);

  const nights = dateRange?.from && dateRange?.to
    ? differenceInDays(dateRange.to, dateRange.from)
    : 0;

  const totalGuests = guests.adults + guests.children;

  const canBook = priceBreakdown && nights >= PRICING.minNights;

  // Format date range for display
  const formatDateRange = () => {
    if (!dateRange?.from) return 'Select dates';
    if (!dateRange?.to) return format(dateRange.from, 'MMM d');
    return `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 sm:p-8 border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-semibold text-gray-900">
              {formatCurrency(PRICING.baseNightlyRate)}
            </span>
            <span className="text-gray-500">/ night</span>
          </div>
          <div className="flex items-center gap-1 mt-2 text-sm text-gray-600">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Free cancellation up to 48h before check-in</span>
          </div>
        </div>

        {/* Selection Area */}
        <div className="p-6 sm:p-8 space-y-4">
          {/* Date Selection */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowCalendar(!showCalendar);
                setShowGuests(false);
              }}
              className={cn(
                'w-full p-4 rounded-xl border-2 text-left transition-all',
                'hover:border-[#C4A572] focus:outline-none focus:border-[#C4A572] focus:ring-2 focus:ring-[#C4A572]/20',
                showCalendar ? 'border-[#C4A572] ring-2 ring-[#C4A572]/20' : 'border-gray-200'
              )}
            >
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-[#C4A572]" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Check-in / Check-out
                  </p>
                  <p className="text-base font-medium text-gray-900 mt-0.5">
                    {formatDateRange()}
                  </p>
                </div>
                {nights > 0 && (
                  <span className="px-2 py-1 bg-[#C4A572]/10 text-[#C4A572] text-sm font-medium rounded-md">
                    {nights} night{nights !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </button>

            {/* Calendar Dropdown */}
            <AnimatePresence>
              {showCalendar && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="absolute z-50 left-0 right-0 mt-2 p-4 bg-white rounded-xl shadow-2xl border border-gray-100"
                >
                  <BookingCalendar
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 2}
                  />
                  {nights > 0 && nights < PRICING.minNights && (
                    <p className="text-sm text-amber-600 mt-3 flex items-center gap-1">
                      <Info className="h-4 w-4" />
                      Minimum stay is {PRICING.minNights} nights
                    </p>
                  )}
                  <div className="flex justify-end mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange(undefined)}
                      className="mr-2"
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowCalendar(false)}
                      className="bg-[#C4A572] hover:bg-[#B39562]"
                    >
                      Done
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Guest Selection */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowGuests(!showGuests);
                setShowCalendar(false);
              }}
              className={cn(
                'w-full p-4 rounded-xl border-2 text-left transition-all',
                'hover:border-[#C4A572] focus:outline-none focus:border-[#C4A572] focus:ring-2 focus:ring-[#C4A572]/20',
                showGuests ? 'border-[#C4A572] ring-2 ring-[#C4A572]/20' : 'border-gray-200'
              )}
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-[#C4A572]" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Guests
                  </p>
                  <p className="text-base font-medium text-gray-900 mt-0.5">
                    {totalGuests} guest{totalGuests !== 1 ? 's' : ''}
                    {guests.children > 0 && ` (${guests.adults} adult${guests.adults !== 1 ? 's' : ''}, ${guests.children} child${guests.children !== 1 ? 'ren' : ''})`}
                  </p>
                </div>
              </div>
            </button>

            {/* Guests Dropdown */}
            <AnimatePresence>
              {showGuests && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="absolute z-50 left-0 right-0 mt-2 p-4 bg-white rounded-xl shadow-2xl border border-gray-100"
                >
                  <GuestSelector
                    guests={guests}
                    onChange={setGuests}
                    maxGuests={PRICING.maxGuests}
                  />
                  <div className="flex justify-end mt-4 pt-4 border-t">
                    <Button
                      size="sm"
                      onClick={() => setShowGuests(false)}
                      className="bg-[#C4A572] hover:bg-[#B39562]"
                    >
                      Done
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Price Breakdown */}
          <AnimatePresence>
            {priceBreakdown && (
              <PriceBreakdownDisplay breakdown={priceBreakdown} />
            )}
          </AnimatePresence>

          {/* Book Button */}
          <Link
            href={canBook ? `/book?checkin=${dateRange?.from?.toISOString()}&checkout=${dateRange?.to?.toISOString()}&adults=${guests.adults}&children=${guests.children}` : '#'}
            className={cn(
              'block w-full py-4 px-6 rounded-xl font-semibold text-center text-lg transition-all duration-300',
              canBook
                ? 'bg-[#C4A572] text-white hover:bg-[#B39562] hover:shadow-lg active:scale-[0.98]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
            onClick={(e) => !canBook && e.preventDefault()}
          >
            {canBook ? 'Reserve Now' : nights > 0 && nights < PRICING.minNights ? `Minimum ${PRICING.minNights} nights` : 'Select Dates'}
          </Link>

          {/* Trust Indicators */}
          <p className="text-center text-sm text-gray-500">
            You won&apos;t be charged yet
          </p>
        </div>
      </motion.div>

      {/* Mobile-friendly hint */}
      <p className="text-center text-xs text-gray-400 mt-4">
        Best rates guaranteed when booking directly
      </p>
    </div>
  );
}
