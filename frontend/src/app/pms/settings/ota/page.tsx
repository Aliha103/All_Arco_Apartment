'use client';

// ============================================================================
// OTA (Online Travel Agency) Management - Quantum Level Performance
// ============================================================================
// Features:
// - iCal sync integration with multiple OTAs
// - Manual OTA booking entry with complete financial breakdown
// - Real-time balance calculations
// - Advanced search and filtering
// - Statistics dashboard
// - Payment tracking
// ============================================================================

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Calendar,
  DollarSign,
  Users,
  Mail,
  Phone,
  Building2,
  Edit,
  Trash2,
  ExternalLink,
  Upload,
  Download,
  Filter,
  X,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Baby,
  User,
  CalendarDays,
  Euro,
  Percent,
  CreditCard,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import api from '@/lib/api';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface OTABooking {
  id: string;
  ota_name: string;
  ota_booking_number: string;
  first_name: string;
  last_name: string;
  email?: string;
  mobile_number?: string;
  date_of_birth?: string;
  adults: number;
  children: number;
  infants: number;
  check_in_date: string;
  check_out_date: string;
  room_price: number;
  cleaning_fee: number;
  city_tax: number;
  extras: number;
  total_amount: number;
  paid_amount: number;
  to_pay_amount: number;
  applied_discount: number;
  ota_fee: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
  ical_uid?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface ICalSource {
  id: string;
  ota_name: string;
  ical_url: string;
  last_synced: string;
  sync_status: 'active' | 'error' | 'paused';
  bookings_count: number;
}

interface OTAFormData {
  ota_name: string;
  ota_booking_number: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: string;
  date_of_birth: string;
  adults: string;
  children: string;
  infants: string;
  check_in_date: string;
  check_out_date: string;
  room_price: string;
  cleaning_fee: string;
  city_tax: string;
  extras: string;
  applied_discount: string;
  ota_commission_percent: string;
  ota_fee: string;
  paid_amount: string;
  currency: string;
  notes: string;
}

// ============================================================================
// Constants
// ============================================================================

const OTA_PLATFORMS = [
  'Airbnb',
  'Booking.com',
  'Expedia',
  'VRBO',
  'HomeAway',
  'TripAdvisor',
  'Agoda',
  'Hotels.com',
  'Other',
];

// Default commission percentages for each OTA
const OTA_COMMISSION_RATES: Record<string, number> = {
  'Airbnb': 15,
  'Booking.com': 17,
  'Expedia': 18,
  'VRBO': 20,
  'HomeAway': 18,
  'TripAdvisor': 15,
  'Agoda': 17,
  'Hotels.com': 18,
  'Other': 15,
};

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'];

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
  },
  confirmed: {
    label: 'Confirmed',
    color: 'bg-blue-100 text-blue-800',
    icon: CheckCircle2,
  },
  checked_in: {
    label: 'Checked In',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle2,
  },
  checked_out: {
    label: 'Checked Out',
    color: 'bg-gray-100 text-gray-600',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800',
    icon: AlertCircle,
  },
};

// ============================================================================
// Main Component
// ============================================================================

export default function OTAManagementPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'bookings' | 'ical'>('bookings');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [otaFilter, setOtaFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isICalModalOpen, setIsICalModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<OTABooking | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['ota-bookings'],
    queryFn: async () => {
      const response = await api.bookings.list();
      const allBookings = response.data.results || response.data;
      // Filter only OTA bookings (bookings with ota_platform set)
      return allBookings
        .filter((b: any) => b.ota_platform)
        .map((b: any) => ({
          id: b.id || b.booking_id,
          ota_name: b.ota_platform,
          ota_booking_number: b.ota_confirmation_code || b.booking_id,
          first_name: b.guest_name?.split(' ')[0] || '',
          last_name: b.guest_name?.split(' ').slice(1).join(' ') || '',
          email: b.email,
          mobile_number: b.mobile_number,
          date_of_birth: b.date_of_birth,
          adults: b.adults || 2,
          children: b.children || 0,
          infants: b.infants || 0,
          check_in_date: b.check_in_date,
          check_out_date: b.check_out_date,
          room_price: parseFloat(b.total_price) || 0,
          cleaning_fee: parseFloat(b.cleaning_fee) || 0,
          city_tax: parseFloat(b.city_tax) || 0,
          extras: 0,
          total_amount: parseFloat(b.total_price) || 0,
          paid_amount: parseFloat(b.paid_amount) || 0,
          to_pay_amount: parseFloat(b.amount_due) || 0,
          applied_discount: 0,
          ota_fee: parseFloat(b.ota_commission_amount) || 0,
          currency: b.currency || 'EUR',
          status: b.status || 'confirmed',
          ical_uid: b.ical_uid,
          notes: b.notes,
          created_at: b.created_at,
          updated_at: b.updated_at,
        }));
    },
  });

  const { data: icalSources = [] } = useQuery({
    queryKey: ['ical-sources'],
    queryFn: async () => {
      const response = await api.icalSources.list();
      return response.data;
    },
  });

  // ============================================================================
  // Filtered Data
  // ============================================================================

  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];

    // Search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (booking) =>
          booking.ota_booking_number.toLowerCase().includes(searchLower) ||
          booking.first_name.toLowerCase().includes(searchLower) ||
          booking.last_name.toLowerCase().includes(searchLower) ||
          booking.email?.toLowerCase().includes(searchLower) ||
          booking.ota_name.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter.length > 0) {
      filtered = filtered.filter((booking) => statusFilter.includes(booking.status));
    }

    // OTA filter
    if (otaFilter !== 'all') {
      filtered = filtered.filter((booking) => booking.ota_name === otaFilter);
    }

    // Sort by check-in date (newest first)
    filtered.sort((a, b) => new Date(b.check_in_date).getTime() - new Date(a.check_in_date).getTime());

    return filtered;
  }, [bookings, debouncedSearch, statusFilter, otaFilter]);

  // ============================================================================
  // Statistics
  // ============================================================================

  const statistics = useMemo(() => {
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum: number, b: OTABooking) => sum + b.total_amount, 0);
    const totalPaid = bookings.reduce((sum: number, b: OTABooking) => sum + b.paid_amount, 0);
    const totalToPay = bookings.reduce((sum: number, b: OTABooking) => sum + b.to_pay_amount, 0);
    const totalOTAFees = bookings.reduce((sum: number, b: OTABooking) => sum + b.ota_fee, 0);
    const activeBookings = bookings.filter((b: OTABooking) => b.status === 'confirmed' || b.status === 'checked_in').length;

    return {
      totalBookings,
      totalRevenue,
      totalPaid,
      totalToPay,
      totalOTAFees,
      activeBookings,
    };
  }, [bookings]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-7 h-7 text-blue-600" />
              OTA Management
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage bookings from Online Travel Agencies and sync iCal feeds to prevent overbooking
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsICalModalOpen(true)}
              className="text-gray-900"
            >
              <Upload className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">iCal Sync</span>
            </Button>
            <Button
              onClick={() => {
                setSelectedBooking(null);
                setIsCreateModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Add OTA Booking</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border border-gray-200 hover:border-gray-300 transition-colors">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
                    Total Bookings
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {statistics.totalBookings}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {statistics.activeBookings} active
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="border border-gray-200 hover:border-gray-300 transition-colors">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-green-50 rounded-lg border border-green-100">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
                    Total Revenue
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {formatCurrency(statistics.totalRevenue)}
                  </h3>
                  <p className="text-sm text-green-600 mt-1">
                    {formatCurrency(statistics.totalPaid)} collected
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="border border-gray-200 hover:border-gray-300 transition-colors">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-yellow-50 rounded-lg border border-yellow-100">
                  <DollarSign className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
                    To Collect
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {formatCurrency(statistics.totalToPay)}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Outstanding balance
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card className="border border-gray-200 hover:border-gray-300 transition-colors">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-red-50 rounded-lg border border-red-100">
                  <Percent className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
                    OTA Fees
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {formatCurrency(statistics.totalOTAFees)}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Platform commissions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="bookings">Bookings ({filteredBookings.length})</TabsTrigger>
            <TabsTrigger value="ical">iCal Sources ({icalSources.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-4">
            {/* Filters */}
            <Card className="border border-gray-200">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by booking number, guest name, or email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 text-gray-900"
                    />
                  </div>

                  {/* OTA Filter */}
                  <Select value={otaFilter} onValueChange={setOtaFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="All OTAs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All OTAs</SelectItem>
                      {OTA_PLATFORMS.map((ota) => (
                        <SelectItem key={ota} value={ota}>{ota}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Bookings List */}
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg">OTA Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Building2 className="w-12 h-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No OTA bookings found</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {search || statusFilter.length > 0 || otaFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Add your first OTA booking to get started'}
                    </p>
                    {!search && statusFilter.length === 0 && otaFilter === 'all' && (
                      <Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600">
                        <Plus className="w-4 h-4 mr-2" />
                        Add OTA Booking
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {filteredBookings.map((booking, index) => (
                        <OTABookingCard
                          key={booking.id}
                          booking={booking}
                          index={index}
                          onEdit={(booking) => {
                            setSelectedBooking(booking);
                            setIsCreateModalOpen(true);
                          }}
                          onDelete={async (booking) => {
                            if (confirm(`Delete OTA booking ${booking.ota_booking_number}? This cannot be undone.`)) {
                              try {
                                await api.bookings.delete(booking.id);
                                queryClient.invalidateQueries({ queryKey: ['ota-bookings'] });
                                queryClient.invalidateQueries({ queryKey: ['bookings'] });
                                queryClient.invalidateQueries({ queryKey: ['calendar'] });
                                toast.success('OTA booking deleted successfully');
                              } catch (error: any) {
                                toast.error(error.response?.data?.message || 'Failed to delete booking');
                              }
                            }
                          }}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ical" className="space-y-4">
            <ICalSourcesList sources={icalSources} />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Modals */}
      <OTABookingModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking}
      />
      <ICalSyncModal
        isOpen={isICalModalOpen}
        onClose={() => setIsICalModalOpen(false)}
      />
    </div>
  );
}

// ============================================================================
// OTA Booking Card Component
// ============================================================================

interface OTABookingCardProps {
  booking: OTABooking;
  index: number;
  onEdit: (booking: OTABooking) => void;
  onDelete: (booking: OTABooking) => void;
}

function OTABookingCard({ booking, index, onEdit, onDelete }: OTABookingCardProps) {
  const statusConfig = STATUS_CONFIG[booking.status];
  const StatusIcon = statusConfig.icon;
  const nights = Math.ceil(
    (new Date(booking.check_out_date).getTime() - new Date(booking.check_in_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      layout
      className="rounded-lg border border-gray-200 hover:shadow-sm transition-all duration-200 bg-white p-5"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-0.5">
                {booking.ota_name}
              </Badge>
              <Badge className={cn(statusConfig.color, 'text-xs font-medium px-2 py-0.5')}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {booking.first_name} {booking.last_name}
            </h3>
            <p className="text-sm text-gray-600">Booking #{booking.ota_booking_number}</p>
          </div>

          {/* Total Amount */}
          <div className="flex flex-col items-end">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Total
            </span>
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(booking.total_amount)} {booking.currency}
            </span>
            {booking.to_pay_amount > 0 && (
              <span className="text-xs text-red-600 font-medium mt-1">
                {formatCurrency(booking.to_pay_amount)} to collect
              </span>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-gray-200">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 bg-blue-50 rounded border border-blue-100">
              <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 font-medium mb-0.5">Dates</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatDate(booking.check_in_date)}
              </p>
              <p className="text-xs text-gray-600">{nights} night{nights !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-1.5 bg-green-50 rounded border border-green-100">
              <Users className="w-3.5 h-3.5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 font-medium mb-0.5">Guests</p>
              <p className="text-sm font-semibold text-gray-900">
                {booking.adults + booking.children + booking.infants} total
              </p>
              <p className="text-xs text-gray-600">
                {booking.adults}A · {booking.children}C · {booking.infants}I
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-1.5 bg-purple-50 rounded border border-purple-100">
              <CreditCard className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 font-medium mb-0.5">Payment</p>
              <p className="text-sm font-semibold text-green-600">
                {formatCurrency(booking.paid_amount)}
              </p>
              <p className="text-xs text-gray-600">paid</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-1.5 bg-orange-50 rounded border border-orange-100">
              <Percent className="w-3.5 h-3.5 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 font-medium mb-0.5">OTA Fee</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(booking.ota_fee)}
              </p>
              <p className="text-xs text-gray-600">commission</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
          <Button
            onClick={() => onEdit(booking)}
            variant="outline"
            size="sm"
          >
            <Edit className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </Button>
          <Button
            onClick={() => onDelete(booking)}
            variant="outline"
            size="sm"
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// OTA Booking Modal Component
// ============================================================================

interface OTABookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: OTABooking | null;
}

function OTABookingModal({ isOpen, onClose, booking }: OTABookingModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<OTAFormData>({
    ota_name: '',
    ota_booking_number: '',
    first_name: '',
    last_name: '',
    email: '',
    mobile_number: '',
    date_of_birth: '',
    adults: '2',
    children: '0',
    infants: '0',
    check_in_date: '',
    check_out_date: '',
    room_price: '',
    cleaning_fee: '',
    city_tax: '',
    extras: '0',
    applied_discount: '0',
    ota_commission_percent: '',
    ota_fee: '',
    paid_amount: '',
    currency: 'EUR',
    notes: '',
  });

  // Initialize form with booking data if editing
  useEffect(() => {
    if (booking && isOpen) {
      // Calculate commission percentage from OTA fee if editing
      const commissionBase = booking.room_price + booking.cleaning_fee + booking.extras - booking.applied_discount;
      const commissionPercent = commissionBase > 0 ? ((booking.ota_fee / commissionBase) * 100).toFixed(2) : '';

      setFormData({
        ota_name: booking.ota_name,
        ota_booking_number: booking.ota_booking_number,
        first_name: booking.first_name,
        last_name: booking.last_name,
        email: booking.email || '',
        mobile_number: booking.mobile_number || '',
        date_of_birth: booking.date_of_birth || '',
        adults: booking.adults.toString(),
        children: booking.children.toString(),
        infants: booking.infants.toString(),
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        room_price: booking.room_price.toString(),
        cleaning_fee: booking.cleaning_fee.toString(),
        city_tax: booking.city_tax.toString(),
        extras: booking.extras.toString(),
        applied_discount: booking.applied_discount.toString(),
        ota_commission_percent: commissionPercent,
        ota_fee: booking.ota_fee.toString(),
        paid_amount: booking.paid_amount.toString(),
        currency: booking.currency,
        notes: booking.notes || '',
      });
    } else if (!isOpen) {
      // Reset form when modal closes
      setFormData({
        ota_name: '',
        ota_booking_number: '',
        first_name: '',
        last_name: '',
        email: '',
        mobile_number: '',
        date_of_birth: '',
        adults: '2',
        children: '0',
        infants: '0',
        check_in_date: '',
        check_out_date: '',
        room_price: '',
        cleaning_fee: '',
        city_tax: '',
        extras: '0',
        applied_discount: '0',
        ota_commission_percent: '',
        ota_fee: '',
        paid_amount: '',
        currency: 'EUR',
        notes: '',
      });
    }
  }, [booking, isOpen]);

  // Calculate totals with commission
  const calculatedTotals = useMemo(() => {
    const roomPrice = parseFloat(formData.room_price) || 0;
    const cleaningFee = parseFloat(formData.cleaning_fee) || 0;
    const cityTax = parseFloat(formData.city_tax) || 0;
    const extras = parseFloat(formData.extras) || 0;
    const discount = parseFloat(formData.applied_discount) || 0;
    const commissionPercent = parseFloat(formData.ota_commission_percent) || 0;

    // Subtotal includes everything
    const subtotal = roomPrice + cleaningFee + cityTax + extras;

    // Guest pays = subtotal - discount
    const guestPays = subtotal - discount;

    // Commission base excludes city tax (only on room price + cleaning + extras - discount)
    const commissionBase = roomPrice + cleaningFee + extras - discount;

    // OTA commission calculation
    const otaCommission = (commissionBase * commissionPercent) / 100;

    // What property receives after commission
    const youReceive = guestPays - otaCommission;

    const paidAmount = parseFloat(formData.paid_amount) || 0;
    const toPayAmount = guestPays - paidAmount;

    return {
      roomPrice,
      cleaningFee,
      cityTax,
      extras,
      subtotal,
      discount,
      guestPays,
      commissionBase,
      otaCommission,
      commissionPercent,
      youReceive,
      paidAmount,
      toPayAmount,
    };
  }, [formData]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.ota_name || !formData.ota_booking_number || !formData.first_name ||
        !formData.last_name || !formData.check_in_date || !formData.check_out_date ||
        !formData.ota_commission_percent) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Prepare data for API with calculated values
    const submitData = {
      guest_name: `${formData.first_name} ${formData.last_name}`,
      email: formData.email || undefined,
      mobile_number: formData.mobile_number || undefined,
      date_of_birth: formData.date_of_birth || undefined,
      adults: Number.parseInt(formData.adults, 10) || 2,
      children: Number.parseInt(formData.children, 10) || 0,
      infants: Number.parseInt(formData.infants, 10) || 0,
      check_in_date: formData.check_in_date,
      check_out_date: formData.check_out_date,
      total_price: calculatedTotals.guestPays,
      cleaning_fee: parseFloat(formData.cleaning_fee) || 0,
      city_tax: parseFloat(formData.city_tax) || 0,
      paid_amount: parseFloat(formData.paid_amount) || 0,
      amount_due: calculatedTotals.toPayAmount,
      currency: formData.currency,
      notes: formData.notes || undefined,
      ota_platform: formData.ota_name,
      ota_confirmation_code: formData.ota_booking_number,
      ota_commission_percent: parseFloat(formData.ota_commission_percent) || 0,
      ota_commission_amount: calculatedTotals.otaCommission,
      status: 'confirmed',
      source: 'ota',
    };

    try {
      if (booking) {
        await api.bookings.update(booking.id, submitData);
        toast.success('OTA booking updated successfully');
      } else {
        await api.bookings.create(submitData);
        toast.success('OTA booking created successfully');
      }
      queryClient.invalidateQueries({ queryKey: ['ota-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${booking ? 'update' : 'create'} booking`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900">
            {booking ? 'Edit OTA Booking' : 'Add OTA Booking'}
          </DialogTitle>
          <DialogDescription className="text-gray-700">
            Enter the complete booking details from the OTA platform
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* OTA & Booking Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Booking Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ota_name" className="text-gray-900 font-medium">
                  OTA Platform <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.ota_name}
                  onValueChange={(v) => {
                    // Auto-populate commission percentage based on OTA platform
                    const defaultCommission = OTA_COMMISSION_RATES[v] || 15;
                    setFormData({
                      ...formData,
                      ota_name: v,
                      ota_commission_percent: formData.ota_commission_percent || defaultCommission.toString()
                    });
                  }}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select OTA" />
                  </SelectTrigger>
                  <SelectContent>
                    {OTA_PLATFORMS.map((ota) => (
                      <SelectItem key={ota} value={ota}>{ota}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ota_booking_number" className="text-gray-900 font-medium">
                  OTA Booking Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ota_booking_number"
                  value={formData.ota_booking_number}
                  onChange={(e) => setFormData({ ...formData, ota_booking_number: e.target.value })}
                  placeholder="e.g., ABNB-2024-001"
                  className="text-gray-900 mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* Guest Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Guest Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name" className="text-gray-900 font-medium">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="text-gray-900 mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="last_name" className="text-gray-900 font-medium">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="text-gray-900 mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-gray-900 font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="text-gray-900 mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="mobile_number" className="text-gray-900 font-medium">Mobile Number</Label>
                <Input
                  id="mobile_number"
                  type="tel"
                  value={formData.mobile_number}
                  onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                  className="text-gray-900 mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="date_of_birth" className="text-gray-900 font-medium">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="text-gray-900 mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* Guest Count */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Number of Guests
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="adults" className="text-gray-900 font-medium">
                  Adults <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="adults"
                  type="number"
                  min="1"
                  value={formData.adults}
                  onChange={(e) => setFormData({ ...formData, adults: e.target.value })}
                  className="text-gray-900 mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="children" className="text-gray-900 font-medium">Children</Label>
                <Input
                  id="children"
                  type="number"
                  min="0"
                  value={formData.children}
                  onChange={(e) => setFormData({ ...formData, children: e.target.value })}
                  className="text-gray-900 mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="infants" className="text-gray-900 font-medium">Infants</Label>
                <Input
                  id="infants"
                  type="number"
                  min="0"
                  value={formData.infants}
                  onChange={(e) => setFormData({ ...formData, infants: e.target.value })}
                  className="text-gray-900 mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* Stay Dates */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Stay Period
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="check_in_date" className="text-gray-900 font-medium">
                  Check-in Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="check_in_date"
                  type="date"
                  value={formData.check_in_date}
                  onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
                  className="text-gray-900 mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="check_out_date" className="text-gray-900 font-medium">
                  Check-out Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="check_out_date"
                  type="date"
                  value={formData.check_out_date}
                  onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                  className="text-gray-900 mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Financial Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="room_price" className="text-gray-900 font-medium">
                  Room Price <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1.5">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="room_price"
                    type="number"
                    step="0.01"
                    value={formData.room_price}
                    onChange={(e) => setFormData({ ...formData, room_price: e.target.value })}
                    className="pl-10 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cleaning_fee" className="text-gray-900 font-medium">
                  Cleaning Fee
                </Label>
                <div className="relative mt-1.5">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="cleaning_fee"
                    type="number"
                    step="0.01"
                    value={formData.cleaning_fee}
                    onChange={(e) => setFormData({ ...formData, cleaning_fee: e.target.value })}
                    className="pl-10 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="city_tax" className="text-gray-900 font-medium">City Tax</Label>
                <div className="relative mt-1.5">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="city_tax"
                    type="number"
                    step="0.01"
                    value={formData.city_tax}
                    onChange={(e) => setFormData({ ...formData, city_tax: e.target.value })}
                    className="pl-10 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="extras" className="text-gray-900 font-medium">Extras</Label>
                <div className="relative mt-1.5">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="extras"
                    type="number"
                    step="0.01"
                    value={formData.extras}
                    onChange={(e) => setFormData({ ...formData, extras: e.target.value })}
                    className="pl-10 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="applied_discount" className="text-gray-900 font-medium">
                  Applied Discount
                </Label>
                <div className="relative mt-1.5">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="applied_discount"
                    type="number"
                    step="0.01"
                    value={formData.applied_discount}
                    onChange={(e) => setFormData({ ...formData, applied_discount: e.target.value })}
                    className="pl-10 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="ota_commission_percent" className="text-gray-900 font-medium">
                  OTA Commission (%) <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1.5">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="ota_commission_percent"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.ota_commission_percent}
                    onChange={(e) => setFormData({ ...formData, ota_commission_percent: e.target.value })}
                    className="pl-10 text-gray-900"
                    placeholder="15"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Commission is calculated on room price, cleaning fee, and extras (excluding city tax)
                </p>
              </div>

              <div>
                <Label htmlFor="paid_amount" className="text-gray-900 font-medium">
                  Paid Amount <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1.5">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="paid_amount"
                    type="number"
                    step="0.01"
                    value={formData.paid_amount}
                    onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                    className="pl-10 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="currency" className="text-gray-900 font-medium">Currency</Label>
                <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Calculated Totals - Enhanced Financial Breakdown */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Financial Summary
              </h4>

              {/* Line Items */}
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Room Price:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(calculatedTotals.roomPrice)} {formData.currency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cleaning Fee:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(calculatedTotals.cleaningFee)} {formData.currency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">City Tax:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(calculatedTotals.cityTax)} {formData.currency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Extras:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(calculatedTotals.extras)} {formData.currency}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-300 my-3"></div>

              {/* Subtotal & Discount */}
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 font-medium">Subtotal:</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(calculatedTotals.subtotal)} {formData.currency}
                  </span>
                </div>
                {calculatedTotals.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount:</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(calculatedTotals.discount)} {formData.currency}
                    </span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-300 my-3"></div>

              {/* Guest Pays */}
              <div className="space-y-3 mb-3">
                <div className="flex justify-between">
                  <span className="text-gray-700 font-semibold">Guest Pays:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatCurrency(calculatedTotals.guestPays)} {formData.currency}
                  </span>
                </div>

                {/* OTA Commission */}
                {calculatedTotals.commissionPercent > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm">
                      OTA Commission ({calculatedTotals.commissionPercent}%):
                    </span>
                    <span className="font-semibold text-orange-600">
                      -{formatCurrency(calculatedTotals.otaCommission)} {formData.currency}
                    </span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t-2 border-gray-400 my-3"></div>

              {/* You Receive - Highlighted */}
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="flex justify-between items-center">
                  <span className="text-green-700 font-bold text-sm">You Receive:</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(calculatedTotals.youReceive)} {formData.currency}
                  </span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Net revenue after OTA commission
                </p>
              </div>

              {/* To Pay */}
              {calculatedTotals.toPayAmount !== 0 && (
                <>
                  <div className="border-t border-gray-300 my-3"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium text-sm">To Collect from Guest:</span>
                    <span className={cn(
                      "text-lg font-bold",
                      calculatedTotals.toPayAmount > 0 ? "text-red-600" : "text-green-600"
                    )}>
                      {formatCurrency(calculatedTotals.toPayAmount)} {formData.currency}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-gray-900 font-medium">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="text-gray-900 mt-1.5"
              placeholder="Any additional notes about this booking..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
            {booking ? 'Update Booking' : 'Create Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// iCal Sources List Component
// ============================================================================

interface ICalSourcesListProps {
  sources: ICalSource[];
}

function ICalSourcesList({ sources }: ICalSourcesListProps) {
  const queryClient = useQueryClient();
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

  const syncSource = useMutation({
    mutationFn: (id: string) => api.icalSources.sync(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ical-sources'] });
      queryClient.invalidateQueries({ queryKey: ['ota-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setSyncingId(null);
      toast.success('iCal source synced successfully - calendar updated to prevent overbooking');
    },
    onError: (error: any) => {
      setSyncingId(null);
      toast.error(error.response?.data?.message || 'Failed to sync iCal source');
    },
  });

  const syncAllSources = useMutation({
    mutationFn: () => api.icalSources.syncAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ical-sources'] });
      queryClient.invalidateQueries({ queryKey: ['ota-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setSyncingAll(false);
      toast.success('All iCal sources synced - calendar updated with all OTA bookings');
    },
    onError: (error: any) => {
      setSyncingAll(false);
      toast.error(error.response?.data?.message || 'Failed to sync all sources');
    },
  });

  const deleteSource = useMutation({
    mutationFn: (id: string) => api.icalSources.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ical-sources'] });
      toast.success('iCal source removed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete iCal source');
    },
  });

  const handleSync = (id: string) => {
    setSyncingId(id);
    syncSource.mutate(id);
  };

  const handleSyncAll = () => {
    setSyncingAll(true);
    syncAllSources.mutate();
  };

  const handleDelete = (id: string, otaName: string) => {
    if (confirm(`Remove iCal source for ${otaName}? Bookings synced from this source will remain.`)) {
      deleteSource.mutate(id);
    }
  };

  return (
    <Card className="border border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">iCal Sync Sources</CardTitle>
            <CardDescription>Manage your OTA calendar synchronization</CardDescription>
          </div>
          {sources.length > 0 && (
            <Button
              onClick={handleSyncAll}
              disabled={syncingAll}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {syncingAll ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Syncing All...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Sync All
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No iCal sources configured</h3>
            <p className="text-sm text-gray-600 mb-4">
              Add iCal URLs from your OTA platforms to automatically sync bookings and prevent overbooking
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((source) => (
              <div key={source.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-purple-100 text-purple-800 text-xs">
                        {source.ota_name}
                      </Badge>
                      <Badge className={cn(
                        'text-xs',
                        source.sync_status === 'active' ? 'bg-green-100 text-green-800' :
                        source.sync_status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      )}>
                        {source.sync_status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1 truncate">{source.ical_url}</p>
                    <p className="text-xs text-gray-500">
                      Last synced: {formatDate(source.last_synced)} · {source.bookings_count} bookings
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(source.id)}
                      disabled={syncingId === source.id}
                    >
                      {syncingId === source.id ? (
                        <>
                          <div className="w-3 h-3 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                          Syncing...
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                          Sync
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(source.id, source.ota_name)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// iCal Sync Modal Component
// ============================================================================

interface ICalSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ICalSyncModal({ isOpen, onClose }: ICalSyncModalProps) {
  const queryClient = useQueryClient();
  const [otaName, setOtaName] = useState('');
  const [icalUrl, setIcalUrl] = useState('');

  const createICalSource = useMutation({
    mutationFn: (data: { ota_name: string; ical_url: string }) =>
      api.icalSources.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ical-sources'] });
      setOtaName('');
      setIcalUrl('');
      onClose();
      toast.success('iCal source added successfully - bookings will be synced automatically');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add iCal source');
    },
  });

  const handleSubmit = () => {
    if (!otaName || !icalUrl) {
      toast.error('Please fill in all fields');
      return;
    }

    // Validate URL format
    try {
      new URL(icalUrl);
    } catch (e) {
      toast.error('Please enter a valid iCal URL');
      return;
    }

    createICalSource.mutate({
      ota_name: otaName,
      ical_url: icalUrl,
    });
  };

  // Reset form when modal closes
  const handleClose = (open: boolean) => {
    if (!open) {
      setOtaName('');
      setIcalUrl('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-gray-900">Add iCal Sync Source</DialogTitle>
          <DialogDescription className="text-gray-700">
            Connect your OTA calendar to automatically import bookings and prevent overbooking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Once added, bookings from this iCal feed will automatically sync to your calendar and block those dates to prevent double bookings.
            </p>
          </div>

          <div>
            <Label htmlFor="ota_select" className="text-gray-900 font-medium">
              OTA Platform <span className="text-red-500">*</span>
            </Label>
            <Select value={otaName} onValueChange={setOtaName}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select OTA" />
              </SelectTrigger>
              <SelectContent>
                {OTA_PLATFORMS.map((ota) => (
                  <SelectItem key={ota} value={ota}>{ota}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="ical_url" className="text-gray-900 font-medium">
              iCal URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ical_url"
              type="url"
              value={icalUrl}
              onChange={(e) => setIcalUrl(e.target.value)}
              placeholder="https://www.airbnb.com/calendar/ical/..."
              className="text-gray-900 mt-1.5"
            />
            <p className="text-xs text-gray-600 mt-1.5">
              Find this URL in your OTA platform's calendar export settings
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={createICalSource.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createICalSource.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {createICalSource.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Adding...
              </>
            ) : (
              'Add Source'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
