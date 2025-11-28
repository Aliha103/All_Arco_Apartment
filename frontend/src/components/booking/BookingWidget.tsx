'use client';

import { useState, useMemo, useCallback } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, differenceInDays, startOfDay, addMonths } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Users,
  PawPrint,
  Info,
  Minus,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import 'react-day-picker/dist/style.css';

// Pricing configuration
const PRICING = {
  baseNightlyRate: 189,
  serviceFeePercent: 0.12,
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

// Guest counter component
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
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <p className="text-xs text-gray-500">{sublabel}</p>
    </div>
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#C4A572] hover:text-[#C4A572] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="w-6 text-center text-sm font-semibold text-gray-900">{value}</span>
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
    const subtotal = accommodationTotal + cleaningFee + petFee;
    const serviceFee = Math.round(subtotal * PRICING.serviceFeePercent);
    const total = subtotal + serviceFee;
    const cityTaxNights = Math.min(nights, PRICING.cityTaxMaxNights);
    const cityTax = guests.adults * PRICING.cityTaxPerAdult * cityTaxNights;

    return { nights, accommodationTotal, cleaningFee, petFee, serviceFee, total, cityTax, cityTaxNights };
  }, [dateRange, hasPet, guests.adults]);

  const nights = dateRange?.from && dateRange?.to ? differenceInDays(dateRange.to, dateRange.from) : 0;
  const isValidRange = nights >= PRICING.minNights;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-[#1a1a2e] to-[#16213e] text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-300 mb-1">From</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">€{PRICING.baseNightlyRate}</span>
              <span className="text-gray-300">/ night</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Free cancellation</span>
          </div>
        </div>
      </div>

      {/* Calendar Section - Always Visible */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Select your dates</h3>
          {dateRange?.from && dateRange?.to && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-sm text-[#C4A572] font-medium"
            >
              {nights} night{nights !== 1 ? 's' : ''} selected
            </motion.div>
          )}
        </div>

        {nights > 0 && nights < PRICING.minNights && (
          <p className="text-xs text-red-500 mb-3 bg-red-50 p-2 rounded-lg">
            Minimum stay: {PRICING.minNights} nights
          </p>
        )}

        {/* 2-Month Calendar */}
        <div className="flex justify-center">
          <DayPicker
            mode="range"
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={2}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            disabled={[{ before: today }]}
            showOutsideDays={false}
            className="!font-sans rdp-custom"
            classNames={{
              months: 'flex flex-col sm:flex-row gap-4',
              month: 'space-y-3',
              caption: 'flex justify-center pt-1 relative items-center text-sm font-semibold text-gray-900',
              caption_label: 'text-sm font-semibold',
              nav: 'space-x-1 flex items-center',
              nav_button: 'h-7 w-7 bg-transparent p-0 hover:bg-gray-100 rounded-full inline-flex items-center justify-center text-gray-600',
              nav_button_previous: 'absolute left-1',
              nav_button_next: 'absolute right-1',
              table: 'w-full border-collapse',
              head_row: 'flex',
              head_cell: 'text-gray-500 rounded-md w-9 font-medium text-[0.7rem] text-center',
              row: 'flex w-full mt-1',
              cell: 'text-center text-sm p-0 relative [&:has([aria-selected].day-range-start)]:rounded-l-full [&:has([aria-selected].day-range-end)]:rounded-r-full [&:has([aria-selected])]:bg-[#C4A572]/10',
              day: 'h-9 w-9 p-0 font-normal hover:bg-gray-100 rounded-full transition-colors text-sm',
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

        {/* Selected Dates Display */}
        {dateRange?.from && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center justify-center gap-3 text-sm"
          >
            <div className="bg-gray-50 px-4 py-2 rounded-lg">
              <span className="text-gray-500">Check-in:</span>{' '}
              <span className="font-semibold text-gray-900">{format(dateRange.from, 'EEE, MMM d')}</span>
            </div>
            {dateRange.to && (
              <>
                <span className="text-gray-300">→</span>
                <div className="bg-gray-50 px-4 py-2 rounded-lg">
                  <span className="text-gray-500">Check-out:</span>{' '}
                  <span className="font-semibold text-gray-900">{format(dateRange.to, 'EEE, MMM d')}</span>
                </div>
              </>
            )}
          </motion.div>
        )}
      </div>

      {/* Guests Section */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-[#C4A572]" />
          <h3 className="text-sm font-semibold text-gray-900">Guests</h3>
          <span className="text-xs text-gray-400 ml-auto">Max 5 guests</span>
        </div>

        <div className="space-y-4">
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

          {/* Pet Toggle */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <PawPrint className="w-4 h-4 text-[#C4A572]" />
              <div>
                <p className="text-sm font-medium text-gray-900">Traveling with pet?</p>
                <p className="text-xs text-gray-500">
                  +€{nights <= 2 || nights === 0 ? PRICING.petFeeShort : PRICING.petFeeLong} fee
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setHasPet(!hasPet)}
              className={`w-12 h-7 rounded-full transition-all duration-200 relative ${
                hasPet ? 'bg-[#C4A572]' : 'bg-gray-200'
              }`}
            >
              <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ${
                hasPet ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Price Breakdown */}
      {pricing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 border-b border-gray-100 bg-gray-50"
        >
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Price details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">€{PRICING.baseNightlyRate} × {pricing.nights} nights</span>
              <span className="text-gray-900 font-medium">€{pricing.accommodationTotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cleaning fee</span>
              <span className="text-gray-900 font-medium">€{pricing.cleaningFee}</span>
            </div>
            {pricing.petFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Pet fee</span>
                <span className="text-gray-900 font-medium">€{pricing.petFee}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Service fee</span>
              <span className="text-gray-900 font-medium">€{pricing.serviceFee}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-gray-200 text-base font-bold">
              <span>Total</span>
              <span>€{pricing.total}</span>
            </div>
          </div>

          {/* City Tax Notice */}
          <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              City tax €{pricing.cityTax} ({guests.adults} × €{PRICING.cityTaxPerAdult} × {pricing.cityTaxNights} nights) payable at property
            </span>
          </div>
        </motion.div>
      )}

      {/* Reserve Button */}
      <div className="p-4">
        <Link
          href={isValidRange ? `/book?checkIn=${format(dateRange!.from!, 'yyyy-MM-dd')}&checkOut=${format(dateRange!.to!, 'yyyy-MM-dd')}&adults=${guests.adults}&children=${guests.children}&infants=${guests.infants}&pet=${hasPet}` : '#'}
          onClick={(e) => !isValidRange && e.preventDefault()}
          className={`block w-full py-4 rounded-xl font-semibold text-center text-lg transition-all ${
            isValidRange
              ? 'bg-gradient-to-r from-[#C4A572] to-[#B39562] text-white hover:shadow-lg hover:shadow-[#C4A572]/30 active:scale-[0.98]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isValidRange ? `Reserve · €${pricing?.total}` : 'Select dates to book'}
        </Link>
        <p className="text-xs text-gray-400 text-center mt-2">You won't be charged yet</p>
      </div>
    </div>
  );
}
