'use client';

import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
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
  Command as CommandIcon,
  Keyboard,
  Zap,
  Star,
  Copy,
  Check,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Confetti from 'react-confetti';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'cmdk';
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
import { useRouter } from 'next/navigation';
import BookingFormModal from '@/components/pms/BookingFormModal';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const BRAND_COLOR = '#C4A572';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-amber-500',
    textColor: 'text-amber-900',
    bgColor: 'bg-gradient-to-br from-amber-50 to-amber-100',
    borderColor: 'border-amber-300',
    shadowColor: 'shadow-amber-500/20',
    icon: Clock,
  },
  confirmed: {
    label: 'Confirmed',
    color: 'bg-blue-500',
    textColor: 'text-blue-900',
    bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100',
    borderColor: 'border-blue-300',
    shadowColor: 'shadow-blue-500/20',
    icon: CheckCircle2,
  },
  paid: {
    label: 'Paid',
    color: 'bg-emerald-500',
    textColor: 'text-emerald-900',
    bgColor: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
    borderColor: 'border-emerald-300',
    shadowColor: 'shadow-emerald-500/20',
    icon: DollarSign,
  },
  checked_in: {
    label: 'Checked In',
    color: 'bg-violet-500',
    textColor: 'text-violet-900',
    bgColor: 'bg-gradient-to-br from-violet-50 to-violet-100',
    borderColor: 'border-violet-300',
    shadowColor: 'shadow-violet-500/20',
    icon: CheckCircle2,
  },
  checked_out: {
    label: 'Checked Out',
    color: 'bg-slate-500',
    textColor: 'text-slate-900',
    bgColor: 'bg-gradient-to-br from-slate-50 to-slate-100',
    borderColor: 'border-slate-300',
    shadowColor: 'shadow-slate-500/20',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-rose-500',
    textColor: 'text-rose-900',
    bgColor: 'bg-gradient-to-br from-rose-50 to-rose-100',
    borderColor: 'border-rose-300',
    shadowColor: 'shadow-rose-500/20',
    icon: XCircle,
  },
};

const PAYMENT_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  partial: { label: 'Partial', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  refunded: { label: 'Refunded', color: 'bg-slate-100 text-slate-800 border-slate-300' },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Generate ARCO booking reference (e.g., ARCO84TRF, ARCOA7K9M)
const generateArcoReference = (id: string | number): string => {
  // Use id as seed for consistency, but generate random-looking code
  const seed = typeof id === 'string' ? id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : id;

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar-looking chars (I,O,0,1)
  let code = '';

  // Generate 5 random characters based on seed
  let random = seed;
  for (let i = 0; i < 5; i++) {
    random = (random * 9301 + 49297) % 233280; // Linear congruential generator
    code += chars[Math.floor((random / 233280) * chars.length)];
  }

  return `ARCO${code}`;
};

// Copy to clipboard with toast
const copyToClipboard = (text: string, label: string = 'Text') => {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied to clipboard!`, {
    icon: <Copy className="w-4 h-4" />,
  });
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

// Keyboard shortcuts hook
const useKeyboardShortcuts = (callbacks: { [key: string]: () => void }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        callbacks['cmd+k']?.();
      }
      // Cmd/Ctrl + N for new booking
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        callbacks['cmd+n']?.();
      }
      // Cmd/Ctrl + R for refresh
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        callbacks['cmd+r']?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callbacks]);
};

// ============================================================================
// LOADING SKELETON
// ============================================================================

const TableRowSkeleton = memo(() => (
  <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100/50 animate-pulse backdrop-blur-sm">
    <div className="col-span-1 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
    <div className="col-span-2 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
    <div className="col-span-2 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
    <div className="col-span-2 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
    <div className="col-span-1 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
    <div className="col-span-1 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
    <div className="col-span-1 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
    <div className="col-span-2 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
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
  const arcoRef = generateArcoReference(booking.id);
  const [copied, setCopied] = useState(false);

  const handleCopyReference = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(arcoRef, 'Booking reference');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      whileHover={{ scale: 1.002, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={style}
      className={`grid grid-cols-12 gap-4 px-4 py-3.5 border-b border-gray-100/50 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-transparent transition-all duration-200 backdrop-blur-sm ${
        isSelected ? 'bg-gradient-to-r from-blue-50/50 to-transparent border-l-4 border-l-blue-500 shadow-sm' : ''
      }`}
    >
      {/* Checkbox */}
      <div className="col-span-1 flex items-center">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(booking.id)}
          className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 transition-all duration-200 shadow-sm"
        />
      </div>

      {/* ARCO Reference with Copy */}
      <div className="col-span-2 flex items-center gap-2 group">
        <div className={`w-2 h-2 rounded-full ${statusConfig.color} shadow-lg ${statusConfig.shadowColor} animate-pulse`} />
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm text-gray-900 tracking-tight">{arcoRef}</span>
          <button
            onClick={handleCopyReference}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-600" />
            ) : (
              <Copy className="w-3 h-3 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Guest Info */}
      <div className="col-span-2 flex flex-col justify-center min-w-0">
        <p className="font-semibold text-sm text-gray-900 truncate">{booking.guest_name}</p>
        <p className="text-xs text-gray-500 truncate flex items-center gap-1">
          <Mail className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{booking.guest_email}</span>
        </p>
      </div>

      {/* Check-in & Check-out */}
      <div className="col-span-2 flex items-center gap-2 text-sm">
        <div className="flex flex-col flex-1">
          <span className="text-[10px] text-gray-500 uppercase font-medium mb-0.5">Check-in</span>
          <span className="font-semibold text-gray-900">{formatDate(booking.check_in_date)}</span>
        </div>
        <div className="flex items-center justify-center">
          <div className="w-6 h-0.5 bg-gradient-to-r from-blue-400 to-violet-400 rounded-full" />
        </div>
        <div className="flex flex-col flex-1">
          <span className="text-[10px] text-gray-500 uppercase font-medium mb-0.5">Check-out</span>
          <span className="font-semibold text-gray-900">{formatDate(booking.check_out_date)}</span>
        </div>
      </div>

      {/* Guests */}
      <div className="col-span-1 flex items-center">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50">
          <Users className="w-3.5 h-3.5 text-gray-600" />
          <span className="text-sm font-bold text-gray-900">{booking.guests || booking.number_of_guests}</span>
        </div>
      </div>

      {/* Status Badge */}
      <div className="col-span-1 flex items-center">
        <Badge className={`${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor} border-2 text-xs font-bold px-2.5 py-1 shadow-sm ${statusConfig.shadowColor}`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {statusConfig.label}
        </Badge>
      </div>

      {/* Payment Status */}
      <div className="col-span-1 flex items-center">
        <Badge className={`${paymentConfig.color} border text-xs font-semibold px-2.5 py-1 capitalize shadow-sm`}>
          {paymentConfig.label}
        </Badge>
      </div>

      {/* Total Price */}
      <div className="col-span-1 flex items-center">
        <div className="flex flex-col">
          <span className="font-bold text-base text-gray-900">{formatCurrency(booking.total_price)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="col-span-1 flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 transition-colors">
              <MoreHorizontal className="w-4 h-4 text-gray-600" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => onAction('view', booking)} className="cursor-pointer">
              <Eye className="w-4 h-4 mr-2 text-blue-600" />
              <span className="font-medium">View Details</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('edit', booking)} className="cursor-pointer">
              <Edit className="w-4 h-4 mr-2 text-gray-600" />
              <span className="font-medium">Edit Booking</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction('cancel', booking)} className="text-rose-600 focus:text-rose-700 cursor-pointer">
              <Ban className="w-4 h-4 mr-2" />
              <span className="font-medium">Cancel Booking</span>
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
  const [commandOpen, setCommandOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const queryClient = useQueryClient();
  const parentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Window size for confetti
  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateWindowSize();
    window.addEventListener('resize', updateWindowSize);
    return () => window.removeEventListener('resize', updateWindowSize);
  }, []);

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
    estimateSize: () => 64,
    overscan: 20,
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'cmd+k': () => setCommandOpen(true),
    'cmd+n': () => {
      setIsCreateModalOpen(true);
      toast.info('Create new booking', { icon: <Plus className="w-4 h-4" /> });
    },
    'cmd+r': () => {
      refetch();
      toast.info('Refreshing bookings...', { icon: <RefreshCw className="w-4 h-4" /> });
    },
  });

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedBookings.size === sortedBookings.length) {
      setSelectedBookings(new Set());
      toast.info('Selection cleared');
    } else {
      setSelectedBookings(new Set(sortedBookings.map((b: any) => b.id)));
      toast.success(`${sortedBookings.length} bookings selected`);
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
          toast.info(`Viewing ${generateArcoReference(booking.id)}`);
          break;
        case 'edit':
          router.push(`/pms/bookings/${booking.id}`);
          toast.info(`Editing ${generateArcoReference(booking.id)}`);
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
    toast.success('Filters cleared');
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
    <>
      <Toaster position="top-right" richColors closeButton />
      {showConfetti && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={500} />}

      {/* Command Palette */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => { setIsCreateModalOpen(true); setCommandOpen(false); }}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Booking
            </CommandItem>
            <CommandItem onSelect={() => { refetch(); setCommandOpen(false); }}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </CommandItem>
            <CommandItem onSelect={() => { clearFilters(); setCommandOpen(false); }}>
              <X className="w-4 h-4 mr-2" />
              Clear Filters
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => router.push('/pms')}>
              <Layers className="w-4 h-4 mr-2" />
              Dashboard
            </CommandItem>
            <CommandItem onSelect={() => router.push('/pms/calendar')}>
              <Calendar className="w-4 h-4 mr-2" />
              Calendar
            </CommandItem>
            <CommandItem onSelect={() => router.push('/pms/guests')}>
              <Users className="w-4 h-4 mr-2" />
              Guests
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <div className="space-y-6 pb-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <motion.div
                  className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 shadow-xl shadow-blue-500/40"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <Layers className="w-7 h-7 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900">
                    Bookings
                  </h1>
                  <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Manage all property reservations
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCommandOpen(true)}
                className="gap-2 border-2 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
              >
                <CommandIcon className="w-4 h-4" />
                <span className="hidden lg:inline">Command</span>
                <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="gap-2 border-2 hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-200"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-2 hover:border-violet-300 hover:bg-violet-50 transition-all duration-200"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Button
                onClick={() => {
                  setIsCreateModalOpen(true);
                  setShowConfetti(true);
                  setTimeout(() => setShowConfetti(false), 3000);
                }}
                className="gap-2 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                <Plus className="w-4 h-4" />
                New Booking
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {[
              {
                label: 'Total Bookings',
                value: stats.total,
                icon: FileText,
                gradient: 'from-blue-500 to-cyan-500',
                bgGradient: 'from-blue-50 to-cyan-50',
                delay: 0.1,
              },
              {
                label: 'Pending',
                value: stats.pending,
                icon: Clock,
                gradient: 'from-amber-500 to-orange-500',
                bgGradient: 'from-amber-50 to-orange-50',
                delay: 0.15,
              },
              {
                label: 'Confirmed',
                value: stats.confirmed,
                icon: CheckCircle2,
                gradient: 'from-emerald-500 to-teal-500',
                bgGradient: 'from-emerald-50 to-teal-50',
                delay: 0.2,
              },
              {
                label: 'Total Revenue',
                value: formatCurrency(stats.revenue),
                icon: TrendingUp,
                gradient: 'from-violet-500 to-purple-500',
                bgGradient: 'from-violet-50 to-purple-50',
                delay: 0.25,
              },
            ].map(({ label, value, icon: Icon, gradient, bgGradient, delay }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <Card className={`border-2 border-transparent bg-gradient-to-br ${bgGradient} hover:shadow-xl transition-all duration-300 overflow-hidden group`}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">{label}</p>
                        <p className="text-3xl font-black text-gray-900">{value}</p>
                      </div>
                      <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="border-2 border-gray-200 shadow-xl backdrop-blur-sm bg-white/95">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    placeholder="Search by booking reference, guest name, or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-12 h-12 border-2 text-base focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                  />
                  {isFetching && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin" />
                  )}
                </div>

                {/* Date Filters */}
                <div className="flex gap-3">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-12 border-2 w-full lg:w-44 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    min={dateFrom}
                    className="h-12 border-2 w-full lg:w-44 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>

                {/* Filter Toggle */}
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`border-2 transition-all duration-200 ${showFilters ? 'bg-blue-50 border-blue-300' : 'hover:border-blue-300'}`}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {statusFilter.length > 0 && (
                    <Badge className="ml-2 bg-blue-600 text-white border-0">{statusFilter.length}</Badge>
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
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-gray-200">
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                        const isActive = statusFilter.includes(key);
                        const Icon = config.icon;
                        return (
                          <motion.div
                            key={key}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              variant={isActive ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => toggleStatusFilter(key)}
                              className={`${
                                isActive
                                  ? `${config.bgColor} ${config.textColor} ${config.borderColor} border-2 shadow-md ${config.shadowColor}`
                                  : 'border-2 hover:border-gray-400'
                              } transition-all duration-200`}
                            >
                              <Icon className="w-3.5 h-3.5 mr-1.5" />
                              {config.label}
                            </Button>
                          </motion.div>
                        );
                      })}
                      {hasActiveFilters && (
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-2 border-transparent hover:border-rose-300"
                          >
                            <X className="w-3.5 h-3.5" />
                            Clear All
                          </Button>
                        </motion.div>
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
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 shadow-xl shadow-blue-500/20">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 shadow-lg">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">{selectedBookings.size} bookings selected</p>
                        <p className="text-xs text-gray-600 font-medium">Choose a bulk action to perform</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-2 border-2 hover:border-emerald-300 hover:bg-emerald-50">
                        <Download className="w-4 h-4" />
                        Export
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2 border-2 text-rose-600 hover:bg-rose-50 hover:border-rose-300">
                        <Ban className="w-4 h-4" />
                        Cancel
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedBookings(new Set())}
                        className="text-gray-600 hover:bg-gray-100"
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
          transition={{ duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="border-2 border-gray-200 shadow-2xl overflow-hidden backdrop-blur-sm bg-white/95">
            <CardHeader className="border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 via-white to-gray-50 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">All Bookings</CardTitle>
                    <p className="text-xs text-gray-600 mt-0.5 font-medium">{sortedBookings.length} total reservations</p>
                  </div>
                </div>

                {/* Sort Controls */}
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 border-2 hover:border-blue-300">
                        <ArrowUpDown className="w-4 h-4" />
                        Sort: <span className="font-bold capitalize">{sortBy}</span>
                        <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSortBy('date')} className="cursor-pointer">
                        <Calendar className="w-4 h-4 mr-2" />
                        Date
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy('name')} className="cursor-pointer">
                        <Users className="w-4 h-4 mr-2" />
                        Guest Name
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy('amount')} className="cursor-pointer">
                        <DollarSign className="w-4 h-4 mr-2" />
                        Amount
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="border-2 px-3 hover:border-blue-300"
                  >
                    <span className="text-lg">{sortOrder === 'asc' ? '↑' : '↓'}</span>
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
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-6 shadow-xl"
                  >
                    <Calendar className="w-16 h-16 text-gray-400" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">No bookings found</h3>
                  <p className="text-sm text-gray-500 text-center max-w-md mb-8">
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
                      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                    >
                      <Plus className="w-4 h-4" />
                      Create First Booking
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 px-4 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200 sticky top-0 z-10 backdrop-blur-sm">
                    <div className="col-span-1 flex items-center">
                      <Checkbox
                        checked={selectedBookings.size === sortedBookings.length && sortedBookings.length > 0}
                        onCheckedChange={handleSelectAll}
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-black text-gray-700 uppercase tracking-wider">ARCO Reference</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-black text-gray-700 uppercase tracking-wider">Guest</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-black text-gray-700 uppercase tracking-wider">Dates</p>
                    </div>
                    <div className="col-span-1">
                      <p className="text-xs font-black text-gray-700 uppercase tracking-wider">Guests</p>
                    </div>
                    <div className="col-span-1">
                      <p className="text-xs font-black text-gray-700 uppercase tracking-wider">Status</p>
                    </div>
                    <div className="col-span-1">
                      <p className="text-xs font-black text-gray-700 uppercase tracking-wider">Payment</p>
                    </div>
                    <div className="col-span-1">
                      <p className="text-xs font-black text-gray-700 uppercase tracking-wider">Total</p>
                    </div>
                    <div className="col-span-1" />
                  </div>

                  {/* Virtual Table Body */}
                  <div
                    ref={parentRef}
                    className="overflow-auto"
                    style={{ height: '540px' }}
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

        {/* Keyboard Shortcuts Hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex justify-center gap-4 text-xs text-gray-500"
        >
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">⌘</kbd>
            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">K</kbd>
            <span>Command Palette</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">⌘</kbd>
            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">N</kbd>
            <span>New Booking</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">⌘</kbd>
            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">R</kbd>
            <span>Refresh</span>
          </div>
        </motion.div>
      </div>

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
              Complete information for {detailsBooking && generateArcoReference(detailsBooking.id)}
            </DialogDescription>
          </DialogHeader>
          {detailsBooking && (
            <div className="space-y-6 mt-4">
              {/* Status */}
              <div className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 shadow-sm">
                <div>
                  <p className="text-sm text-gray-600 mb-1 font-medium">ARCO Reference</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-black text-gray-900">{generateArcoReference(detailsBooking.id)}</p>
                    <button
                      onClick={() => copyToClipboard(generateArcoReference(detailsBooking.id), 'Reference')}
                      className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
                <Badge className={`${STATUS_CONFIG[detailsBooking.status as keyof typeof STATUS_CONFIG]?.bgColor} ${STATUS_CONFIG[detailsBooking.status as keyof typeof STATUS_CONFIG]?.textColor} ${STATUS_CONFIG[detailsBooking.status as keyof typeof STATUS_CONFIG]?.borderColor} border-2 text-sm font-bold px-4 py-2 shadow-md`}>
                  {STATUS_CONFIG[detailsBooking.status as keyof typeof STATUS_CONFIG]?.label}
                </Badge>
              </div>

              {/* Guest Info */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-100 shadow-sm">
                <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                  Guest Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Name</p>
                    <p className="font-bold text-gray-900 text-lg">{detailsBooking.guest_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Email</p>
                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      {detailsBooking.guest_email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Guests</p>
                    <p className="font-bold text-gray-900 text-lg">{detailsBooking.guests || detailsBooking.number_of_guests}</p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-100 shadow-sm">
                <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5 text-violet-600" />
                  Stay Dates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Check-in</p>
                    <p className="font-black text-gray-900 text-xl">{formatDate(detailsBooking.check_in_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Check-out</p>
                    <p className="font-black text-gray-900 text-xl">{formatDate(detailsBooking.check_out_date)}</p>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-100 shadow-sm">
                <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2 text-lg">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  Payment Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Total Amount</p>
                    <p className="text-3xl font-black text-gray-900">{formatCurrency(detailsBooking.total_price)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Payment Status</p>
                    <Badge className={`${PAYMENT_STATUS_CONFIG[detailsBooking.payment_status as keyof typeof PAYMENT_STATUS_CONFIG]?.color} border text-sm font-bold px-4 py-2 mt-1 capitalize shadow-sm`}>
                      {detailsBooking.payment_status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Special Requests */}
              {detailsBooking.special_requests && (
                <div className="p-6 rounded-2xl bg-gray-50 border-2 border-gray-200 shadow-sm">
                  <h3 className="font-black text-gray-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-gray-600" />
                    Special Requests
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed font-medium">{detailsBooking.special_requests}</p>
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
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
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
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 shadow-sm">
                <p className="text-sm text-gray-900 font-bold mb-2">
                  <strong className="text-gray-700">Reference:</strong> {generateArcoReference(cancelBooking.id)}
                </p>
                <p className="text-sm text-gray-900 font-bold mb-2">
                  <strong className="text-gray-700">Guest:</strong> {cancelBooking.guest_name}
                </p>
                <p className="text-sm text-gray-900 font-bold">
                  <strong className="text-gray-700">Check-in:</strong> {formatDate(cancelBooking.check_in_date)}
                </p>
              </div>

              <div>
                <Label htmlFor="cancelReason" className="text-sm font-bold text-gray-900">
                  Cancellation Reason <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  id="cancelReason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please provide a detailed reason for cancellation..."
                  className="mt-2 min-h-[120px] border-2 resize-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                  required
                />
                <p className="text-xs text-gray-500 mt-2 font-medium">
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
                  toast.success(`Booking ${generateArcoReference(cancelBooking.id)} cancelled`);
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
    </>
  );
}
