'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Download,
  Send,
  CheckCircle2,
  Clock,
  Calendar,
  Users,
  User,
  MapPin,
  CreditCard,
  AlertCircle,
  Building2,
  Loader2,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface BookingGuest {
  id: string;
  is_primary: boolean;
  first_name: string;
  last_name: string;
  email?: string;
  date_of_birth: string;
  country_of_birth: string;
  birth_province?: string;
  birth_city?: string;
  relationship?: string;
  document_type: string;
  document_number: string;
  document_issue_date?: string;
  document_expire_date?: string;
  document_issue_country?: string;
  document_issue_province?: string;
  document_issue_city?: string;
  note?: string;
  created_at: string;
}

interface Booking {
  id: string;
  booking_id: string;
  check_in_date: string;
  check_out_date: string;
  guest_name: string;
  guest_email: string;
  number_of_guests: number;
  nights: number;
  status: string;
  guests: BookingGuest[];
  alloggiati_sent: boolean;
  alloggiati_sent_at?: string;
  alloggiati_sent_by?: string;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AlloggiatiPage() {
  const queryClient = useQueryClient();
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  // Get current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ['current-user'],
    queryFn: async () => {
      const response = await api.auth.me();
      return response.data;
    },
  });

  // Fetch all bookings with guests
  const { data: bookingsData, isLoading } = useQuery<Booking[]>({
    queryKey: ['alloggiati-bookings'],
    queryFn: async () => {
      // Fetch confirmed, paid, checked-in, and checked-out bookings
      const response = await api.bookings.list({
        status: 'confirmed,paid,checked_in,checked_out',
        ordering: '-check_in_date',
      });
      return response.data.results || response.data || [];
    },
    refetchInterval: 30000,
  });

  const bookings = bookingsData || [];

  // Auto-select first booking
  const activeBooking = useMemo(() => {
    if (!bookings.length) return null;
    const selected = bookings.find((b) => b.id === selectedBookingId);
    return selected || bookings[0];
  }, [bookings, selectedBookingId]);

  // Set initial selection
  useMemo(() => {
    if (!selectedBookingId && bookings.length > 0) {
      setSelectedBookingId(bookings[0].id);
    }
  }, [bookings, selectedBookingId]);

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const sendToPolice = useMutation({
    mutationFn: async (bookingId: string) => {
      // Call backend API to send to Alloggiati
      const response = await api.alloggiati.submitToPolice(bookingId);
      return response.data;
    },
    onSuccess: (data, bookingId) => {
      toast.success('Successfully sent to police (Alloggiati)');
      queryClient.invalidateQueries({ queryKey: ['alloggiati-bookings'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send to police');
    },
  });

  const generatePDF = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await api.alloggiati.generatePDF(bookingId);
      return { blob: response.data, bookingId };
    },
    onSuccess: ({ blob, bookingId }) => {
      const booking = bookings.find((b) => b.id === bookingId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alloggiati-${booking?.booking_id}-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully');
    },
    onError: () => {
      toast.error('Failed to generate PDF');
    },
  });

  // ============================================================================
  // HELPERS
  // ============================================================================

  const isCurrentDayBooking = (booking: Booking) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = new Date(booking.check_in_date);
    checkInDate.setHours(0, 0, 0, 0);
    return checkInDate.getTime() === today.getTime();
  };

  const canSendToPolice = (booking: Booking) => {
    return !booking.alloggiati_sent && booking.guests && booking.guests.length > 0;
  };

  const getBookingStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
      paid: 'bg-green-100 text-green-800 border-green-300',
      checked_in: 'bg-purple-100 text-purple-800 border-purple-300',
      checked_out: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return classes[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading bookings...</p>
        </div>
      </div>
    );
  }

  if (!bookings.length) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-[1800px] mx-auto px-6 py-6">
            <h1 className="text-3xl font-bold text-gray-900">Alloggiati - Police Reporting</h1>
            <p className="text-gray-600 mt-1">Italian law compliance for guest registration</p>
          </div>
        </div>
        <div className="max-w-[1800px] mx-auto px-6 py-12">
          <Card className="border-gray-200">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <Users className="w-20 h-20 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Bookings Found</h3>
              <p className="text-gray-600">No confirmed bookings available for police reporting</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1800px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Alloggiati - Police Reporting</h1>
              <p className="text-gray-600 mt-1">Italian law compliance for guest registration</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800 border-blue-300 px-4 py-2">
                <FileText className="w-4 h-4 mr-2" />
                {bookings.length} Bookings
              </Badge>
              <Badge className="bg-green-100 text-green-800 border-green-300 px-4 py-2">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {bookings.filter((b) => b.alloggiati_sent).length} Sent
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-6 py-6">
        {/* Booking Tabs */}
        <Card className="border-gray-200 shadow-sm">
          <Tabs
            value={activeBooking?.id}
            onValueChange={setSelectedBookingId}
            className="w-full"
          >
            {/* Tab List - Scrollable horizontally */}
            <div className="border-b border-gray-200 bg-gray-50 overflow-x-auto">
              <TabsList className="inline-flex min-w-full justify-start bg-transparent p-0">
                {bookings.map((booking) => (
                  <TabsTrigger
                    key={booking.id}
                    value={booking.id}
                    className="relative px-6 py-4 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">
                            {booking.booking_id}
                          </span>
                          {booking.alloggiati_sent && (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          )}
                          {isCurrentDayBooking(booking) && (
                            <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-xs">
                              Today
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-600">
                          {format(new Date(booking.check_in_date), 'MMM dd')} -{' '}
                          {format(new Date(booking.check_out_date), 'MMM dd')}
                        </div>
                      </div>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Tab Content */}
            {bookings.map((booking) => (
              <TabsContent key={booking.id} value={booking.id} className="p-6">
                <BookingGuestsView
                  booking={booking}
                  currentUser={currentUser}
                  onSendToPolice={() => sendToPolice.mutate(booking.id)}
                  onDownloadPDF={() => generatePDF.mutate(booking.id)}
                  sendingToPolice={sendToPolice.isPending}
                  generatingPDF={generatePDF.isPending}
                />
              </TabsContent>
            ))}
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// BOOKING GUESTS VIEW COMPONENT
// ============================================================================

interface BookingGuestsViewProps {
  booking: Booking;
  currentUser?: User;
  onSendToPolice: () => void;
  onDownloadPDF: () => void;
  sendingToPolice: boolean;
  generatingPDF: boolean;
}

function BookingGuestsView({
  booking,
  currentUser,
  onSendToPolice,
  onDownloadPDF,
  sendingToPolice,
  generatingPDF,
}: BookingGuestsViewProps) {
  const isToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = new Date(booking.check_in_date);
    checkInDate.setHours(0, 0, 0, 0);
    return checkInDate.getTime() === today.getTime();
  }, [booking.check_in_date]);

  const primaryGuest = booking.guests?.find((g) => g.is_primary);
  const companions = booking.guests?.filter((g) => !g.is_primary) || [];

  const canSend = !booking.alloggiati_sent && booking.guests && booking.guests.length > 0;

  return (
    <div className="space-y-6">
      {/* Booking Summary Card */}
      <Card className="border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{booking.booking_id}</h2>
                <Badge className={`${getBookingStatusBadge(booking.status)}`}>
                  {booking.status}
                </Badge>
                {isToday && (
                  <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                    <Clock className="w-3 h-3 mr-1" />
                    Check-in Today
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-600">Check-in</p>
                    <p className="font-semibold">{formatDate(booking.check_in_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-gray-600">Check-out</p>
                    <p className="font-semibold">{formatDate(booking.check_out_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Users className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-600">Guests</p>
                    <p className="font-semibold">{booking.number_of_guests} guests</p>
                  </div>
                </div>
              </div>

              {booking.alloggiati_sent && (
                <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle2 className="w-5 h-5" />
                    <div>
                      <p className="font-semibold">Sent to Police</p>
                      <p className="text-xs">
                        Sent on {booking.alloggiati_sent_at ? formatDate(booking.alloggiati_sent_at) : 'N/A'}
                        {booking.alloggiati_sent_by && ` by ${booking.alloggiati_sent_by}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              {canSend && (
                <Button
                  onClick={onSendToPolice}
                  disabled={sendingToPolice}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  {sendingToPolice ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isToday ? 'Send to Police Now' : 'Schedule Send'}
                </Button>
              )}
              <Button
                onClick={onDownloadPDF}
                disabled={generatingPDF}
                variant="outline"
                className="gap-2 border-gray-300"
              >
                {generatingPDF ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guests List */}
      {!booking.guests || booking.guests.length === 0 ? (
        <Card className="border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-16 h-16 text-orange-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Guests Registered</h3>
            <p className="text-gray-600 text-center">
              This booking doesn't have any registered guests yet.
              <br />
              Guests must complete online check-in before sending to police.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Primary Guest */}
          {primaryGuest && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <User className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Primary Guest</h3>
              </div>
              <GuestDetailCard guest={primaryGuest} isPrimary />
            </div>
          )}

          {/* Companions */}
          {companions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Companions ({companions.length})
                </h3>
              </div>
              <div className="space-y-3">
                {companions.map((guest, index) => (
                  <GuestDetailCard key={guest.id} guest={guest} companionNumber={index + 1} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// GUEST DETAIL CARD COMPONENT
// ============================================================================

interface GuestDetailCardProps {
  guest: BookingGuest;
  isPrimary?: boolean;
  companionNumber?: number;
}

function GuestDetailCard({ guest, isPrimary, companionNumber }: GuestDetailCardProps) {
  const fullName = `${guest.first_name} ${guest.last_name}`;

  return (
    <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
              {isPrimary ? 'P' : companionNumber}
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">{fullName}</h4>
              <div className="flex items-center gap-2 mt-1">
                {isPrimary && (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                    Primary
                  </Badge>
                )}
                {guest.relationship && (
                  <Badge variant="secondary" className="text-xs">
                    {guest.relationship}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            Registered {format(new Date(guest.created_at), 'MMM dd, HH:mm')}
          </Badge>
        </div>

        {/* Personal Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <InfoField
            icon={Calendar}
            label="Date of Birth"
            value={formatDate(guest.date_of_birth)}
          />
          <InfoField
            icon={MapPin}
            label="Country of Birth"
            value={guest.country_of_birth}
          />
          {guest.birth_city && (
            <InfoField
              label="Birth City"
              value={`${guest.birth_city}${guest.birth_province ? `, ${guest.birth_province}` : ''}`}
            />
          )}
          {guest.email && (
            <InfoField
              label="Email"
              value={guest.email}
            />
          )}
        </div>

        {/* Document Information */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-gray-600" />
            <h5 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Document Information
            </h5>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <InfoField
              label="Document Type"
              value={formatDocumentType(guest.document_type)}
            />
            <InfoField
              label="Document Number"
              value={guest.document_number}
            />
            {guest.document_issue_date && (
              <InfoField
                label="Issue Date"
                value={formatDate(guest.document_issue_date)}
              />
            )}
            {guest.document_expire_date && (
              <InfoField
                label="Expiry Date"
                value={formatDate(guest.document_expire_date)}
              />
            )}
            {guest.document_issue_country && (
              <InfoField
                label="Issue Country"
                value={guest.document_issue_country}
              />
            )}
            {guest.document_issue_city && (
              <InfoField
                label="Issue City"
                value={`${guest.document_issue_city}${guest.document_issue_province ? `, ${guest.document_issue_province}` : ''}`}
              />
            )}
          </div>
        </div>

        {/* Notes */}
        {guest.note && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-blue-900 mb-1">Notes</p>
                <p className="text-sm text-blue-800">{guest.note}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface InfoFieldProps {
  icon?: React.ElementType;
  label: string;
  value: string;
}

function InfoField({ icon: Icon, label, value }: InfoFieldProps) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-600 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}

function getBookingStatusBadge(status: string) {
  const classes: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
    paid: 'bg-green-100 text-green-800 border-green-300',
    checked_in: 'bg-purple-100 text-purple-800 border-purple-300',
    checked_out: 'bg-gray-100 text-gray-800 border-gray-300',
  };
  return classes[status] || 'bg-gray-100 text-gray-800 border-gray-300';
}

function formatDocumentType(type: string) {
  const types: Record<string, string> = {
    passport: 'Passport',
    id_card: 'ID Card',
    driving_license: 'Driving License',
    residence_permit: 'Residence Permit',
  };
  return types[type] || type;
}
