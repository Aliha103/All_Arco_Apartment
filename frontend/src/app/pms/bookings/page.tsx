'use client';

import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Ban,
  Calendar,
  Users,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpDown,
  ChevronDown,
  X,
  Loader2,
  Mail,
  CreditCard,
  RefreshCw,
  Layers,
  AlertCircle,
  TrendingUp,
  FileText,
  Sparkles,
} from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BookingFormModal from '@/components/pms/BookingFormModal';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const BRAND_COLOR = '#C4A572';
const BRAND_COLOR_HOVER = '#B39562';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-amber-500',
    textColor: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: Clock,
  },
  confirmed: {
    label: 'Confirmed',
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: CheckCircle2,
  },
  paid: {
    label: 'Paid',
    color: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    icon: DollarSign,
  },
  checked_in: {
    label: 'Checked In',
    color: 'bg-violet-500',
    textColor: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    icon: CheckCircle2,
  },
  checked_out: {
    label: 'Checked Out',
    color: 'bg-slate-500',
    textColor: 'text-slate-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-rose-500',
    textColor: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    icon: XCircle,
  },
};

const PAYMENT_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  partial: { label: 'Partial', color: 'bg-orange-100 text-orange-700' },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700' },
  refunded: { label: 'Refunded', color: 'bg-slate-100 text-slate-700' },
};

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

const TableRowSkeleton = memo(() => (
  <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 animate-pulse">
    <div className="col-span-1 h-4 bg-gray-200 rounded" />
    <div className="col-span-2 h-4 bg-gray-200 rounded" />
    <div className="col-span-2 h-4 bg-gray-200 rounded" />
    <div className="col-span-2 h-4 bg-gray-200 rounded" />
    <div className="col-span-1 h-4 bg-gray-200 rounded" />
    <div className="col-span-1 h-4 bg-gray-200 rounded" />
    <div className="col-span-1 h-4 bg-gray-200 rounded" />
    <div className="col-span-2 h-4 bg-gray-200 rounded" />
  </div>
));

TableRowSkeleton.displayName = 'TableRowSkeleton';

// ============================================================================
// TABLE ROW COMPONENT (MEMOIZED FOR PERFORMANCE)
// ============================================================================

interface BookingRowProps {
  booking: any;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onAction: (action: string, booking: any) => void;
  style?: React.CSSProperties;
}

const BookingRow = memo(({ booking, isSelected, onSelect, onAction, style }: BookingRowProps) => {
  const statusConfig = STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const paymentConfig = PAYMENT_STATUS_CONFIG[booking.payment_status as keyof typeof PAYMENT_STATUS_CONFIG] || PAYMENT_STATUS_CONFIG.pending;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      style={style}
      className={`grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${
        isSelected ? 'bg-blue-50/30 border-l-4 border-l-blue-500' : ''
      }`}
    >
      {/* Checkbox */}
      <div className="col-span-1 flex items-center">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(booking.id)}
          className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
        />
      </div>

      {/* Booking ID & Status Indicator */}
      <div className="col-span-2 flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${statusConfig.color} shadow-sm`} />
        <span className="font-semibold text-sm text-gray-900 tracking-tight">{booking.booking_id}</span>
      </div>

      {/* Guest Info */}
      <div className="col-span-2 flex flex-col justify-center min-w-0">
        <p className="font-medium text-sm text-gray-900 truncate">{booking.guest_name}</p>
        <p className="text-xs text-gray-500 truncate flex items-center gap-1">
          <Mail className="w-3 h-3" />
          {booking.guest_email}
        </p>
      </div>

      {/* Check-in & Check-out */}
      <div className="col-span-2 flex items-center gap-3 text-sm">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 mb-0.5">Check-in</span>
          <span className="font-medium text-gray-900">{formatDate(booking.check_in_date)}</span>
        </div>
        <span className="text-gray-300">→</span>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 mb-0.5">Check-out</span>
          <span className="font-medium text-gray-900">{formatDate(booking.check_out_date)}</span>
        </div>
      </div>

      {/* Guests */}
      <div className="col-span-1 flex items-center">
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-900">{booking.guests || booking.number_of_guests}</span>
        </div>
      </div>

      {/* Status Badge */}
      <div className="col-span-1 flex items-center">
        <Badge className={`${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor} border text-xs font-semibold px-2 py-1`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {statusConfig.label}
        </Badge>
      </div>

      {/* Payment Status */}
      <div className="col-span-1 flex items-center">
        <Badge className={`${paymentConfig.color} text-xs font-medium px-2 py-1 capitalize`}>
          {paymentConfig.label}
        </Badge>
      </div>

      {/* Total Price */}
      <div className="col-span-1 flex items-center">
        <span className="font-bold text-sm text-gray-900">{formatCurrency(booking.total_price)}</span>
      </div>

      {/* Actions */}
      <div className="col-span-1 flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
              <MoreHorizontal className="w-4 h-4 text-gray-600" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onAction('view', booking)}>
              <Eye className="w-4 h-4 mr-2 text-gray-600" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('edit', booking)}>
              <Edit className="w-4 h-4 mr-2 text-gray-600" />
              Edit Booking
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction('cancel', booking)} className="text-rose-600 focus:text-rose-700">
              <Ban className="w-4 h-4 mr-2" />
              Cancel Booking
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
});

BookingRow.displayName = 'BookingRow';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BookingsPage() {
  // State Management
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [detailsBooking, setDetailsBooking] = useState<any>(null);
  const [cancelBooking, setCancelBooking] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const queryClient = useQueryClient();
  const parentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced search
  const debouncedSearch = useDebouncedValue(search, 300);

  // Fetch bookings
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
    gcTime: 300000,
  });

  // Sorted bookings (memoized)
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

  // Virtual scrolling
  const rowVirtualizer = useVirtualizer({
    count: sortedBookings.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 15,
  });

  // Selection handlers
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

  // Action handlers
  const handleAction = useCallback(
    (action: string, booking: any) => {
      switch (action) {
        case 'view':
          setDetailsBooking(booking);
          break;
        case 'edit':
          router.push(`/pms/bookings/${booking.id}`);
          break;
        case 'cancel':
          setCancelBooking(booking);
          break;
      }
    },
    [router]
  );

  // Clear filters
  const clearFilters = () => {
    setSearch('');
    setStatusFilter([]);
    setDateFrom('');
    setDateTo('');
  };

  // Toggle status filter
  const toggleStatusFilter = (status: string) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const hasActiveFilters = search || statusFilter.length > 0 || dateFrom || dateTo;
  const hasSelections = selectedBookings.size > 0;

  // Calculate stats
  const stats = useMemo(() => {
    if (!sortedBookings.length) return { total: 0, pending: 0, confirmed: 0, revenue: 0 };

    return {
      total: sortedBookings.length,
      pending: sortedBookings.filter((b: any) => b.status === 'pending').length,
      confirmed: sortedBookings.filter((b: any) => b.status === 'confirmed' || b.status === 'paid').length,
      revenue: sortedBookings.reduce((sum: number, b: any) => sum + parseFloat(b.total_price || 0), 0),
    };
  }, [sortedBookings]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Bookings</h1>
                <p className="text-sm text-gray-500 mt-0.5">Manage all property reservations</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2 border-2"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="gap-2 border-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-2 shadow-lg shadow-blue-500/30"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              <Plus className="w-4 h-4" />
              New Booking
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-2 border-gray-100 hover:border-blue-200 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Bookings</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="border-2 border-gray-100 hover:border-amber-200 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pending}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-2 border-gray-100 hover:border-emerald-200 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Confirmed</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.confirmed}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="border-2 border-gray-100 hover:border-violet-200 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.revenue)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-violet-50">
                    <TrendingUp className="w-6 h-6 text-violet-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="border-2 border-gray-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by booking ID, guest name, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-12 h-12 border-2 text-base focus:border-blue-500 transition-colors"
                />
                {isFetching && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                )}
              </div>

              {/* Date Filters */}
              <div className="flex gap-3">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-12 border-2 w-full lg:w-44"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom}
                  className="h-12 border-2 w-full lg:w-44"
                />
              </div>

              {/* Filter Toggle */}
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowFilters(!showFilters)}
                className={`border-2 ${showFilters ? 'bg-gray-50' : ''}`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {statusFilter.length > 0 && (
                  <Badge className="ml-2 bg-blue-600 text-white">{statusFilter.length}</Badge>
                )}
              </Button>
            </div>

            {/* Status Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                      const isActive = statusFilter.includes(key);
                      const Icon = config.icon;
                      return (
                        <Button
                          key={key}
                          variant={isActive ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleStatusFilter(key)}
                          className={`${
                            isActive
                              ? `${config.bgColor} ${config.textColor} ${config.borderColor} border-2 hover:${config.bgColor}`
                              : 'border-2'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 mr-1.5" />
                          {config.label}
                        </Button>
                      );
                    })}
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Clear All
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {hasSelections && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg shadow-blue-500/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{selectedBookings.size} bookings selected</p>
                      <p className="text-xs text-gray-600">Choose a bulk action to perform</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2 border-2">
                      <Download className="w-4 h-4" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 border-2 text-rose-600 hover:bg-rose-50">
                      <Ban className="w-4 h-4" />
                      Cancel
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedBookings(new Set())}
                      className="text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bookings Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card className="border-2 border-gray-100 shadow-md overflow-hidden">
          <CardHeader className="border-b-2 border-gray-100 bg-gradient-to-r from-gray-50 via-white to-gray-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900">All Bookings</CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">{sortedBookings.length} total reservations</p>
                </div>
              </div>

              {/* Sort Controls */}
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 border-2">
                      <ArrowUpDown className="w-4 h-4" />
                      Sort: {sortBy}
                      <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortBy('date')}>
                      <Calendar className="w-4 h-4 mr-2" />
                      Date
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('name')}>
                      <Users className="w-4 h-4 mr-2" />
                      Guest Name
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('amount')}>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Amount
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="border-2 px-3"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="divide-y divide-gray-100">
                {[...Array(8)].map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))}
              </div>
            ) : sortedBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-4">
                  <Calendar className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No bookings found</h3>
                <p className="text-sm text-gray-500 text-center max-w-md mb-6">
                  {hasActiveFilters
                    ? 'Try adjusting your search criteria or filters'
                    : 'Get started by creating your first booking'}
                </p>
                {hasActiveFilters ? (
                  <Button variant="outline" onClick={clearFilters} className="gap-2 border-2">
                    <X className="w-4 h-4" />
                    Clear Filters
                  </Button>
                ) : (
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="gap-2 shadow-lg"
                    style={{ backgroundColor: BRAND_COLOR }}
                  >
                    <Plus className="w-4 h-4" />
                    Create First Booking
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b-2 border-gray-200 sticky top-0 z-10">
                  <div className="col-span-1 flex items-center">
                    <Checkbox
                      checked={selectedBookings.size === sortedBookings.length && sortedBookings.length > 0}
                      onCheckedChange={handleSelectAll}
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Booking ID</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Guest</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Dates</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Guests</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Status</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Payment</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Total</p>
                  </div>
                  <div className="col-span-1" />
                </div>

                {/* Virtual Table Body */}
                <div
                  ref={parentRef}
                  className="overflow-auto"
                  style={{ height: '520px' }}
                >
                  <div
                    style={{
                      height: `${rowVirtualizer.getTotalSize()}px`,
                      position: 'relative',
                    }}
                  >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const booking = sortedBookings[virtualRow.index];
                      return (
                        <BookingRow
                          key={booking.id}
                          booking={booking}
                          isSelected={selectedBookings.has(booking.id)}
                          onSelect={handleSelectBooking}
                          onAction={handleAction}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create Booking Modal */}
      <BookingFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Details Dialog */}
      <Dialog open={!!detailsBooking} onOpenChange={(open) => !open && setDetailsBooking(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Booking Details
            </DialogTitle>
            <DialogDescription>
              Complete information for {detailsBooking?.booking_id}
            </DialogDescription>
          </DialogHeader>
          {detailsBooking && (
            <div className="space-y-6 mt-4">
              {/* Status */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Booking ID</p>
                  <p className="text-xl font-bold text-gray-900">{detailsBooking.booking_id}</p>
                </div>
                <Badge className={`${STATUS_CONFIG[detailsBooking.status as keyof typeof STATUS_CONFIG]?.bgColor} ${STATUS_CONFIG[detailsBooking.status as keyof typeof STATUS_CONFIG]?.textColor} ${STATUS_CONFIG[detailsBooking.status as keyof typeof STATUS_CONFIG]?.borderColor} border-2 text-sm font-semibold px-3 py-1.5`}>
                  {STATUS_CONFIG[detailsBooking.status as keyof typeof STATUS_CONFIG]?.label}
                </Badge>
              </div>

              {/* Guest Info */}
              <div className="p-6 rounded-xl bg-blue-50 border-2 border-blue-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                  Guest Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">Name</p>
                    <p className="font-semibold text-gray-900">{detailsBooking.guest_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">Email</p>
                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {detailsBooking.guest_email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">Guests</p>
                    <p className="font-semibold text-gray-900">{detailsBooking.guests || detailsBooking.number_of_guests}</p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="p-6 rounded-xl bg-violet-50 border-2 border-violet-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5 text-violet-600" />
                  Stay Dates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">Check-in</p>
                    <p className="font-semibold text-gray-900 text-lg">{formatDate(detailsBooking.check_in_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">Check-out</p>
                    <p className="font-semibold text-gray-900 text-lg">{formatDate(detailsBooking.check_out_date)}</p>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="p-6 rounded-xl bg-emerald-50 border-2 border-emerald-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  Payment Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">Total Amount</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(detailsBooking.total_price)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">Payment Status</p>
                    <Badge className={`${PAYMENT_STATUS_CONFIG[detailsBooking.payment_status as keyof typeof PAYMENT_STATUS_CONFIG]?.color} text-sm font-medium px-3 py-1.5 mt-1 capitalize`}>
                      {detailsBooking.payment_status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Special Requests */}
              {detailsBooking.special_requests && (
                <div className="p-6 rounded-xl bg-gray-50 border-2 border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-gray-600" />
                    Special Requests
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{detailsBooking.special_requests}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetailsBooking(null)} className="border-2">
              Close
            </Button>
            <Button
              onClick={() => {
                setDetailsBooking(null);
                router.push(`/pms/bookings/${detailsBooking?.id}`);
              }}
              className="shadow-lg"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog
        open={!!cancelBooking}
        onOpenChange={(open) => {
          if (!open) {
            setCancelBooking(null);
            setCancelReason('');
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Ban className="w-5 h-5 text-rose-600" />
              Cancel Booking
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Please provide a cancellation reason.
            </DialogDescription>
          </DialogHeader>
          {cancelBooking && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-200">
                <p className="text-sm text-gray-900 font-medium">
                  <strong className="text-gray-700">Booking:</strong> {cancelBooking.booking_id}
                </p>
                <p className="text-sm text-gray-900 font-medium mt-1">
                  <strong className="text-gray-700">Guest:</strong> {cancelBooking.guest_name}
                </p>
                <p className="text-sm text-gray-900 font-medium mt-1">
                  <strong className="text-gray-700">Check-in:</strong> {formatDate(cancelBooking.check_in_date)}
                </p>
              </div>

              <div>
                <Label htmlFor="cancelReason" className="text-sm font-semibold text-gray-900">
                  Cancellation Reason <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  id="cancelReason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please provide a detailed reason for cancellation..."
                  className="mt-2 min-h-[120px] border-2 resize-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  This reason will be recorded in the audit trail and may be shared with the guest.
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCancelBooking(null);
                setCancelReason('');
              }}
              className="border-2"
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              disabled={!cancelReason.trim()}
              onClick={() => {
                if (cancelReason.trim()) {
                  console.log('Cancelling booking:', cancelBooking.id, 'Reason:', cancelReason);
                  setCancelBooking(null);
                  setCancelReason('');
                  refetch();
                }
              }}
              className="bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-500/30"
            >
              <Ban className="w-4 h-4 mr-2" />
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
