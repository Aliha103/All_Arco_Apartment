'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import Link from 'next/link';
import 'react-day-picker/dist/style.css';

// Pricing configuration
const PRICING = {
  baseNightlyRate: 189,
  maxGuestsCountable: 5,
  minNights: 2,
  maxNights: 30,
  cleaningFeeShort: 25,
  cleaningFeeLong: 35,
  petFeeShort: 15,
  petFeeLong: 25,
  cityTaxPerAdult: 4,
  cityTaxMaxNights: 5,
};

interface GuestCounts {
  adults: number;
  children: number;
  infants: number;
}

// Guest counter with better spacing
const GuestCounter = ({
  label,
  sublabel,
  value,
  onChange,
  min = 0,
  max = 10,
}: {
  label: string;
  sublabel: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) => (
  <div className="flex items-center justify-between py-3">
    <div>
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <p className="text-xs text-gray-500">{sublabel}</p>
    </div>
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#C4A572] hover:text-[#C4A572] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="w-6 text-center text-base font-semibold text-gray-900">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#C4A572] hover:text-[#C4A572] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  </div>
);

export default function BookingWidget() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState<GuestCounts>({ adults: 2, children: 0, infants: 0 });
  const [hasPet, setHasPet] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);

  const today = startOfDay(new Date());

  const maxAdults = PRICING.maxGuestsCountable - guests.children;
  const maxChildren = PRICING.maxGuestsCountable - guests.adults;

  const handleGuestChange = useCallback((type: keyof GuestCounts, value: number) => {
    setGuests((prev) => {
      const newGuests = { ...prev, [type]: value };
      if (type === 'adults' && newGuests.adults + newGuests.children > PRICING.maxGuestsCountable) {
        newGuests.children = PRICING.maxGuestsCountable - newGuests.adults;
      }
      if (type === 'children' && newGuests.adults + newGuests.children > PRICING.maxGuestsCountable) {
        newGuests.adults = PRICING.maxGuestsCountable - newGuests.children;
      }
      return newGuests;
    });
  }, []);

  // Calculate pricing
  const pricing = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return null;
    const nights = differenceInDays(dateRange.to, dateRange.from);
    if (nights < PRICING.minNights) return null;

    const accommodationTotal = PRICING.baseNightlyRate * nights;
    const cleaningFee = nights <= 2 ? PRICING.cleaningFeeShort : PRICING.cleaningFeeLong;
    const petFee = hasPet ? (nights <= 2 ? PRICING.petFeeShort : PRICING.petFeeLong) : 0;
    const total = accommodationTotal + cleaningFee + petFee;
    const cityTaxNights = Math.min(nights, PRICING.cityTaxMaxNights);
    const cityTax = guests.adults * PRICING.cityTaxPerAdult * cityTaxNights;

    return { nights, accommodationTotal, cleaningFee, petFee, total, cityTax, cityTaxNights };
  }, [dateRange, hasPet, guests.adults]);

  const nights = dateRange?.from && dateRange?.to ? differenceInDays(dateRange.to, dateRange.from) : 0;
  const isValidRange = nights >= PRICING.minNights;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header - Price */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#1a1a2e] to-[#16213e] text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs text-gray-400">From</span>
            <span className="text-2xl font-bold">€{PRICING.baseNightlyRate}</span>
            <span className="text-gray-400 text-sm">/ night</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Free cancellation</span>
          </div>
        </div>
      </div>

      {/* Main Content - Horizontal on large screens */}
      <div className="flex flex-col lg:flex-row lg:items-start">
        {/* Left: Calendar - Large */}
        <div className="p-5 lg:p-6 lg:border-r border-b lg:border-b-0 border-gray-100 flex-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Select your dates</h3>
            {dateRange?.from && dateRange?.to && (
              <span className="text-sm text-[#C4A572] font-medium">
                {nights} night{nights !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {nights > 0 && nights < PRICING.minNights && (
            <p className="text-xs text-red-500 mb-3 bg-red-50 px-3 py-1.5 rounded">
              Min. {PRICING.minNights} nights
            </p>
          )}

          {/* 2-Month Calendar - Extra Large */}
          <DayPicker
            mode="range"
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={2}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            disabled={[{ before: today }]}
            showOutsideDays={false}
            className="!font-sans"
            classNames={{
              months: 'flex flex-col sm:flex-row gap-8',
              month: 'space-y-4',
              caption: 'flex justify-center pt-1 relative items-center text-lg font-semibold text-gray-900',
              caption_label: 'text-lg font-semibold',
              nav: 'space-x-1 flex items-center',
              nav_button: 'h-9 w-9 bg-transparent p-0 hover:bg-gray-100 rounded-full inline-flex items-center justify-center text-gray-600',
              nav_button_previous: 'absolute left-0',
              nav_button_next: 'absolute right-0',
              table: 'w-full border-collapse',
              head_row: 'flex',
              head_cell: 'text-gray-500 rounded-md w-12 font-medium text-sm text-center',
              row: 'flex w-full mt-1.5',
              cell: 'text-center text-sm p-0 relative [&:has([aria-selected].day-range-start)]:rounded-l-full [&:has([aria-selected].day-range-end)]:rounded-r-full [&:has([aria-selected])]:bg-[#C4A572]/10',
              day: 'h-12 w-12 p-0 font-normal hover:bg-gray-100 rounded-full transition-colors text-sm',
              day_selected: 'bg-[#C4A572] text-white hover:bg-[#B39562] rounded-full',
              day_today: 'bg-gray-100 font-semibold',
              day_outside: 'text-gray-300 opacity-50',
              day_disabled: 'text-gray-300 cursor-not-allowed hover:bg-transparent',
              day_range_start: 'day-range-start',
              day_range_end: 'day-range-end',
              day_range_middle: 'aria-selected:bg-transparent aria-selected:text-gray-900',
            }}
          />
        </div>

        {/* Right: Dates + Guests + Pricing + Reserve */}
        <div className="flex flex-col w-full lg:w-[320px] lg:flex-shrink-0">
          {/* Selected Dates */}
          {dateRange?.from && (
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-[#C4A572]" />
                <h3 className="text-sm font-semibold text-gray-900">Your stay</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50/50">
                  <p className="text-xs text-gray-500 mb-0.5">Check-in</p>
                  <p className="text-base font-semibold text-gray-900">{format(dateRange.from, 'EEE, MMM d')}</p>
                </div>
                <span className="text-gray-300">→</span>
                {dateRange.to && (
                  <div className="flex-1 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50/50">
                    <p className="text-xs text-gray-500 mb-0.5">Check-out</p>
                    <p className="text-base font-semibold text-gray-900">{format(dateRange.to, 'EEE, MMM d')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Guests Section */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-[#C4A572]" />
              <h3 className="text-sm font-semibold text-gray-900">Guests</h3>
              <span className="text-xs text-gray-400 ml-auto">Max 5</span>
            </div>

            <div className="divide-y divide-gray-50">
              <GuestCounter
                label="Adults"
                sublabel="Age 13+"
                value={guests.adults}
                onChange={(v) => handleGuestChange('adults', v)}
                min={1}
                max={maxAdults}
              />
              <GuestCounter
                label="Children"
                sublabel="Ages 2-12"
                value={guests.children}
                onChange={(v) => handleGuestChange('children', v)}
                max={maxChildren}
              />
              <GuestCounter
                label="Infants"
                sublabel="Under 2 (free)"
                value={guests.infants}
                onChange={(v) => handleGuestChange('infants', v)}
                max={3}
              />
            </div>

            {/* Pet Toggle */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <PawPrint className="w-4 h-4 text-[#C4A572]" />
                <p className="text-sm font-medium text-gray-900">Traveling with pet?</p>
              </div>
              <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm">
                <button
                  type="button"
                  onClick={() => setHasPet(false)}
                  className={`px-4 py-1.5 font-medium transition-all ${
                    !hasPet ? 'bg-[#C4A572] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => setHasPet(true)}
                  className={`px-4 py-1.5 font-medium transition-all border-l border-gray-200 ${
                    hasPet ? 'bg-[#C4A572] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>

          {/* Price Section */}
          {pricing && (
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-xs text-gray-500">for {pricing.nights} nights</span>
                </div>
                <span className="text-xl font-bold text-gray-900">€{pricing.total}</span>
              </div>

              {/* Breakdown Price Link */}
              <button
                type="button"
                onClick={() => setShowPriceBreakdown(true)}
                className="mt-2 text-sm text-[#C4A572] hover:text-[#B39562] underline underline-offset-2 transition-colors"
              >
                Breakdown Price
              </button>

              <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                <span>+ €{pricing.cityTax} city tax at property</span>
              </div>
            </div>
          )}

          {/* Price Breakdown Popup Modal */}
          <AnimatePresence>
            {showPriceBreakdown && pricing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                onClick={() => setShowPriceBreakdown(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="bg-white rounded-xl shadow-2xl p-5 mx-4 w-full max-w-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Price Breakdown</h3>
                    <button
                      type="button"
                      onClick={() => setShowPriceBreakdown(false)}
                      className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">€{PRICING.baseNightlyRate} × {pricing.nights} nights</span>
                      <span className="font-medium text-gray-900">€{pricing.accommodationTotal}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Cleaning fee</span>
                      <span className="font-medium text-gray-900">€{pricing.cleaningFee}</span>
                    </div>
                    {pricing.petFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Pet fee</span>
                        <span className="font-medium text-gray-900">€{pricing.petFee}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-3 flex justify-between">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="font-bold text-lg text-gray-900">€{pricing.total}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                      <Info className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>+ €{pricing.cityTax} city tax payable at property ({pricing.cityTaxNights} nights × {guests.adults} adults × €{PRICING.cityTaxPerAdult})</span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reserve Button */}
          <div className="px-5 py-4">
            <Link
              href={isValidRange ? `/book?checkIn=${format(dateRange!.from!, 'yyyy-MM-dd')}&checkOut=${format(dateRange!.to!, 'yyyy-MM-dd')}&adults=${guests.adults}&children=${guests.children}&infants=${guests.infants}&pet=${hasPet}` : '#'}
              onClick={(e) => !isValidRange && e.preventDefault()}
              className={`block w-full py-3.5 rounded-xl font-semibold text-center text-base transition-all ${
                isValidRange
                  ? 'bg-gradient-to-r from-[#C4A572] to-[#B39562] text-white hover:shadow-lg hover:shadow-[#C4A572]/30 active:scale-[0.98]'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isValidRange ? `Reserve · €${pricing?.total}` : 'Select dates to book'}
            </Link>
            <p className="text-xs text-gray-400 text-center mt-2">You won&apos;t be charged yet</p>

            {/* Trust badges */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center gap-5 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span>Free cancellation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                <span>Secure payment</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                <span>Best price</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
