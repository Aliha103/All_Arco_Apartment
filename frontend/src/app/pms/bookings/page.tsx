'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Ban,
  Calendar,
  Users,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpDown,
  ChevronDown,
  X,
  Loader2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  RefreshCw,
  Command,
  Layers,
  SlidersHorizontal,
} from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BookingFormModal from '@/components/pms/BookingFormModal';

// ============================================================================
// Hooks & Utilities
// ============================================================================

// Custom debounce hook for ultra-fast search
function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Status configuration with colors and icons
const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: Clock,
    dotColor: 'bg-yellow-500',
  },
  confirmed: {
    label: 'Confirmed',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: CheckCircle2,
    dotColor: 'bg-blue-500',
  },
  paid: {
    label: 'Paid',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: DollarSign,
    dotColor: 'bg-green-500',
  },
  checked_in: {
    label: 'Checked In',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: CheckCircle2,
    dotColor: 'bg-purple-500',
  },
  checked_out: {
    label: 'Checked Out',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: CheckCircle2,
    dotColor: 'bg-gray-500',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: XCircle,
    dotColor: 'bg-red-500',
  },
};

// ============================================================================
// Skeleton Loading Component
// ============================================================================

const BookingRowSkeleton = () => (
  <div className="animate-pulse border-b border-gray-100 p-4">
    <div className="flex items-center gap-4">
      <div className="w-4 h-4 bg-gray-200 rounded"></div>
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-4">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-4 bg-gray-200 rounded w-40"></div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-3 bg-gray-200 rounded w-20"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
          <div className="h-3 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
      <div className="h-8 w-8 bg-gray-200 rounded"></div>
    </div>
  </div>
);

// ============================================================================
// Mobile Card Component
// ============================================================================

const BookingMobileCard = ({ booking, isSelected, onSelect, onAction }: any) => {
  const statusConfig = STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="relative"
    >
      <Card className={`border-2 hover:shadow-lg transition-all duration-200 ${isSelected ? 'border-blue-400 bg-blue-50/30' : 'border-gray-100'}`}>
        <CardContent className="p-4">
          {/* Selection & Actions Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onSelect(booking.id)}
                className="mt-1"
              />
              <div>
                <p className="font-bold text-sm text-gray-900">{booking.booking_id}</p>
                <Badge className={`${statusConfig.color} text-xs mt-1 border`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig.label}
                </Badge>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAction('view', booking)}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction('edit', booking)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAction('cancel', booking)} className="text-red-600">
                  <Ban className="w-4 h-4 mr-2" />
                  Cancel Booking
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Guest Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-gray-700" />
              <span className="font-semibold text-gray-900">{booking.guest_name}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-800">
              <Mail className="w-3 h-3 text-gray-700" />
              {booking.guest_email}
            </div>
          </div>

          {/* Dates */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-gray-700 text-xs">Check-in</p>
                <p className="font-semibold text-gray-900">{formatDate(booking.check_in_date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-gray-700 text-xs">Check-out</p>
                <p className="font-semibold text-gray-900">{formatDate(booking.check_out_date)}</p>
              </div>
            </div>
          </div>

          {/* Price & Guests */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-700" />
              <span className="text-sm font-semibold text-gray-800">{booking.guests} Guests</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm font-bold text-gray-900">{formatCurrency(booking.total_price)}</span>
            </div>
          </div>

          {/* Payment Status */}
          <div className="mt-3">
            <Badge variant="outline" className="text-xs">
              <CreditCard className="w-3 h-3 mr-1" />
              {booking.payment_status}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ============================================================================
// Desktop Table Row Component
// ============================================================================

const BookingTableRow = ({ booking, isSelected, onSelect, onAction, style }: any) => {
  const statusConfig = STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={style}
      className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`}
    >
      <td className="p-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(booking.id)}
        />
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusConfig.dotColor}`}></div>
          <span className="font-bold text-sm text-gray-900">{booking.booking_id}</span>
        </div>
      </td>
      <td className="p-4">
        <div>
          <p className="font-semibold text-sm text-gray-900">{booking.guest_name}</p>
          <p className="text-xs text-gray-700">{booking.guest_email}</p>
        </div>
      </td>
      <td className="p-4 text-sm text-gray-800">{formatDate(booking.check_in_date)}</td>
      <td className="p-4 text-sm text-gray-800">{formatDate(booking.check_out_date)}</td>
      <td className="p-4 text-sm text-gray-800">{booking.guests}</td>
      <td className="p-4">
        <Badge className={`${statusConfig.color} text-xs border`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {statusConfig.label}
        </Badge>
      </td>
      <td className="p-4">
        <Badge variant="outline" className="text-xs">
          {booking.payment_status}
        </Badge>
      </td>
      <td className="p-4 font-bold text-sm text-gray-900">{formatCurrency(booking.total_price)}</td>
      <td className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAction('view', booking)}>
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('edit', booking)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction('cancel', booking)} className="text-red-600">
              <Ban className="w-4 h-4 mr-2" />
              Cancel Booking
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </motion.tr>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export default function BookingsPage() {
  // State Management
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [detailsBooking, setDetailsBooking] = useState<any>(null);
  const [cancelBooking, setCancelBooking] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');

  const queryClient = useQueryClient();
  const parentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced search for performance
  const debouncedSearch = useDebouncedValue(search, 300);

  // Fetch bookings with React Query
  const { data: bookings, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['all-bookings', debouncedSearch, statusFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params: any = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFrom) params.check_in_date_from = dateFrom;
      if (dateTo) params.check_in_date_to = dateTo;
      const response = await api.bookings.list(params);
      return response.data.results || response.data;
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  // Sorted and filtered bookings (memoized for performance)
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

  // Virtual scrolling for desktop table (handles 100k+ rows smoothly)
  const rowVirtualizer = useVirtualizer({
    count: sortedBookings.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 65,
    overscan: 10,
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
    setSelectedBookings(prev => {
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
  const handleAction = useCallback((action: string, booking: any) => {
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
  }, [router]);

  // Clear filters
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setSelectedBookings(new Set());
  };

  // Export function
  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Exporting bookings...');
  };

  // Detect mobile/desktop for responsive layout
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const statuses = ['all', 'pending', 'confirmed', 'paid', 'checked_in', 'checked_out', 'cancelled'];
  const hasActiveFilters = search || statusFilter !== 'all' || dateFrom || dateTo;
  const hasSelections = selectedBookings.size > 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Bookings Management</h1>
          <p className="text-sm sm:text-base text-gray-800 mt-1">
            Manage all property bookings • {sortedBookings.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2 bg-[#C4A572] hover:bg-[#B39562]"
          >
            <Plus className="w-4 h-4" />
            Create Booking
          </Button>
        </div>
      </motion.div>

      {/* Advanced Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border-2 border-gray-100 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            {/* Search & Quick Actions */}
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
                <Input
                  placeholder="Search by booking ID, guest name, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-11 border-2 focus:border-[#C4A572] text-gray-900"
                />
                {isFetching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 animate-spin" />
                )}
              </div>

              <div className="flex gap-2">
                <div className="flex-1 sm:flex-none sm:w-40">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-11 border-2"
                    placeholder="Check-in from"
                  />
                </div>
                <div className="flex-1 sm:flex-none sm:w-40">
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    min={dateFrom}
                    className="h-11 border-2"
                    placeholder="Check-in to"
                  />
                </div>
              </div>
            </div>

            {/* Status Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {statuses.map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className={`capitalize text-xs h-8 ${
                    statusFilter === status
                      ? 'bg-[#C4A572] hover:bg-[#B39562]'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {status.replace('_', ' ')}
                </Button>
              ))}

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-1 text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-3 h-3" />
                  Clear All
                </Button>
              )}

              <div className="ml-auto flex items-center gap-2">
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-32 h-8 text-xs border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="h-8 w-8 p-0 border-2"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="h-8 w-8 p-0 border-2"
                  disabled={isFetching}
                >
                  <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {hasSelections && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-2 border-blue-200 bg-blue-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedBookings.size === sortedBookings.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm font-semibold text-gray-900">
                      {selectedBookings.size} selected
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="w-4 h-4" />
                      Export Selected
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                      Delete Selected
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bookings List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="border-2 border-gray-100 shadow-sm">
          <CardHeader className="border-b-2 border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#C4A572]" />
                All Bookings
                <Badge className="bg-gray-100 text-gray-700 font-bold ml-2">
                  {sortedBookings.length}
                </Badge>
              </CardTitle>

              <div className="lg:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
                  className="gap-2"
                >
                  <Layers className="w-4 h-4" />
                  {viewMode === 'table' ? 'Cards' : 'Table'}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="divide-y divide-gray-100">
                {[...Array(5)].map((_, i) => (
                  <BookingRowSkeleton key={i} />
                ))}
              </div>
            ) : sortedBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Calendar className="w-10 h-10 text-gray-700" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
                <p className="text-sm text-gray-800 text-center max-w-md mb-6">
                  {hasActiveFilters
                    ? "Try adjusting your filters to see more results"
                    : "Create your first booking to get started"}
                </p>
                {hasActiveFilters ? (
                  <Button variant="outline" onClick={clearFilters} className="gap-2">
                    <X className="w-4 h-4" />
                    Clear Filters
                  </Button>
                ) : (
                  <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 bg-[#C4A572] hover:bg-[#B39562]">
                    <Plus className="w-4 h-4" />
                    Create Booking
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="lg:hidden space-y-3 p-4">
                  <AnimatePresence mode="popLayout">
                    {sortedBookings.map((booking: any) => (
                      <BookingMobileCard
                        key={booking.id}
                        booking={booking}
                        isSelected={selectedBookings.has(booking.id)}
                        onSelect={handleSelectBooking}
                        onAction={handleAction}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {/* Desktop Table View with Virtual Scrolling */}
                <div className="hidden lg:block">
                  <div
                    ref={parentRef}
                    className="overflow-auto"
                    style={{ height: '600px' }}
                  >
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0 z-10 border-b-2 border-gray-200">
                        <tr>
                          <th className="p-4 text-left w-12">
                            <Checkbox
                              checked={selectedBookings.size === sortedBookings.length && sortedBookings.length > 0}
                              onCheckedChange={handleSelectAll}
                            />
                          </th>
                          <th className="p-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Booking ID
                          </th>
                          <th className="p-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Guest
                          </th>
                          <th className="p-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Check-in
                          </th>
                          <th className="p-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Check-out
                          </th>
                          <th className="p-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Guests
                          </th>
                          <th className="p-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="p-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Payment
                          </th>
                          <th className="p-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="p-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-12">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody
                        style={{
                          height: `${rowVirtualizer.getTotalSize()}px`,
                          position: 'relative',
                        }}
                      >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                          const booking = sortedBookings[virtualRow.index];
                          return (
                            <BookingTableRow
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
                      </tbody>
                    </table>
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

      {/* Booking Details Dialog */}
      <Dialog open={!!detailsBooking} onOpenChange={(open) => !open && setDetailsBooking(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">Booking Details</DialogTitle>
            <DialogDescription>
              Complete information for booking {detailsBooking?.booking_id}
            </DialogDescription>
          </DialogHeader>
          {detailsBooking && (
            <div className="space-y-6">
              {/* Booking ID & Status */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Booking ID</p>
                  <p className="text-lg font-bold text-gray-900">{detailsBooking.booking_id}</p>
                </div>
                <Badge className={`${STATUS_CONFIG[detailsBooking.status as keyof typeof STATUS_CONFIG]?.color} text-sm border`}>
                  {STATUS_CONFIG[detailsBooking.status as keyof typeof STATUS_CONFIG]?.label}
                </Badge>
              </div>

              {/* Guest Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Guest Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Name</p>
                    <p className="font-semibold text-gray-900">{detailsBooking.guest_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Email</p>
                    <p className="font-semibold text-gray-900">{detailsBooking.guest_email}</p>
                  </div>
                  {detailsBooking.guest_phone && (
                    <div>
                      <p className="text-xs text-gray-600">Phone</p>
                      <p className="font-semibold text-gray-900">{detailsBooking.guest_phone}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-600">Number of Guests</p>
                    <p className="font-semibold text-gray-900">{detailsBooking.guests || detailsBooking.number_of_guests}</p>
                  </div>
                </div>
              </div>

              {/* Stay Information */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Stay Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Check-in</p>
                    <p className="font-semibold text-gray-900">{formatDate(detailsBooking.check_in_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Check-out</p>
                    <p className="font-semibold text-gray-900">{formatDate(detailsBooking.check_out_date)}</p>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Payment Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Total Price</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(detailsBooking.total_price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Payment Status</p>
                    <Badge variant="outline" className="text-sm mt-1">
                      {detailsBooking.payment_status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Special Requests */}
              {detailsBooking.special_requests && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Special Requests</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{detailsBooking.special_requests}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsBooking(null)}>
              Close
            </Button>
            <Button onClick={() => { setDetailsBooking(null); router.push(`/pms/bookings/${detailsBooking?.id}`); }} className="bg-[#C4A572] hover:bg-[#B39562]">
              <Edit className="w-4 h-4 mr-2" />
              Edit Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Booking Dialog */}
      <Dialog open={!!cancelBooking} onOpenChange={(open) => { if (!open) { setCancelBooking(null); setCancelReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel booking {cancelBooking?.booking_id}?
            </DialogDescription>
          </DialogHeader>
          {cancelBooking && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <p className="text-sm text-gray-900">
                  <strong>Guest:</strong> {cancelBooking.guest_name}
                </p>
                <p className="text-sm text-gray-900 mt-1">
                  <strong>Check-in:</strong> {formatDate(cancelBooking.check_in_date)}
                </p>
              </div>

              <div>
                <Label htmlFor="cancelReason" className="text-gray-900 font-semibold">
                  Cancellation Reason <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="cancelReason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please provide a reason for cancellation..."
                  className="mt-2 min-h-[100px] border-2"
                  required
                />
                <p className="text-xs text-gray-600 mt-1">Required for audit trail and guest communication</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelBooking(null); setCancelReason(''); }}>
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              disabled={!cancelReason.trim()}
              onClick={() => {
                if (cancelReason.trim()) {
                  // TODO: Call cancel API with reason
                  console.log('Cancelling booking:', cancelBooking.id, 'Reason:', cancelReason);
                  setCancelBooking(null);
                  setCancelReason('');
                  refetch();
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              <Ban className="w-4 h-4 mr-2" />
              Cancel Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
