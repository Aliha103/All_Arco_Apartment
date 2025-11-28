'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Users,
  PawPrint,
  Info,
  Minus,
  Plus,
  ChevronDown,
  CheckCircle2,
  X
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

// Compact guest counter
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
  <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
    <div>
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <p className="text-xs text-gray-500">{sublabel}</p>
    </div>
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:border-[#C4A572] hover:text-[#C4A572] disabled:opacity-30 disabled:cursor-not-allowed transition-all touch-manipulation"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="w-5 text-center text-sm font-semibold text-gray-900">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:border-[#C4A572] hover:text-[#C4A572] disabled:opacity-30 disabled:cursor-not-allowed transition-all touch-manipulation"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

export default function BookingWidget() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState<GuestCounts>({ adults: 2, children: 0, infants: 0 });
  const [hasPet, setHasPet] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showGuests, setShowGuests] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const guestsRef = useRef<HTMLDivElement>(null);

  const today = startOfDay(new Date());

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
      if (guestsRef.current && !guestsRef.current.contains(event.target as Node)) {
        setShowGuests(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Guest summary
  const guestSummary = useMemo(() => {
    const total = guests.adults + guests.children;
    const parts = [`${total} guest${total !== 1 ? 's' : ''}`];
    if (guests.infants > 0) parts.push(`${guests.infants} infant${guests.infants !== 1 ? 's' : ''}`);
    if (hasPet) parts.push('pet');
    return parts.join(', ');
  }, [guests, hasPet]);

  // Date summary
  const dateSummary = useMemo(() => {
    if (!dateRange?.from) return 'Select dates';
    if (!dateRange?.to) return format(dateRange.from, 'MMM d');
    return `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`;
  }, [dateRange]);

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-visible">
      {/* Header with price */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold text-gray-900">€{PRICING.baseNightlyRate}</span>
            <span className="text-gray-500 text-sm ml-1">/ night</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-green-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Free cancellation</span>
          </div>
        </div>
      </div>

      {/* Date & Guest Selectors */}
      <div className="p-4 space-y-3">
        {/* Date Picker Trigger */}
        <div ref={calendarRef} className="relative">
          <button
            type="button"
            onClick={() => { setShowCalendar(!showCalendar); setShowGuests(false); }}
            className={`w-full p-3 rounded-xl border-2 transition-all text-left flex items-center justify-between ${
              showCalendar ? 'border-[#C4A572] bg-[#C4A572]/5' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-[#C4A572]" />
              <div>
                <p className="text-xs text-gray-500 font-medium">DATES</p>
                <p className={`text-sm font-semibold ${dateRange?.from ? 'text-gray-900' : 'text-gray-400'}`}>
                  {dateSummary}
                </p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCalendar ? 'rotate-180' : ''}`} />
          </button>

          {/* Calendar Dropdown */}
          <AnimatePresence>
            {showCalendar && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 p-4"
                style={{ minWidth: '320px' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {nights > 0 ? `${nights} night${nights !== 1 ? 's' : ''}` : 'Select dates'}
                  </p>
                  <button onClick={() => setShowCalendar(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                {nights > 0 && nights < PRICING.minNights && (
                  <p className="text-xs text-red-500 mb-2">Minimum {PRICING.minNights} nights required</p>
                )}
                <DayPicker
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={1}
                  disabled={[{ before: today }]}
                  showOutsideDays={false}
                  className="!font-sans"
                  classNames={{
                    months: 'flex flex-col',
                    month: 'space-y-2',
                    caption: 'flex justify-center pt-1 relative items-center text-sm font-semibold text-gray-900',
                    nav: 'space-x-1 flex items-center',
                    nav_button: 'h-7 w-7 bg-transparent p-0 hover:bg-gray-100 rounded-full inline-flex items-center justify-center',
                    nav_button_previous: 'absolute left-1',
                    nav_button_next: 'absolute right-1',
                    table: 'w-full border-collapse',
                    head_row: 'flex',
                    head_cell: 'text-gray-500 rounded-md w-10 font-medium text-[0.7rem]',
                    row: 'flex w-full mt-1',
                    cell: 'text-center text-sm p-0 relative [&:has([aria-selected])]:bg-[#C4A572]/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md',
                    day: 'h-10 w-10 p-0 font-normal hover:bg-gray-100 rounded-full transition-colors',
                    day_selected: 'bg-[#C4A572] text-white hover:bg-[#B39562]',
                    day_today: 'bg-gray-100 font-semibold',
                    day_outside: 'text-gray-300',
                    day_disabled: 'text-gray-300 cursor-not-allowed hover:bg-transparent',
                    day_range_middle: 'aria-selected:bg-[#C4A572]/10 aria-selected:text-gray-900 rounded-none',
                  }}
                />
                {isValidRange && (
                  <button
                    onClick={() => setShowCalendar(false)}
                    className="w-full mt-3 py-2.5 bg-[#C4A572] text-white rounded-lg font-medium hover:bg-[#B39562] transition-colors"
                  >
                    Confirm dates
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Guest Picker Trigger */}
        <div ref={guestsRef} className="relative">
          <button
            type="button"
            onClick={() => { setShowGuests(!showGuests); setShowCalendar(false); }}
            className={`w-full p-3 rounded-xl border-2 transition-all text-left flex items-center justify-between ${
              showGuests ? 'border-[#C4A572] bg-[#C4A572]/5' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-[#C4A572]" />
              <div>
                <p className="text-xs text-gray-500 font-medium">GUESTS</p>
                <p className="text-sm font-semibold text-gray-900">{guestSummary}</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showGuests ? 'rotate-180' : ''}`} />
          </button>

          {/* Guests Dropdown */}
          <AnimatePresence>
            {showGuests && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 p-4"
              >
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
                  sublabel="Under 2"
                  value={guests.infants}
                  onChange={(v) => handleGuestChange('infants', v)}
                  max={3}
                />

                {/* Pet Toggle */}
                <div className="flex items-center justify-between py-3 mt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <PawPrint className="w-4 h-4 text-[#C4A572]" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Pet</p>
                      <p className="text-xs text-gray-500">+€{nights <= 2 ? PRICING.petFeeShort : PRICING.petFeeLong} cleaning</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHasPet(!hasPet)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      hasPet ? 'bg-[#C4A572]' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      hasPet ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <p className="text-xs text-gray-400 mt-3">Max 5 guests (adults + children)</p>

                <button
                  onClick={() => setShowGuests(false)}
                  className="w-full mt-3 py-2.5 bg-[#C4A572] text-white rounded-lg font-medium hover:bg-[#B39562] transition-colors"
                >
                  Done
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Price Breakdown */}
      {pricing && (
        <div className="px-4 pb-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">€{PRICING.baseNightlyRate} × {pricing.nights} nights</span>
              <span className="text-gray-900">€{pricing.accommodationTotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Cleaning fee</span>
              <span className="text-gray-900">€{pricing.cleaningFee}</span>
            </div>
            {pricing.petFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Pet fee</span>
                <span className="text-gray-900">€{pricing.petFee}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Service fee</span>
              <span className="text-gray-900">€{pricing.serviceFee}</span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>€{pricing.total}</span>
            </div>
          </div>

          {/* City Tax Notice */}
          <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-lg">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              City tax €{pricing.cityTax} ({guests.adults} × €{PRICING.cityTaxPerAdult} × {pricing.cityTaxNights} nights) — pay at property
            </span>
          </div>
        </div>
      )}

      {/* Reserve Button */}
      <div className="p-4 pt-0">
        <Link
          href={isValidRange ? `/book?checkIn=${format(dateRange!.from!, 'yyyy-MM-dd')}&checkOut=${format(dateRange!.to!, 'yyyy-MM-dd')}&adults=${guests.adults}&children=${guests.children}&infants=${guests.infants}&pet=${hasPet}` : '#'}
          onClick={(e) => !isValidRange && e.preventDefault()}
          className={`block w-full py-3.5 rounded-xl font-semibold text-center transition-all ${
            isValidRange
              ? 'bg-gradient-to-r from-[#C4A572] to-[#B39562] text-white hover:opacity-90 active:scale-[0.98] shadow-lg shadow-[#C4A572]/25'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isValidRange ? `Reserve · €${pricing?.total}` : 'Select dates to continue'}
        </Link>
        <p className="text-xs text-gray-400 text-center mt-2">You won't be charged yet</p>
      </div>
    </div>
  );
}
