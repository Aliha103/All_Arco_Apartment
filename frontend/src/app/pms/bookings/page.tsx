'use client';

import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  Plus,
  MoreHorizontal,
  Eye,
  Ban,
  Calendar as CalendarIcon,
  Users,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  Lock,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { logResourceAction } from '@/lib/auditLogger';
import BookingSidePanel from '@/components/pms/BookingSidePanel';
import ViewToggle from '@/components/pms/ViewToggle';

// ============================================================================
// Types & Configuration
// ============================================================================

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Clock,
  },
  confirmed: {
    label: 'Confirmed',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: CheckCircle2,
  },
  paid: {
    label: 'Paid',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: DollarSign,
  },
  checked_in: {
    label: 'Checked In',
    color: 'bg-violet-100 text-violet-800 border-violet-200',
    icon: CheckCircle2,
  },
  checked_out: {
    label: 'Checked Out',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: XCircle,
  },
  no_show: {
    label: 'No Show',
    color: 'bg-slate-100 text-slate-800 border-slate-200',
    icon: XCircle,
  },
};

const PAYMENT_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  partial: { label: 'Partial', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  paid: { label: 'Paid', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  refunded: { label: 'Refunded', color: 'bg-gray-50 text-gray-700 border-gray-200' },
};

const COLORS = {
  primary: '#C4A572',
  blue: '#3B82F6',
  green: '#10B981',
  red: '#EF4444',
  purple: '#8B5CF6',
  orange: '#F59E0B',
};

const BOOKING_COLORS = [COLORS.blue, COLORS.purple, COLORS.green, COLORS.orange];

// Copy to clipboard
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success('Copied to clipboard');
};

// Debounce hook
function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

const createDateKey = (year: number, month: number, day: number): string =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

// ============================================================================
// Booking Row Component (for List View)
// ============================================================================

interface BookingRowProps {
  booking: any;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onAction: (action: string, booking: any) => void;
}

const BookingRow = memo(({ booking, isSelected, onSelect, onAction }: BookingRowProps) => {
  const statusConfig = STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const amountPaid = Number(booking.amount_paid || booking.paid_amount || 0);
  const normalizedPaymentStatus =
    booking.payment_status === 'partial' && amountPaid <= 0 ? 'unpaid' : booking.payment_status;
  const paymentConfig =
    PAYMENT_STATUS_CONFIG[normalizedPaymentStatus as keyof typeof PAYMENT_STATUS_CONFIG] || PAYMENT_STATUS_CONFIG.pending;
  const arcoRef = booking.booking_id;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyToClipboard(arcoRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Desktop Table Row */}
      <tr
        className="border-b hover:bg-gray-50 hidden xl:table-row cursor-pointer"
        onClick={() => onAction('view', booking)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 group">
            <span className="font-semibold text-sm text-gray-900">{arcoRef}</span>
            <button onClick={(e) => { e.stopPropagation(); handleCopy(); }} className="opacity-0 group-hover:opacity-100">
              {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
            </button>
          </div>
        </td>
        <td className="px-4 py-3">
          <div>
            <p className="font-medium text-sm text-gray-900">{booking.guest_name}</p>
            <p className="text-xs text-gray-600">{booking.guest_email}</p>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm">
            <div className="font-medium text-gray-900">{formatDate(booking.check_in_date)}</div>
            <div className="text-gray-600">{formatDate(booking.check_out_date)}</div>
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge className="bg-gray-100 text-gray-800 border text-xs font-semibold capitalize">
            {(booking.booking_source || 'direct').replace('_', ' ')}
          </Badge>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm font-semibold text-gray-900">
            {(booking.guests || booking.number_of_guests || 0)} guest{(booking.guests || booking.number_of_guests || 0) === 1 ? '' : 's'}
          </span>
        </td>
        <td className="px-4 py-3">
          <Badge className={`${statusConfig.color} border text-xs font-semibold`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </td>
        <td className="px-4 py-3">
          <Badge className={`${paymentConfig.color} border text-xs font-semibold capitalize`}>
            {paymentConfig.label}
          </Badge>
        </td>
        <td className="px-4 py-3">
          <span className="font-bold text-sm text-gray-900">{formatCurrency(booking.total_price)}</span>
        </td>
      </tr>

      {/* Mobile/Tablet Card View */}
      <div className="xl:hidden border-b p-4 hover:bg-gray-50 cursor-pointer" onClick={() => onAction('view', booking)}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 group">
              <span className="font-bold text-sm text-gray-900">{arcoRef}</span>
              <button onClick={(e) => { e.stopPropagation(); handleCopy(); }}>
                {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
              </button>
            </div>
          </div>

          <div>
            <p className="font-semibold text-sm text-gray-900">{booking.guest_name}</p>
            <p className="text-xs text-gray-600">{booking.guest_email}</p>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <CalendarIcon className="w-4 h-4" />
              <span>{formatDate(booking.check_in_date)}</span>
              <span>→</span>
              <span>{formatDate(booking.check_out_date)}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-700">
              <Users className="w-4 h-4" />
              <span>{booking.guests || booking.number_of_guests || 0}</span>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge className={`${statusConfig.color} border text-xs font-semibold`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
              <Badge className={`${paymentConfig.color} border text-xs font-semibold capitalize`}>
                {paymentConfig.label}
              </Badge>
            </div>
            <span className="font-bold text-sm text-gray-900">{formatCurrency(booking.total_price)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-gray-100 text-gray-800 border text-xs font-semibold capitalize">
              {(booking.booking_source || 'direct').replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </div>
    </>
  );
});

BookingRow.displayName = 'BookingRow';

// ============================================================================
// Main Component
// ============================================================================

export default function BookingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const auditUser = user && (user as any).role_info ? user : null;
  const calendarRef = useRef<HTMLDivElement>(null);

  // View state (list or calendar)
  const initialView = (searchParams?.get('view') as 'list' | 'calendar') || 'list';
  const [view, setView] = useState<'list' | 'calendar'>(initialView);

  // List view state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());

  // Calendar view state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockFormData, setBlockFormData] = useState({
    start_date: '',
    end_date: '',
    reason: 'maintenance',
    notes: '',
  });

  // Side panel state
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [sidePanelMode, setSidePanelMode] = useState<'view' | 'edit' | 'create'>('view');
  const [selectedBookingId, setSelectedBookingId] = useState<string | undefined>(undefined);

  // Cancel dialog state
  const [cancelBooking, setCancelBooking] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');

  const debouncedSearch = useDebouncedValue(search, 300);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  // Fetch bookings (for list view)
  const { data: bookings, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['all-bookings', debouncedSearch, statusFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params: any = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter.length > 0) params.status = statusFilter.join(',');
      if (dateFrom) params.check_in_date_from = dateFrom;
      if (dateTo) params.check_in_date_to = dateTo;
      const response = await api.bookings.list(params);
      return response.data.results || response.data;
    },
    staleTime: 30000,
  });

  // Fetch calendar data (for calendar view)
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const { data: calendarData, isLoading: calendarLoading } = useQuery({
    queryKey: ['calendar', currentYear, currentMonth],
    queryFn: async () => {
      const response = await api.bookings.calendar(currentYear, currentMonth);
      return response.data;
    },
    enabled: view === 'calendar',
    staleTime: 30000,
  });

  // ============================================================================
  // Mutations
  // ============================================================================

  const cancelBookingMutation = useMutation({
    mutationFn: (data: { id: string; reason: string }) =>
      api.bookings.update(data.id, {
        status: 'cancelled',
        cancellation_reason: data.reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setCancelBooking(null);
      setCancelReason('');
      toast.success('Booking cancelled successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to cancel booking');
    },
  });

  const createBlockedDate = useMutation({
    mutationFn: (data: any) => api.blockedDates.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setIsBlockModalOpen(false);
      setBlockFormData({ start_date: '', end_date: '', reason: 'maintenance', notes: '' });
      toast.success('Dates blocked successfully');
    },
    onError: () => {
      toast.error('Failed to block dates');
    },
  });

  const deleteBlockedDate = useMutation({
    mutationFn: (id: string) => api.blockedDates.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success('Blocked dates removed');
    },
    onError: () => {
      toast.error('Failed to delete blocked dates');
    },
  });

  // ============================================================================
  // List View Logic
  // ============================================================================

  // Sort bookings
  const sortedBookings = useMemo(() => {
    if (!bookings) return [];
    const sorted = [...bookings].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.check_in_date).getTime() - new Date(b.check_in_date).getTime();
          break;
        case 'name':
          comparison = a.guest_name.localeCompare(b.guest_name);
          break;
        case 'amount':
          comparison = parseFloat(a.total_price) - parseFloat(b.total_price);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [bookings, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedBookings.length / itemsPerPage);
  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedBookings.slice(startIndex, endIndex);
  }, [sortedBookings, currentPage, itemsPerPage]);

  // Stats
  const stats = useMemo(() => {
    if (!sortedBookings.length) return { total: 0, cancelled: 0, confirmed: 0, noShow: 0 };

    return sortedBookings.reduce(
      (acc: { total: number; cancelled: number; confirmed: number; noShow: number }, b: any) => {
        const status = (b.status || '').toLowerCase();
        acc.total += 1;
        if (status === 'cancelled' || status === 'canceled') acc.cancelled += 1;
        if (status === 'confirmed' || status === 'paid') acc.confirmed += 1;
        if (status === 'no_show' || status === 'no-show' || status === 'noshow') acc.noShow += 1;
        return acc;
      },
      { total: 0, cancelled: 0, confirmed: 0, noShow: 0 }
    );
  }, [sortedBookings]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, dateFrom, dateTo, sortBy, sortOrder]);

  // ============================================================================
  // Calendar View Logic
  // ============================================================================

  const calendarGrid = useMemo(() => {
    if (!calendarData || view !== 'calendar') return [];

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
      const calendarDate = calendarData?.find((d: any) => d.date === dateStr);
      days.push({
        day,
        date: dateStr,
        calendarDate,
        dayOfWeek: (startingDayOfWeek + day - 1) % 7,
        isToday: dateStr === createDateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()),
      });
    }

    return days;
  }, [currentDate, calendarData, view]);

  const bookingCapsules = useMemo(() => {
    if (!calendarData || view !== 'calendar') return [];

    const capsules: any[] = [];
    const processedBookings = new Set<string>();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    calendarData.forEach((dateData: any) => {
      if (dateData.booking && !processedBookings.has(dateData.booking.id)) {
        const booking = dateData.booking;
        processedBookings.add(booking.id);

        const checkIn = new Date(booking.check_in_date);
        const checkOut = new Date(booking.check_out_date);

        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);

        if (checkOut < monthStart || checkIn > monthEnd) return;

        const startDay = checkIn.getMonth() === month ? checkIn.getDate() : 1;
        const endDay = checkOut.getMonth() === month ? checkOut.getDate() : new Date(year, month + 1, 0).getDate();
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const startRow = Math.floor((firstDayOfMonth + startDay - 1) / 7);
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
  }, [calendarData, currentDate, view]);

  const blockedCapsules = useMemo(() => {
    if (!calendarData || view !== 'calendar') return [];

    const capsules: any[] = [];
    const processedBlocked = new Set<string>();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    calendarData.forEach((dateData: any) => {
      if (dateData.blocked && !processedBlocked.has(dateData.blocked.id)) {
        const blocked = dateData.blocked;
        processedBlocked.add(blocked.id);

        const blockedDates = calendarData.filter((d: any) => d.blocked?.id === blocked.id);

        if (blockedDates.length === 0) return;

        const dates = blockedDates.map((d: any) => new Date(d.date)).sort((a: Date, b: Date) => a.getTime() - b.getTime());
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];

        const startDay = startDate.getDate();
        const endDay = Math.max(startDay, endDate.getDate());
        const nights = Math.max(1, endDay - startDay + 1);
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
  }, [calendarData, currentDate, view]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleViewChange = (newView: 'list' | 'calendar') => {
    setView(newView);
    // Close side panel when switching views
    setSidePanelOpen(false);
    // Update URL parameter
    const params = new URLSearchParams(window.location.search);
    params.set('view', newView);
    router.replace(`/pms/bookings?${params.toString()}`);
  };

  const handleAction = useCallback((action: string, booking: any) => {
    switch (action) {
      case 'view':
        setSelectedBookingId(booking.id);
        setSidePanelMode('view');
        setSidePanelOpen(true);
        if (auditUser?.id) {
          logResourceAction('booking_view', auditUser as any, 'booking', booking.id, { source: 'list' });
        }
        break;
      case 'edit':
        setSelectedBookingId(booking.id);
        setSidePanelMode('edit');
        setSidePanelOpen(true);
        break;
      case 'cancel':
        setCancelBooking(booking);
        break;
    }
  }, [auditUser]);

  const handleNewBooking = () => {
    setSelectedBookingId(undefined);
    setSidePanelMode('create');
    setSidePanelOpen(true);
  };

  const handleSidePanelClose = () => {
    setSidePanelOpen(false);
    setSelectedBookingId(undefined);
  };

  const handleSidePanelSuccess = () => {
    refetch();
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter([]);
    setDateFrom('');
    setDateTo('');
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const handleSelectAll = useCallback(() => {
    if (selectedBookings.size === sortedBookings.length) {
      setSelectedBookings(new Set());
    } else {
      setSelectedBookings(new Set(sortedBookings.map((b: any) => b.id)));
    }
  }, [sortedBookings, selectedBookings]);

  const handleSelectBooking = useCallback((id: string) => {
    setSelectedBookings((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Calendar handlers
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

    const status = dayData.calendarDate?.status;
    if (dayData.calendarDate?.booking) {
      setSelectedBookingId(dayData.calendarDate.booking.id);
      setSidePanelMode('view');
      setSidePanelOpen(true);
      return;
    }
    if (status === 'available') {
      setBlockFormData({
        start_date: dayData.date,
        end_date: dayData.date,
        reason: 'maintenance',
        notes: '',
      });
      setIsBlockModalOpen(true);
    }
  }, []);

  const handleCapsuleClick = useCallback((capsule: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBookingId(capsule.id);
    setSidePanelMode('view');
    setSidePanelOpen(true);
  }, []);

  const handleBlockSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    createBlockedDate.mutate(blockFormData);
  }, [blockFormData, createBlockedDate]);

  const getDateClassName = useCallback((calendarDate?: any, isToday?: boolean) => {
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

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
            <p className="text-sm text-gray-500">Manage all property reservations</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <ViewToggle value={view} onChange={handleViewChange} />
            <Button variant="outline" size="sm" className="text-black flex-1 sm:flex-none">
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button onClick={handleNewBooking} className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">New Booking</span>
            </Button>
          </div>
        </div>

        {/* List View */}
        {view === 'list' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Total Bookings</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <CalendarIcon className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Canceled</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{stats.cancelled}</p>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-lg">
                      <XCircle className="w-5 h-5 text-rose-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Confirmed</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{stats.confirmed}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">No Show</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{stats.noShow}</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search & Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by booking reference, guest name, or email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 text-black placeholder:text-gray-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:flex gap-3">
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="sm:w-40 text-black" />
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="sm:w-40 text-black" />
                    <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="text-black col-span-2 sm:col-span-1">
                      <Filter className="w-4 h-4 mr-2" />
                      Filters
                      {statusFilter.length > 0 && <Badge className="ml-2 bg-blue-600 text-white">{statusFilter.length}</Badge>}
                    </Button>
                  </div>
                </div>

                {showFilters && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <Button
                        key={key}
                        variant={statusFilter.includes(key) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleStatusFilter(key)}
                        className={statusFilter.includes(key) ? config.color : ''}
                      >
                        {config.label}
                      </Button>
                    ))}
                    {(search || statusFilter.length > 0 || dateFrom || dateTo) && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="text-rose-600">
                        <X className="w-4 h-4 mr-2" />
                        Clear
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardHeader className="border-b">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <CardTitle className="text-black text-lg sm:text-xl">All Bookings ({sortedBookings.length})</CardTitle>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="text-black flex-1 sm:flex-none">
                          <ArrowUpDown className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Sort: {sortBy}</span>
                          <span className="sm:hidden">{sortBy}</span>
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setSortBy('date')}>Date</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy('name')}>Guest Name</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy('amount')}>Amount</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="text-black">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                  </div>
                ) : sortedBookings.length === 0 ? (
                  <div className="p-12 text-center">
                    <CalendarIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {search || statusFilter.length > 0 ? 'Try adjusting your filters' : 'Get started by creating your first booking'}
                    </p>
                    <Button onClick={handleNewBooking} className="bg-blue-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Booking
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden xl:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">ARCO Reference</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Guest</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Dates</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Source</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Guests</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Payment</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedBookings.map((booking: any) => (
                            <BookingRow
                              key={booking.id}
                              booking={booking}
                              isSelected={selectedBookings.has(booking.id)}
                              onSelect={handleSelectBooking}
                              onAction={handleAction}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile/Tablet Card View */}
                    <div className="xl:hidden">
                      {paginatedBookings.map((booking: any) => (
                        <BookingRow
                          key={booking.id}
                          booking={booking}
                          isSelected={selectedBookings.has(booking.id)}
                          onSelect={handleSelectBooking}
                          onAction={handleAction}
                        />
                      ))}
                    </div>
                  </>
                )}
              </CardContent>

              {/* Pagination */}
              {!isLoading && sortedBookings.length > 0 && (
                <div className="border-t px-4 py-3 bg-gray-50">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                      <span className="hidden sm:inline">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedBookings.length)} of {sortedBookings.length} bookings
                      </span>
                      <span className="sm:hidden">
                        {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, sortedBookings.length)} of {sortedBookings.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">Per page:</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 w-12 sm:w-16 text-xs sm:text-sm">
                              {itemsPerPage}
                              <ChevronDown className="w-3 h-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {[10, 25, 50, 100].map((size) => (
                              <DropdownMenuItem
                                key={size}
                                onClick={() => {
                                  setItemsPerPage(size);
                                  setCurrentPage(1);
                                }}
                              >
                                {size}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>

                        <div className="hidden sm:flex items-center gap-1">
                          {(() => {
                            const pages = [];
                            const maxVisible = 5;
                            let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                            let endPage = Math.min(totalPages, startPage + maxVisible - 1);

                            if (endPage - startPage < maxVisible - 1) {
                              startPage = Math.max(1, endPage - maxVisible + 1);
                            }

                            if (startPage > 1) {
                              pages.push(
                                <Button
                                  key={1}
                                  variant={currentPage === 1 ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(1)}
                                  className="h-8 w-8 p-0"
                                >
                                  1
                                </Button>
                              );
                              if (startPage > 2) {
                                pages.push(<span key="ellipsis1" className="px-2 text-gray-400">...</span>);
                              }
                            }

                            for (let i = startPage; i <= endPage; i++) {
                              pages.push(
                                <Button
                                  key={i}
                                  variant={currentPage === i ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(i)}
                                  className={`h-8 w-8 p-0 ${currentPage === i ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                                >
                                  {i}
                                </Button>
                              );
                            }

                            if (endPage < totalPages) {
                              if (endPage < totalPages - 1) {
                                pages.push(<span key="ellipsis2" className="px-2 text-gray-400">...</span>);
                              }
                              pages.push(
                                <Button
                                  key={totalPages}
                                  variant={currentPage === totalPages ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(totalPages)}
                                  className="h-8 w-8 p-0"
                                >
                                  {totalPages}
                                </Button>
                              );
                            }

                            return pages;
                          })()}
                        </div>

                        <div className="sm:hidden flex items-center">
                          <span className="text-xs text-gray-600 px-2">
                            Page {currentPage} of {totalPages}
                          </span>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </>
        )}

        {/* Calendar View */}
        {view === 'calendar' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
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
                {calendarLoading ? (
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
                      <div className="absolute inset-0 pointer-events-none" style={{ top: '0px' }}>
                        <AnimatePresence>
                          {(() => {
                            const cellWidth = `calc((100% - 6 * 4px) / 7)`;
                            const cellHeight = 96;
                            const gapSize = 4;
                            const capsuleHeight = 28;
                            const capsuleOffsetY = (cellHeight - capsuleHeight) / 2;

                            const buildSegments = (caps: any[], isBlocked = false) => {
                              const segments: any[] = [];
                              caps.forEach((capsule, idx) => {
                                const year = currentDate.getFullYear();
                                const month = currentDate.getMonth();
                                const firstDayOfMonth = new Date(year, month, 1).getDay();
                                const startIndex = firstDayOfMonth + capsule.startDay - 1;
                                const endIndex = firstDayOfMonth + capsule.endDay - 1;

                                let currentIndex = startIndex;
                                while (currentIndex <= endIndex) {
                                  const gridRow = Math.floor(currentIndex / 7);
                                  const rowEndIndex = Math.min((gridRow + 1) * 7 - 1, endIndex);
                                  const startCol = currentIndex % 7;
                                  const daysInRow = rowEndIndex - currentIndex + 1;
                                  if (daysInRow > 0) {
                                    const isSingleDay = capsule.startDay === capsule.endDay;
                                    const isFirstSegment = currentIndex === startIndex;
                                    const isLastSegment = rowEndIndex === endIndex;
                                    const startOffset = isSingleDay ? 0.15 : isFirstSegment ? 0.55 : 0.05;
                                    const endOffset = isSingleDay ? 0.15 : isLastSegment ? 0.45 : 0.05;
                                    const extraYOffset = isBlocked ? 6 : 0;
                                    segments.push({
                                      key: `${isBlocked ? 'blocked' : 'booking'}-${capsule.id}-${gridRow}-${startCol}`,
                                      top: `${gridRow * (cellHeight + gapSize) + capsuleOffsetY + extraYOffset}px`,
                                      left: `calc(${startCol} * (${cellWidth} + ${gapSize}px) + ${startOffset} * ${cellWidth})`,
                                      width: `calc(${daysInRow} * ${cellWidth} + ${daysInRow - 1} * ${gapSize}px - ${startOffset + endOffset} * ${cellWidth})`,
                                      capsule,
                                      isBlocked,
                                      delay: idx * 0.02,
                                    });
                                  }
                                  currentIndex = rowEndIndex + 1;
                                }
                              });
                              return segments;
                            };

                            const bookingSegments = buildSegments(bookingCapsules, false);
                            const blockedSegments = buildSegments(blockedCapsules, true);
                            const allSegments = [...bookingSegments, ...blockedSegments];

                            return allSegments.map((segment) => {
                              const { capsule, isBlocked } = segment;
                              if (segment.width?.includes('calc') && segment.width.endsWith('calc()')) return null;
                              return (
                                <motion.div
                                  key={segment.key}
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.3, delay: segment.delay }}
                                  className={`absolute pointer-events-auto ${isBlocked ? 'cursor-default' : 'cursor-pointer'}`}
                                  style={{
                                    top: segment.top,
                                    left: segment.left,
                                    width: segment.width,
                                    zIndex: 10,
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isBlocked) {
                                      if (confirm('Delete this blocked range?')) {
                                        deleteBlockedDate.mutate(capsule.id);
                                      }
                                      return;
                                    }
                                    handleCapsuleClick(capsule, e);
                                  }}
                                >
                                  <div
                                    className={`relative h-7 rounded-full shadow-md transition-all duration-200 flex items-center px-3 overflow-hidden ${
                                      isBlocked
                                        ? 'bg-gray-400/80'
                                        : capsule.status === 'cancelled'
                                          ? 'bg-gray-400/60'
                                          : ''
                                    }`}
                                    style={isBlocked || capsule.status === 'cancelled' ? undefined : { backgroundColor: capsule.color }}
                                  >
                                    {isBlocked ? (
                                      <div className="flex items-center gap-1.5 text-white text-xs font-bold truncate">
                                        <Lock className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate capitalize">Blocked - {capsule.reason.replace('_', ' ')}</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between w-full text-white text-xs font-bold truncate">
                                        <span className={`truncate ${capsule.status === 'cancelled' ? 'line-through opacity-75' : ''}`}>
                                          {capsule.guest_name}
                                        </span>
                                        <span className="ml-2 opacity-90 text-[10px]">{capsule.nights}N</span>
                                        {capsule.status === 'cancelled' && (
                                          <span className="ml-1 text-[9px] uppercase">CANCELLED</span>
                                        )}
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
                                  </div>
                                </motion.div>
                              );
                            });
                          })()}
                        </AnimatePresence>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Side Panel */}
      <BookingSidePanel
        isOpen={sidePanelOpen}
        onClose={handleSidePanelClose}
        mode={sidePanelMode}
        bookingId={selectedBookingId}
        onSuccess={handleSidePanelSuccess}
      />

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

      {/* Cancel Dialog */}
      <Dialog open={!!cancelBooking} onOpenChange={(open) => { if (!open) { setCancelBooking(null); setCancelReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {cancelBooking && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm"><strong>Reference:</strong> {cancelBooking.booking_id}</p>
                <p className="text-sm"><strong>Guest:</strong> {cancelBooking.guest_name}</p>
              </div>
              <div>
                <Label>Cancellation Reason *</Label>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Provide a reason for cancellation..."
                  className="mt-2"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelBooking(null); setCancelReason(''); }}>Keep Booking</Button>
            <Button
              variant="destructive"
              disabled={!cancelReason.trim() || cancelBookingMutation.isPending}
              onClick={() => {
                if (cancelBooking) {
                  cancelBookingMutation.mutate({
                    id: cancelBooking.id,
                    reason: cancelReason,
                  });
                }
              }}
            >
              {cancelBookingMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
