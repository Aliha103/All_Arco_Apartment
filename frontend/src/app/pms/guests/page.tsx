'use client';

// ============================================================================
// Guest Directory - Booking-Centric View
// ============================================================================
// Professional booking card interface with guest details modal
// Features:
// - Booking cards with primary guest and dates
// - Modal showing all guests with relationships and documents
// - Search and filter functionality
// - Statistics dashboard
// ============================================================================

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Users,
  Calendar,
  FileText,
  User,
  CreditCard,
  MapPin,
  Mail,
  Image as ImageIcon,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDate, cn } from '@/lib/utils';
import api from '@/lib/api';

// ============================================================================
// TYPES
// ============================================================================

interface BookingGuest {
  id: string;
  is_primary: boolean;
  first_name: string;
  last_name: string;
  email?: string;
  date_of_birth?: string;
  country_of_birth?: string;
  relationship?: string;
  birth_province?: string;
  birth_city?: string;
  document_type?: string;
  document_number?: string;
  document_issue_date?: string;
  document_expire_date?: string;
  document_issue_country?: string;
  document_issue_province?: string;
  document_issue_city?: string;
  note?: string;
  parent_guest?: string;
}

interface Booking {
  id: string;
  booking_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  number_of_guests: number;
  nights: number;
  total_price: number;
  guests?: BookingGuest[];
}

// ============================================================================
// STATUS BADGES
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800 border-green-200' },
  checked_in: { label: 'Checked In', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  checked_out: { label: 'Checked Out', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200' },
};

const DOCUMENT_TYPE_DISPLAY: Record<string, string> = {
  passport: 'Passport',
  id_card: 'ID Card',
  driving_license: 'Driving License',
  residence_permit: 'Residence Permit',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function GuestDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['bookings-with-guests'],
    queryFn: async () => {
      const response = await api.bookings.list();
      return response.data?.results || response.data || [];
    },
    refetchInterval: 60000,
  });

  const bookings: Booking[] = bookingsData || [];

  // Fetch guests for selected booking
  const { data: bookingGuests } = useQuery({
    queryKey: ['booking-guests', selectedBooking?.id],
    queryFn: async () => {
      if (!selectedBooking?.id) return [];
      const response = await api.bookings.guests.list(selectedBooking.id);
      return response.data || [];
    },
    enabled: !!selectedBooking?.id && isModalOpen,
  });

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const stats = useMemo(() => {
    const activeBookings = bookings.filter((b) =>
      ['confirmed', 'paid', 'checked_in'].includes(b.status)
    );
    const totalGuests = bookings.reduce((sum, b) => sum + (b.number_of_guests || 0), 0);
    const checkedIn = bookings.filter((b) => b.status === 'checked_in').length;

    return {
      totalBookings: bookings.length,
      activeBookings: activeBookings.length,
      totalGuests,
      checkedIn,
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.booking_id?.toLowerCase().includes(query) ||
          b.guest_name?.toLowerCase().includes(query) ||
          b.guest_email?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }

    // Sort by check-in date (most recent first)
    return filtered.sort(
      (a, b) => new Date(b.check_in_date).getTime() - new Date(a.check_in_date).getTime()
    );
  }, [bookings, searchQuery, statusFilter]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Guest Directory</h1>
              <p className="text-gray-600 mt-1">View all bookings and guest information</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-6 py-6">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Bookings</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalBookings}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Bookings</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.activeBookings}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Guests</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalGuests}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Checked In</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.checkedIn}</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <User className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-gray-200 shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by booking ID, guest name, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="paid">Paid</option>
                <option value="checked_in">Checked In</option>
                <option value="checked_out">Checked Out</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Booking Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">Loading bookings...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No bookings found</p>
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onClick={() => handleBookingClick(booking)}
              />
            ))
          )}
        </div>
      </div>

      {/* Guest Details Modal */}
      <GuestDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        booking={selectedBooking}
        guests={bookingGuests || []}
      />
    </div>
  );
}

// ============================================================================
// BOOKING CARD COMPONENT
// ============================================================================

interface BookingCardProps {
  booking: Booking;
  onClick: () => void;
}

function BookingCard({ booking, onClick }: BookingCardProps) {
  const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;

  return (
    <Card
      onClick={onClick}
      className="border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{booking.booking_id}</h3>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
            </div>
            <Badge className={cn('text-xs font-medium px-2 py-0.5 border', statusConfig.color)}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          {/* Primary Guest */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 rounded">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Primary Guest</p>
              <p className="text-sm font-medium text-gray-900 truncate">{booking.guest_name}</p>
            </div>
          </div>

          {/* Check-in Date */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-50 rounded">
              <Calendar className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Check-in</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(booking.check_in_date)}</p>
            </div>
          </div>

          {/* Check-out Date */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-50 rounded">
              <Calendar className="w-4 h-4 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Check-out</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(booking.check_out_date)}</p>
            </div>
          </div>

          {/* Number of Guests */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-50 rounded">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Guests</p>
              <p className="text-sm font-medium text-gray-900">{booking.number_of_guests} guest{booking.number_of_guests !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// GUEST DETAILS MODAL COMPONENT
// ============================================================================

interface GuestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  guests: BookingGuest[];
}

function GuestDetailsModal({ isOpen, onClose, booking, guests }: GuestDetailsModalProps) {
  if (!booking) return null;

  const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const primaryGuest = guests.find((g) => g.is_primary);
  const companionGuests = guests.filter((g) => !g.is_primary);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {booking.booking_id}
            </DialogTitle>
            <Badge className={cn('text-xs font-medium px-3 py-1 border', statusConfig.color)}>
              {statusConfig.label}
            </Badge>
          </div>
          <div className="text-sm text-gray-600 mt-2">
            {formatDate(booking.check_in_date)} → {formatDate(booking.check_out_date)} • {booking.nights} night{booking.nights !== 1 ? 's' : ''}
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Primary Guest */}
          {primaryGuest && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Primary Guest
              </h3>
              <GuestCard guest={primaryGuest} />
            </div>
          )}

          {/* Companion Guests */}
          {companionGuests.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Companions ({companionGuests.length})
              </h3>
              <div className="space-y-4">
                {companionGuests.map((guest) => (
                  <GuestCard key={guest.id} guest={guest} />
                ))}
              </div>
            </div>
          )}

          {guests.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>No guest information available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// GUEST CARD COMPONENT
// ============================================================================

interface GuestCardProps {
  guest: BookingGuest;
}

function GuestCard({ guest }: GuestCardProps) {
  return (
    <Card className="border-gray-200 bg-gray-50">
      <CardContent className="p-5">
        <div className="space-y-4">
          {/* Guest Name & Relationship */}
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">
                {guest.first_name} {guest.last_name}
              </h4>
              {guest.relationship && (
                <p className="text-sm text-gray-600 mt-1">{guest.relationship}</p>
              )}
            </div>
            {guest.is_primary && (
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">Primary</Badge>
            )}
          </div>

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {guest.email && (
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{guest.email}</p>
                </div>
              </div>
            )}

            {guest.date_of_birth && (
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Date of Birth</p>
                  <p className="text-sm text-gray-900">{formatDate(guest.date_of_birth)}</p>
                </div>
              </div>
            )}

            {guest.country_of_birth && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Country of Birth</p>
                  <p className="text-sm text-gray-900">{guest.country_of_birth}</p>
                </div>
              </div>
            )}

            {guest.birth_city && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Birth City</p>
                  <p className="text-sm text-gray-900">
                    {guest.birth_city}
                    {guest.birth_province && `, ${guest.birth_province}`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Document Information */}
          {guest.document_number && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-600" />
                Document Information
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {guest.document_type && (
                  <div>
                    <p className="text-xs text-gray-500">Document Type</p>
                    <p className="text-sm text-gray-900">
                      {DOCUMENT_TYPE_DISPLAY[guest.document_type] || guest.document_type}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-gray-500">Document Number</p>
                  <p className="text-sm text-gray-900 font-mono">{guest.document_number}</p>
                </div>

                {guest.document_issue_date && (
                  <div>
                    <p className="text-xs text-gray-500">Issue Date</p>
                    <p className="text-sm text-gray-900">{formatDate(guest.document_issue_date)}</p>
                  </div>
                )}

                {guest.document_expire_date && (
                  <div>
                    <p className="text-xs text-gray-500">Expiry Date</p>
                    <p className="text-sm text-gray-900">{formatDate(guest.document_expire_date)}</p>
                  </div>
                )}

                {guest.document_issue_country && (
                  <div>
                    <p className="text-xs text-gray-500">Issue Country</p>
                    <p className="text-sm text-gray-900">{guest.document_issue_country}</p>
                  </div>
                )}

                {guest.document_issue_city && (
                  <div>
                    <p className="text-xs text-gray-500">Issue City</p>
                    <p className="text-sm text-gray-900">
                      {guest.document_issue_city}
                      {guest.document_issue_province && `, ${guest.document_issue_province}`}
                    </p>
                  </div>
                )}
              </div>

              {/* Document Upload Placeholder */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <ImageIcon className="w-4 h-4" />
                  <span className="font-medium">Document uploads coming soon</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Upload document images for verification
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          {guest.note && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h5 className="text-sm font-semibold text-gray-900 mb-2">Notes</h5>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{guest.note}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
