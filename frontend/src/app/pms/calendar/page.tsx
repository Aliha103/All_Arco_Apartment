'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Lock,
  User,
} from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface CalendarDate {
  date: string;
  status: 'available' | 'booked' | 'blocked' | 'check_in' | 'check_out';
  booking?: {
    id: string;
    booking_id: string;
    guest_name: string;
    check_in_date: string;
    check_out_date: string;
    number_of_guests?: number;
    total_price?: number;
  };
  blocked?: {
    id: string;
    reason: string;
    notes: string;
  };
}

interface BookingCapsule {
  id: string;
  booking_id: string;
  guest_name: string;
  check_in_date: string;
  check_out_date: string;
  number_of_guests?: number;
  total_price?: number;
  startDay: number;
  endDay: number;
  nights: number;
  row: number;
  color: string;
}

// ============================================================================
// Quantum-Level Performance Utilities
// ============================================================================

const COLORS = {
  primary: '#C4A572',
  blue: '#3B82F6',
  green: '#10B981',
  red: '#EF4444',
  purple: '#8B5CF6',
  orange: '#F59E0B',
};

const BOOKING_COLORS = [COLORS.blue, COLORS.purple, COLORS.green, COLORS.orange];

// Memoized date utilities for performance
const createDateKey = (year: number, month: number, day: number): string =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

// ============================================================================
// Main Component
// ============================================================================

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const calendarRef = useRef<HTMLDivElement>(null);

  // State management
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingCapsule | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const monthStart = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
  const monthEnd = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1), [currentDate]);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const { data: calendarData, isLoading } = useQuery({
    queryKey: ['calendar', currentYear, currentMonth],
    queryFn: async () => {
      const response = await api.bookings.calendar(currentYear, currentMonth);
      return response.data as CalendarDate[];
    },
    staleTime: 30000,
  });

  // Fallback: fetch bookings directly if calendar endpoint returns empty
  const { data: fallbackBookings } = useQuery({
    queryKey: ['calendar-fallback', monthStart.toISOString()],
    queryFn: async () => {
      const params: any = {
        check_in_date_from: monthStart.toISOString().slice(0, 10),
        check_in_date_to: monthEnd.toISOString().slice(0, 10),
        status: 'pending,confirmed,paid,checked_in,checked_out,no_show',
      };
      const res = await api.bookings.list(params);
      return res.data.results || res.data || [];
    },
    enabled: !isLoading,
    staleTime: 30000,
  });

  const [blockFormData, setBlockFormData] = useState({
    start_date: '',
    end_date: '',
    reason: 'maintenance',
    notes: '',
  });

  const createBlockedDate = useMutation({
    mutationFn: (data: any) => api.blockedDates.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setIsBlockModalOpen(false);
      setBlockFormData({ start_date: '', end_date: '', reason: 'maintenance', notes: '' });
    },
  });

  // ============================================================================
  // Quantum-Level Calendar Logic (Memoized for Performance)
  // ============================================================================

  const calendarGrid = useMemo(() => {
    const sourceData = (calendarData && calendarData.length > 0)
      ? calendarData
      : (fallbackBookings && fallbackBookings.length > 0
        ? (() => {
            // Build minimal calendar data from bookings list
            const dates: any[] = [];
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const first = new Date(year, month, 1);
            const last = new Date(year, month + 1, 0);
            for (let d = 1; d <= last.getDate(); d++) {
              const dateStr = createDateKey(year, month, d);
              dates.push({ date: dateStr, status: 'available' });
            }
            (fallbackBookings as any[]).forEach((b) => {
              const checkIn = new Date(b.check_in_date);
              const checkOut = new Date(b.check_out_date);
              for (let dt = new Date(checkIn); dt < checkOut; dt.setDate(dt.getDate() + 1)) {
                const ds = dt.toISOString().slice(0, 10);
                const found = dates.find((x) => x.date === ds);
                if (found) {
                  if (ds === b.check_in_date) found.status = 'check_in';
                  else if (ds === new Date(new Date(b.check_out_date).getTime() - 86400000).toISOString().slice(0,10)) found.status = 'check_out';
                  else found.status = 'booked';
                  found.booking = {
                    id: b.id,
                    booking_id: b.booking_id,
                    guest_name: b.guest_name,
                    check_in_date: b.check_in_date,
                    check_out_date: b.check_out_date,
                    number_of_guests: b.number_of_guests,
                    total_price: b.total_price,
                    booking_source: b.booking_source,
                    status: b.status,
                  };
                }
              }
            });
            return dates;
          })()
        : []);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Empty cells before first day
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // All days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = createDateKey(year, month, day);
      const calendarDate = sourceData?.find((d) => d.date === dateStr);
      days.push({
        day,
        date: dateStr,
        calendarDate,
        dayOfWeek: (startingDayOfWeek + day - 1) % 7,
        isToday: dateStr === createDateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()),
      });
    }

    return days;
  }, [currentDate, calendarData]);

  // ============================================================================
  // Capsule Booking Calculation (Quantum-Level Position Logic)
  // ============================================================================

  const bookingCapsules = useMemo((): BookingCapsule[] => {
    const dataSource =
      calendarData && calendarData.length > 0
        ? calendarData
        : (fallbackBookings || []).map((b: any) => ({
            date: b.check_in_date,
            status: 'check_in',
            booking: b,
          }));

    if (!dataSource) return [];

    const capsules: BookingCapsule[] = [];
    const processedBookings = new Set<string>();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    dataSource.forEach((dateData: any) => {
      if (dateData.booking && !processedBookings.has(dateData.booking.id)) {
        const booking = dateData.booking;
        processedBookings.add(booking.id);

        const checkIn = new Date(booking.check_in_date);
        const checkOut = new Date(booking.check_out_date);

        // Only process bookings that intersect with current month
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);

        if (checkOut < monthStart || checkIn > monthEnd) return;

        // Calculate start and end day numbers
        // Note: Capsule should end on last night of stay, not checkout morning
        const startDay = checkIn.getMonth() === month ? checkIn.getDate() : 1;
        let endDay = checkOut.getMonth() === month ? checkOut.getDate() : new Date(year, month + 1, 0).getDate();
        // Subtract 1 to show last night, not checkout day
        if (checkOut.getMonth() === month) {
          endDay = Math.max(startDay, endDay - 1);
        }

        // Calculate nights
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

        // Calculate row (week number)
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const startRow = Math.floor((firstDayOfMonth + startDay - 1) / 7);

        // Assign color
        const colorIndex = capsules.length % BOOKING_COLORS.length;

        capsules.push({
          ...booking,
          startDay,
          endDay,
          nights,
          row: startRow,
          color: BOOKING_COLORS[colorIndex],
        });
      }
    });

    return capsules;
  }, [calendarData, currentDate]);

  // Blocked date capsules
  const blockedCapsules = useMemo(() => {
    const dataSource = calendarData && calendarData.length > 0 ? calendarData : [];
    const capsules: any[] = [];
    const processedBlocked = new Set<string>();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    dataSource.forEach((dateData: any) => {
      if (dateData.blocked && !processedBlocked.has(dateData.blocked.id)) {
        const blocked = dateData.blocked;
        processedBlocked.add(blocked.id);

        // Find start and end dates for this blocked period
        const blockedDates = dataSource.filter(
          (d: any) => d.blocked?.id === blocked.id
        );

        if (blockedDates.length === 0) return;

        const dates = blockedDates.map((d: any) => new Date(d.date)).sort((a, b) => a.getTime() - b.getTime());
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];

        const startDay = startDate.getDate();
        // Subtract 1 from endDay to show last night, not checkout day (same as bookings)
        const endDay = Math.max(startDay, endDate.getDate() - 1);
        const nights = blockedDates.length - 1; // Actual nights (excluding checkout day)

        // Calculate row
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const startRow = Math.floor((firstDayOfMonth + startDay - 1) / 7);

        capsules.push({
          id: blocked.id,
          reason: blocked.reason,
          notes: blocked.notes,
          startDay,
          endDay,
          nights,
          row: startRow,
          color: COLORS.red,
        });
      }
    });

    return capsules;
  }, [calendarData, currentDate]);

  // Log capsules for debugging
  useEffect(() => {
    if (bookingCapsules.length > 0) {
      console.log('Booking Capsules:', bookingCapsules);
    }
  }, [bookingCapsules]);

  // ============================================================================
  // Event Handlers (Memoized with useCallback)
  // ============================================================================

  const handlePreviousMonth = useCallback(() => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  }, [currentDate]);

  const handleNextMonth = useCallback(() => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  }, [currentDate]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleDateClick = useCallback((dayData: any) => {
    if (!dayData) return;

    if (dayData.calendarDate?.booking) {
      router.push(`/pms/bookings/${dayData.calendarDate.booking.id}`);
    } else if (dayData.calendarDate?.status === 'available') {
      setBlockFormData({
        start_date: dayData.date,
        end_date: dayData.date,
        reason: 'maintenance',
        notes: '',
      });
      setIsBlockModalOpen(true);
    }
  }, [router]);

  const handleCapsuleClick = useCallback((capsule: BookingCapsule, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBooking(capsule);
  }, []);

  const handleBlockSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    createBlockedDate.mutate(blockFormData);
  }, [blockFormData, createBlockedDate]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const getDateClassName = useCallback((calendarDate?: CalendarDate, isToday?: boolean) => {
    const baseClasses = 'relative h-24 p-2 rounded-md transition-all duration-200';

    if (isToday) {
      return `${baseClasses} bg-[#C4A572]/10 ring-1 ring-[#C4A572]/30 font-bold shadow-sm`;
    }

    if (!calendarDate) {
      return `${baseClasses} bg-white/50 hover:bg-gray-50 cursor-pointer`;
    }

    switch (calendarDate.status) {
      case 'booked':
        return `${baseClasses} bg-blue-50/40 cursor-pointer hover:bg-blue-50/60`;
      case 'blocked':
        return `${baseClasses} bg-gray-100/70 cursor-not-allowed`;
      case 'check_in':
        return `${baseClasses} bg-green-50/50 cursor-pointer hover:bg-green-100/70`;
      case 'check_out':
        return `${baseClasses} bg-red-50/50 cursor-pointer hover:bg-red-100/70`;
      default:
        return `${baseClasses} bg-white/50 hover:bg-gray-50 cursor-pointer`;
    }
  }, []);

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Calculate cell dimensions for capsule positioning
  const cellHeight = 96; // h-24 = 6rem = 96px
  const gapSize = 4; // gap-1 = 0.25rem = 4px

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold text-gray-900">Calendar View</h1>
        <p className="text-base text-gray-800 mt-1">Manage availability and view bookings</p>
      </motion.div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border border-gray-200/50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex gap-4 sm:gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-white/50 rounded"></div>
                <span className="text-sm font-semibold text-gray-900">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-100/40 rounded"></div>
                <span className="text-sm font-semibold text-gray-900">Booked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-200/70 rounded"></div>
                <span className="text-sm font-semibold text-gray-900">Blocked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-100/50 rounded"></div>
                <span className="text-sm font-semibold text-gray-900">Check-in</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-100/50 rounded"></div>
                <span className="text-sm font-semibold text-gray-900">Check-out</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Calendar Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="border border-gray-200/50 shadow-sm">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <CalendarIcon className="w-6 h-6 text-[#C4A572]" />
                {monthName}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousMonth}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToday}
                  className="bg-[#C4A572] hover:bg-[#B39562] text-white"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextMonth}
                  className="gap-1"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-[#C4A572] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading calendar...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center font-bold text-sm text-gray-700 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid with Capsule Overlays */}
                <div ref={calendarRef} className="relative">
                  {/* Base Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarGrid.map((dayData, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.15, delay: index * 0.005 }}
                        className={getDateClassName(dayData?.calendarDate, dayData?.isToday)}
                        onClick={() => handleDateClick(dayData)}
                        onMouseEnter={() => dayData && setHoveredDate(dayData.date)}
                        onMouseLeave={() => setHoveredDate(null)}
                      >
                            {dayData && (
                              <div className={`text-sm font-bold mb-1 ${dayData.isToday ? 'text-[#C4A572]' : 'text-gray-900'}`}>
                                {dayData.day}
                              </div>
                            )}
                      </motion.div>
                    ))}
                  </div>

                  {/* Booking Capsules Overlay */}
                  <div className="absolute inset-0 pointer-events-none" style={{ top: '44px' }}>
                    <AnimatePresence>
                      {/* Booking Capsules */}
                      {bookingCapsules.map((capsule, index) => {
                        const year = currentDate.getFullYear();
                        const month = currentDate.getMonth();
                        const firstDayOfMonth = new Date(year, month, 1).getDay();

                        // Calculate position in grid
                        const startIndex = firstDayOfMonth + capsule.startDay - 1;
                        const endIndex = firstDayOfMonth + capsule.endDay - 1;

                        // Grid row and column
                        const gridRow = Math.floor(startIndex / 7);
                        const startCol = startIndex % 7;
                        const endCol = endIndex % 7;

                        // Calculate if capsule spans multiple rows
                        const spansMultipleRows = gridRow !== Math.floor(endIndex / 7);
                        const daysInRow = spansMultipleRows ? (7 - startCol) : (endCol - startCol + 1);

                        // Positioning with centered vertical alignment
                        const cellWidth = `calc((100% - 6 * ${gapSize}px) / 7)`;
                        const capsuleHeight = 28; // h-7 = 28px
                        // Position capsule at true center of cell (96px cell - 28px capsule) / 2 = 34px
                        const verticalCenter = 34; // Center position in 96px cell
                        // Use smaller offsets for single-day capsules to avoid tiny dots
                        // For multi-day: start from right side of check-in (50%) to left side of check-out (50%)
                        const isSingleDay = capsule.startDay === capsule.endDay;
                        const startOffset = isSingleDay ? 0.1 : 0.5; // 10% for single-day, 50% for multi-day
                        const endOffset = isSingleDay ? 0.1 : 0.5; // Creates 80% width for single-day, balanced for multi-day

                        return (
                          <motion.div
                            key={capsule.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="absolute pointer-events-auto cursor-pointer"
                            style={{
                              top: `${gridRow * (cellHeight + gapSize) + verticalCenter}px`,
                              left: `calc(${startCol} * (${cellWidth} + ${gapSize}px) + ${startOffset} * ${cellWidth})`,
                              width: `calc(${daysInRow} * ${cellWidth} + ${daysInRow - 1} * ${gapSize}px - ${startOffset + endOffset} * ${cellWidth})`,
                              zIndex: 10,
                            }}
                            onClick={(e) => handleCapsuleClick(capsule, e)}
                          >
                            <div
                              className="relative h-7 rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center px-3 overflow-hidden group"
                              style={{ backgroundColor: capsule.color }}
                            >
                              <div className="flex items-center justify-between w-full text-white text-xs font-bold truncate">
                                <span className="truncate">{capsule.guest_name}</span>
                                <span className="ml-2 opacity-90 text-[10px]">{capsule.nights}N</span>
                              </div>
                              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
                            </div>
                          </motion.div>
                        );
                      })}

                      {/* Blocked Date Capsules */}
                      {blockedCapsules.map((capsule, index) => {
                        const year = currentDate.getFullYear();
                        const month = currentDate.getMonth();
                        const firstDayOfMonth = new Date(year, month, 1).getDay();

                        // Calculate position in grid
                        const startIndex = firstDayOfMonth + capsule.startDay - 1;
                        const endIndex = firstDayOfMonth + capsule.endDay - 1;

                        // Grid row and column
                        const gridRow = Math.floor(startIndex / 7);
                        const startCol = startIndex % 7;
                        const endCol = endIndex % 7;

                        // Calculate if capsule spans multiple rows
                        const spansMultipleRows = gridRow !== Math.floor(endIndex / 7);
                        const daysInRow = spansMultipleRows ? (7 - startCol) : (endCol - startCol + 1);

                        // Positioning with centered vertical alignment
                        const cellWidth = `calc((100% - 6 * ${gapSize}px) / 7)`;
                        const capsuleHeight = 28; // h-7 = 28px
                        // Position capsule at true center of cell (96px cell - 28px capsule) / 2 = 34px
                        const verticalCenter = 34; // Center position in 96px cell
                        // Use smaller offsets for single-day capsules to avoid tiny dots
                        // For multi-day: start from right side of check-in (50%) to left side of check-out (50%)
                        const isSingleDay = capsule.startDay === capsule.endDay;
                        const startOffset = isSingleDay ? 0.1 : 0.5; // 10% for single-day, 50% for multi-day
                        const endOffset = isSingleDay ? 0.1 : 0.5; // Creates 80% width for single-day, balanced for multi-day

                        return (
                          <motion.div
                            key={`blocked-${capsule.id}`}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="absolute pointer-events-auto cursor-default"
                            style={{
                              top: `${gridRow * (cellHeight + gapSize) + verticalCenter}px`,
                              left: `calc(${startCol} * (${cellWidth} + ${gapSize}px) + ${startOffset} * ${cellWidth})`,
                              width: `calc(${daysInRow} * ${cellWidth} + ${daysInRow - 1} * ${gapSize}px - ${startOffset + endOffset} * ${cellWidth})`,
                              zIndex: 10,
                            }}
                          >
                            <div
                              className="relative h-7 rounded-full shadow-md transition-all duration-200 flex items-center px-3 overflow-hidden bg-gray-400/80"
                            >
                              <div className="flex items-center justify-between w-full text-white text-xs font-bold truncate">
                                <div className="flex items-center gap-1.5 truncate">
                                  <Lock className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate capitalize">Blocked - {capsule.reason.replace('_', ' ')}</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Debug Info */}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Block Dates Modal */}
      <Dialog open={isBlockModalOpen} onOpenChange={setIsBlockModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Block Dates</DialogTitle>
            <DialogDescription>
              Prevent bookings for maintenance, owner use, or other reasons
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBlockSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="start_date" className="font-semibold text-gray-900">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={blockFormData.start_date}
                onChange={(e) => setBlockFormData({ ...blockFormData, start_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date" className="font-semibold text-gray-900">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={blockFormData.end_date}
                onChange={(e) => setBlockFormData({ ...blockFormData, end_date: e.target.value })}
                min={blockFormData.start_date}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason" className="font-semibold text-gray-900">Reason</Label>
              <Select
                value={blockFormData.reason}
                onValueChange={(value) => setBlockFormData({ ...blockFormData, reason: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="owner_use">Owner Use</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes" className="font-semibold text-gray-900">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={blockFormData.notes}
                onChange={(e) => setBlockFormData({ ...blockFormData, notes: e.target.value })}
                placeholder="Internal notes about why these dates are blocked..."
                className="min-h-[100px]"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBlockModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createBlockedDate.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {createBlockedDate.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Blocking...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Block Dates
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Booking Details Modal */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Booking Details</DialogTitle>
            <DialogDescription>
              {selectedBooking?.booking_id}
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-700" />
                  <div>
                    <p className="text-xs text-gray-600">Guest Name</p>
                    <p className="font-bold text-gray-900">{selectedBooking.guest_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-gray-700" />
                  <div>
                    <p className="text-xs text-gray-600">Stay Period</p>
                    <p className="font-bold text-gray-900">
                      {formatDate(selectedBooking.check_in_date)} - {formatDate(selectedBooking.check_out_date)}
                    </p>
                  </div>
                </div>
                {selectedBooking.number_of_guests && (
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-700" />
                    <div>
                      <p className="text-xs text-gray-600">Guests</p>
                      <p className="font-bold text-gray-900">{selectedBooking.number_of_guests}</p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-600">Nights</p>
                  <p className="font-bold text-gray-900">{selectedBooking.nights}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedBooking(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setSelectedBooking(null);
                router.push(`/pms/bookings/${selectedBooking?.id}`);
              }}
              className="bg-[#C4A572] hover:bg-[#B39562]"
            >
              View Full Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
