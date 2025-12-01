'use client';

import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
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

// Status configuration
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
};

const PAYMENT_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  partial: { label: 'Partial', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  paid: { label: 'Paid', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  refunded: { label: 'Refunded', color: 'bg-gray-50 text-gray-700 border-gray-200' },
};

// Generate ARCO reference
const generateArcoReference = (id: string | number): string => {
  const seed = typeof id === 'string' ? id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : id;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  let random = seed;

  for (let i = 0; i < 5; i++) {
    random = (random * 9301 + 49297) % 233280;
    code += chars[Math.floor((random / 233280) * chars.length)];
  }

  return `ARCO${code}`;
};

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

// Booking Row Component
interface BookingRowProps {
  booking: any;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onAction: (action: string, booking: any) => void;
}

const BookingRow = memo(({ booking, isSelected, onSelect, onAction }: BookingRowProps) => {
  const statusConfig = STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const paymentConfig = PAYMENT_STATUS_CONFIG[booking.payment_status as keyof typeof PAYMENT_STATUS_CONFIG] || PAYMENT_STATUS_CONFIG.pending;
  const arcoRef = generateArcoReference(booking.id);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyToClipboard(arcoRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <tr className={`border-b hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
      <td className="px-4 py-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(booking.id)}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 group">
          <span className="font-semibold text-sm">{arcoRef}</span>
          <button onClick={handleCopy} className="opacity-0 group-hover:opacity-100">
            {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
          </button>
        </div>
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-sm">{booking.guest_name}</p>
          <p className="text-xs text-gray-500">{booking.guest_email}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm">
          <div className="font-medium">{formatDate(booking.check_in_date)}</div>
          <div className="text-gray-500">{formatDate(booking.check_out_date)}</div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm">{booking.guests || booking.number_of_guests}</span>
      </td>
      <td className="px-4 py-3">
        <Badge className={`${statusConfig.color} border text-xs font-medium`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {statusConfig.label}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <Badge className={`${paymentConfig.color} border text-xs font-medium capitalize`}>
          {paymentConfig.label}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <span className="font-semibold text-sm">{formatCurrency(booking.total_price)}</span>
      </td>
      <td className="px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="w-4 h-4" />
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
            <DropdownMenuItem onClick={() => onAction('cancel', booking)} className="text-rose-600">
              <Ban className="w-4 h-4 mr-2" />
              Cancel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
});

BookingRow.displayName = 'BookingRow';

// Main Component
export default function BookingsPage() {
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

  const router = useRouter();
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
  });

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

  // Stats
  const stats = useMemo(() => {
    if (!sortedBookings.length) return { total: 0, pending: 0, confirmed: 0, revenue: 0 };
    return {
      total: sortedBookings.length,
      pending: sortedBookings.filter((b: any) => b.status === 'pending').length,
      confirmed: sortedBookings.filter((b: any) => b.status === 'confirmed' || b.status === 'paid').length,
      revenue: sortedBookings.reduce((sum: number, b: any) => sum + parseFloat(b.total_price || 0), 0),
    };
  }, [sortedBookings]);

  // Handlers
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

  return (
    <>
      <Toaster position="top-right" />

      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
            <p className="text-sm text-gray-500">Manage all property reservations</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Booking
            </Button>
          </div>
        </div>

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
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Pending</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pending}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-600" />
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
                  <p className="text-xs font-medium text-gray-500 uppercase">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.revenue)}</p>
                </div>
                <div className="p-3 bg-violet-50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-violet-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by booking reference, guest name, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {statusFilter.length > 0 && <Badge className="ml-2 bg-blue-600 text-white">{statusFilter.length}</Badge>}
              </Button>
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
            <div className="flex items-center justify-between">
              <CardTitle>All Bookings ({sortedBookings.length})</CardTitle>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      Sort: {sortBy}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setSortBy('date')}>Date</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('name')}>Guest Name</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('amount')}>Amount</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
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
                <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {search || statusFilter.length > 0 ? 'Try adjusting your filters' : 'Get started by creating your first booking'}
                </p>
                <Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Booking
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <Checkbox
                          checked={selectedBookings.size === sortedBookings.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reference</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Guest</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Dates</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Guests</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Payment</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBookings.map((booking: any) => (
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <BookingFormModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

      {/* Details Dialog */}
      <Dialog open={!!detailsBooking} onOpenChange={(open) => !open && setDetailsBooking(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              {detailsBooking && generateArcoReference(detailsBooking.id)}
            </DialogDescription>
          </DialogHeader>
          {detailsBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Guest Name</Label>
                  <p className="font-medium">{detailsBooking.guest_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Email</Label>
                  <p className="font-medium">{detailsBooking.guest_email}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Check-in</Label>
                  <p className="font-medium">{formatDate(detailsBooking.check_in_date)}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Check-out</Label>
                  <p className="font-medium">{formatDate(detailsBooking.check_out_date)}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Guests</Label>
                  <p className="font-medium">{detailsBooking.guests || detailsBooking.number_of_guests}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Total</Label>
                  <p className="font-medium text-lg">{formatCurrency(detailsBooking.total_price)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsBooking(null)}>Close</Button>
            <Button onClick={() => router.push(`/pms/bookings/${detailsBooking?.id}`)}>Edit</Button>
          </DialogFooter>
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
                <p className="text-sm"><strong>Reference:</strong> {generateArcoReference(cancelBooking.id)}</p>
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
              disabled={!cancelReason.trim()}
              onClick={() => {
                toast.success('Booking cancelled');
                setCancelBooking(null);
                setCancelReason('');
                refetch();
              }}
            >
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
