'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Users,
  Star,
  TrendingUp,
  DollarSign,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Upload,
  X,
  ChevronRight,
  Filter,
  Download,
  Eye,
  Plus,
  User,
} from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

// Types
interface GuestDocument {
  id: string;
  document_type: 'passport' | 'id' | 'visa' | 'other';
  document_number?: string;
  file_url: string;
  file_name: string;
  uploaded_at: string;
}

interface GuestPhoto {
  id: string;
  photo_url: string;
  uploaded_at: string;
  description?: string;
}

interface GuestNote {
  id: string;
  note: string;
  created_by: string;
  created_at: string;
}

interface GuestBooking {
  id: string;
  confirmation_code: string;
  check_in: string;
  check_out: string;
  total_amount: string;
  status: string;
  guests_count: number;
}

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  nationality?: string;
  passport_number?: string;
  document_number?: string;
  document_type?: string;
  date_of_birth?: string;
  latest_booking_code?: string;
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  relationship?: string;
  is_vip: boolean;
  preferences?: string;
  total_bookings: number;
  total_spent: string;
  total_guests_count?: number;
  online_bookings?: number;
  online_checkin?: boolean;
  date_joined: string;
  created_at: string;
  avatar_url?: string;
  documents?: GuestDocument[];
  photos?: GuestPhoto[];
  notes?: GuestNote[];
  bookings?: GuestBooking[];
}

// Statistics Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'blue'
}: {
  title: string;
  value: string | number;
  icon: any;
  trend?: string;
  color?: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold mt-2">{value}</p>
              {trend && (
                <p className="text-xs text-green-600 mt-1 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {trend}
                </p>
              )}
            </div>
            <div className={`${colorClasses[color as keyof typeof colorClasses]} p-3 rounded-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Guest Card Component
function GuestCard({ guest, onClick }: { guest: Guest; onClick: () => void }) {
  const initials = `${(guest.first_name || '?')[0]}${(guest.last_name || '?')[0]}`.toUpperCase();
  const bookingCode = guest.latest_booking_code || '—';
  const etaCheckin = (guest as any).eta_checkin_time;
  const etaCheckout = (guest as any).eta_checkout_time;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.1)' }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className="h-full hover:border-blue-300 transition-colors shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {[guest.first_name, guest.last_name].filter(Boolean).join(' ') || 'Guest'}
                  </h3>
                  {guest.online_checkin && <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">Online check-in</Badge>}
                </div>
                <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-gray-400" />
                  Booking {bookingCode}
                </p>
              </div>
            </div>
            {guest.is_vip && (
              <Badge className="bg-yellow-400 text-yellow-900">VIP</Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center text-gray-700">
              <Mail className="w-4 h-4 mr-2 text-gray-500" />
              <span className="truncate">{guest.email}</span>
            </div>
            {guest.phone && (
              <div className="flex items-center text-gray-700">
                <Phone className="w-4 h-4 mr-2 text-gray-500" />
                <span className="truncate">{guest.phone}</span>
              </div>
            )}
            {(etaCheckin || etaCheckout) && (
              <div className="col-span-2 flex items-center text-gray-700">
                <Clock className="w-4 h-4 mr-2 text-gray-500" />
                <span>
                  ETA {etaCheckin || '—'} / ETD {etaCheckout || '—'}
                </span>
              </div>
            )}
            <div className="flex items-center text-gray-700">
              <Users className="w-4 h-4 mr-2 text-gray-500" />
              <span>{guest.total_bookings} booking{guest.total_bookings === 1 ? '' : 's'}</span>
            </div>
            <div className="flex items-center text-gray-700">
              <DollarSign className="w-4 h-4 mr-2 text-gray-500" />
              <span>{formatCurrency(guest.total_spent)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Eye className="w-4 h-4 text-blue-500" />
              <span>View registered guests & documents</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Guest Details Modal
function GuestDetailsModal({
  guest,
  isOpen,
  onClose
}: {
  guest: Guest | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState('profile');
  const [newNote, setNewNote] = useState('');
  const queryClient = useQueryClient();

  // Fetch bookings for this guest (by email) to power check-in links and history
  const { data: guestBookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['guest-bookings', guest?.email],
    queryFn: async () => {
      if (!guest?.email) return [];
      const res = await api.bookings.list({ guest_email: guest.email });
      return res.data.results || res.data || [];
    },
    enabled: Boolean(guest?.email),
  });

  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      if (!guest?.id) throw new Error('Guest not available');
      return api.users.guests.addNote(guest.id, note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-guests'] });
      queryClient.invalidateQueries({ queryKey: ['guest-notes', guest?.id] });
      setNewNote('');
      toast.success('Note added successfully');
    },
    onError: () => {
      toast.error('Failed to add note');
    },
  });

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate(newNote);
  };

  const bookings = useMemo(() => {
    if (guest?.bookings && Array.isArray(guest.bookings) && guest.bookings.length > 0) {
      return guest.bookings as any[];
    }
    if (Array.isArray(guestBookings)) {
      return guestBookings as any[];
    }
    return [];
  }, [guest?.bookings, guestBookings]);

  const sortedBookings = useMemo(() => {
    if (!bookings || bookings.length === 0) return [];
    return [...bookings].sort((a: any, b: any) => {
      const aDate = new Date(a.check_in_date || a.check_in);
      const bDate = new Date(b.check_in_date || b.check_in);
      return aDate.getTime() - bDate.getTime();
    });
  }, [bookings]);

  // Pick earliest upcoming; if none upcoming, pick most recent past
  const primaryBooking = useMemo(() => {
    if (!sortedBookings || sortedBookings.length === 0) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const upcoming = sortedBookings.filter((b: any) => {
      const d = new Date(b.check_in_date || b.check_in);
      return d >= today;
    });
    if (upcoming.length > 0) {
      return upcoming[0];
    }
    return sortedBookings[sortedBookings.length - 1];
  }, [sortedBookings]);

  const registeredGuests = useMemo(() => {
    if (!primaryBooking) return [];
    const candidates = [
      (primaryBooking as any).guests,
      (primaryBooking as any).guest_details,
      (primaryBooking as any).booking_guests,
    ].find((arr) => Array.isArray(arr) && arr.length > 0);
    return Array.isArray(candidates) ? candidates : [];
  }, [primaryBooking]);

  const buildCheckinLink = (booking: any) => {
    if (!booking || !guest?.email) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const confirmation = booking.confirmation_code || booking.booking_id || booking.id;
    if (!confirmation) return '';
    return `${origin}/booking/checkin?confirmation=${encodeURIComponent(confirmation)}&email=${encodeURIComponent(guest.email)}`;
  };

  const safeFirst = guest?.first_name || '';
  const safeLast = guest?.last_name || '';
  const safeInitials = `${safeFirst.charAt(0) || '?'}${safeLast.charAt(0) || '?'}`.toUpperCase();

  if (!guest) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader className="border-b pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              {guest.avatar_url ? (
                <img
                  src={guest.avatar_url}
                  alt={`${safeFirst} ${safeLast}`.trim() || 'Guest'}
                  className="w-20 h-20 rounded-full object-cover border-4 border-blue-100"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {safeInitials}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-2xl font-bold text-gray-900">
                    {[safeFirst, safeLast].filter(Boolean).join(' ') || 'Guest'}
                  </DialogTitle>
                  {guest.is_vip && (
                    <Badge className="bg-yellow-400 text-yellow-900">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      VIP
                    </Badge>
                  )}
                </div>
                <p className="text-base text-gray-600 mt-1 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {guest.email}
                </p>
                {guest.phone && (
                  <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                    <Phone className="w-4 h-4" />
                    {guest.phone}
                  </p>
                )}
              </div>
            </div>

            {primaryBooking && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const link = buildCheckinLink(primaryBooking);
                    navigator.clipboard.writeText(link);
                    toast.success('Check-in link copied');
                  }}
                  className="text-gray-900"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Copy Check-in Link
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const link = buildCheckinLink(primaryBooking);
                    const mailto = `mailto:support@allarcoapartment.com?subject=Online check-in&body=Please complete your online check-in: ${encodeURIComponent(link)}`;
                    window.location.href = mailto;
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-5 bg-gray-100 p-1">
            <TabsTrigger value="profile" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="guests" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
              <Users className="w-4 h-4 mr-2" />
              Guests
            </TabsTrigger>
            <TabsTrigger value="bookings" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
              <Calendar className="w-4 h-4 mr-2" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="notes" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
              <FileText className="w-4 h-4 mr-2" />
              Notes
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4 mt-6">
            {/* Contact Information */}
            <Card className="border-gray-200">
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Mail className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                      <p className="text-sm mt-1 text-gray-900 font-medium">{guest.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <Phone className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</label>
                      <p className="text-sm mt-1 text-gray-900 font-medium">{guest.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <Calendar className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</label>
                      <p className="text-sm mt-1 text-gray-900 font-medium">{guest.date_of_birth ? formatDate(guest.date_of_birth) : 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <MapPin className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nationality</label>
                      <p className="text-sm mt-1 text-gray-900 font-medium">{guest.nationality || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card className="border-gray-200">
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Address
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2 flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <MapPin className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Street Address</label>
                      <p className="text-sm mt-1 text-gray-900 font-medium">{guest.address || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <MapPin className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">City</label>
                      <p className="text-sm mt-1 text-gray-900 font-medium">{guest.city || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <MapPin className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Country</label>
                      <p className="text-sm mt-1 text-gray-900 font-medium">{guest.country || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <MapPin className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Postal Code</label>
                      <p className="text-sm mt-1 text-gray-900 font-medium">{guest.postal_code || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Identification */}
              <Card className="border-gray-200">
                <CardHeader className="bg-gray-50">
                  <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Identification
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Document</label>
                      <p className="text-sm mt-1 text-gray-900 font-medium">
                        {guest.document_number
                          ? `${guest.document_type ? guest.document_type.replace('_', ' ') + ': ' : ''}${guest.document_number}`
                          : guest.passport_number || 'Not provided'}
                      </p>
                      {guest.relationship && (
                        <p className="text-xs text-gray-600 mt-1">Relationship: {guest.relationship}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card className="border-gray-200">
                <CardHeader className="bg-gray-50">
                  <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-red-600" />
                    Emergency Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-50 rounded-lg">
                        <User className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</label>
                        <p className="text-sm mt-1 text-gray-900 font-medium">{guest.emergency_contact_name || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-50 rounded-lg">
                        <Phone className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</label>
                        <p className="text-sm mt-1 text-gray-900 font-medium">{guest.emergency_contact_phone || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preferences */}
            {guest.preferences && (
              <Card className="border-gray-200">
                <CardHeader className="bg-gray-50">
                  <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Preferences & Special Requests
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-900 leading-relaxed">{guest.preferences}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Guests Tab */}
          <TabsContent value="guests" className="space-y-4 mt-6">
            <Card className="border-gray-200">
              <CardHeader className="bg-gray-50 flex flex-col gap-2">
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Guests
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Primary guest plus any family members or companions attached to their bookings.
                </p>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Primary guest</p>
                    <p className="text-base font-semibold text-gray-900">
                      {[safeFirst, safeLast].filter(Boolean).join(' ') || 'Guest'}
                    </p>
                    <p className="text-sm text-gray-600">{guest.email}</p>
                    {guest.phone && <p className="text-sm text-gray-600">{guest.phone}</p>}
                  </div>
                </div>

                <div className="p-3 border rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-800">
                    Companions added via online check-in appear as separate guest entries. Open the booking to review or update their details.
                  </p>
                  {primaryBooking && (
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => window.open(`/pms/bookings/${primaryBooking.id}`, '_blank')}
                    >
                      View booking
                    </Button>
                  )}
                </div>

                <Card className="border-gray-200">
                  <CardHeader className="bg-gray-50">
                    <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      Registered guests for latest booking
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Expand each guest to see the details captured during online check-in.
                    </p>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {registeredGuests.length === 0 && (
                      <p className="text-sm text-gray-600">No companion details available yet.</p>
                    )}
                    {registeredGuests.map((g: any, idx: number) => (
                      <details key={idx} className="group border rounded-lg p-3">
                        <summary className="flex items-center justify-between cursor-pointer text-sm font-semibold text-gray-900">
                          <span>{g.first_name} {g.last_name}</span>
                          <ChevronRight className="w-4 h-4 text-gray-500 group-open:rotate-90 transition-transform" />
                        </summary>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                          {g.date_of_birth && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span>DOB: {g.date_of_birth}</span>
                            </div>
                          )}
                          {g.country_of_birth && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-500" />
                              <span>Birth country: {g.country_of_birth}</span>
                            </div>
                          )}
                          {g.document_number && (
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-500" />
                              <span>{g.document_type || 'Document'}: {g.document_number}</span>
                            </div>
                          )}
                          {g.relationship && (
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-500" />
                              <span>Relationship: {g.relationship}</span>
                            </div>
                          )}
                        </div>
                      </details>
                    ))}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900">Current Booking</CardTitle>
                  {bookings && bookings.length > 1 && (
                    <Badge variant="secondary" className="text-gray-900">{bookings.length} total bookings</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <p className="text-center py-8 text-gray-600">Loading booking information…</p>
                ) : primaryBooking ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Booking Header */}
                    <div className="flex items-center justify-between pb-4 border-b">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <Calendar className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900">
                            {primaryBooking.confirmation_code || primaryBooking.booking_id || `#${primaryBooking.id}`}
                          </h3>
                          <p className="text-sm text-gray-600">Booking Reference</p>
                        </div>
                      </div>
                      <Badge className="text-sm text-gray-900">{primaryBooking.status}</Badge>
                    </div>

                    {/* Booking Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                          <Calendar className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Check-in</label>
                          <p className="text-base mt-1 text-gray-900 font-semibold">
                            {(primaryBooking.check_in_date || primaryBooking.check_in)
                              ? formatDate(primaryBooking.check_in_date || primaryBooking.check_in)
                              : '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-orange-50 rounded-lg">
                          <Calendar className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Check-out</label>
                          <p className="text-base mt-1 text-gray-900 font-semibold">
                            {(primaryBooking.check_out_date || primaryBooking.check_out)
                              ? formatDate(primaryBooking.check_out_date || primaryBooking.check_out)
                              : '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                          <DollarSign className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Amount</label>
                          <p className="text-base mt-1 text-green-600 font-bold">
                            {formatCurrency(primaryBooking.total_price || primaryBooking.total_amount || 0)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t">
                      <Button
                        size="default"
                        variant="outline"
                        className="flex-1 text-gray-900"
                        onClick={() => {
                          const link = buildCheckinLink(primaryBooking);
                          if (!link) return toast.error('No check-in link available for this booking');
                          navigator.clipboard.writeText(link);
                          toast.success('Check-in link copied to clipboard');
                        }}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Copy Check-in Link
                      </Button>
                      <Button
                        size="default"
                        variant="outline"
                        className="flex-1 text-gray-900"
                        onClick={() => {
                          const link = buildCheckinLink(primaryBooking);
                          if (!link) return toast.error('No check-in link available for this booking');
                          const mailto = `mailto:${guest.email}?subject=Complete your online check-in&body=Hi ${guest.first_name},%0D%0A%0D%0APlease complete your online check-in for your upcoming stay:%0D%0A${encodeURIComponent(link)}`;
                          window.location.href = mailto;
                        }}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Send Check-in Email
                      </Button>
                      <Button
                        size="default"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => window.open(`/pms/bookings/${primaryBooking.id}`, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Full Details
                      </Button>
                    </div>

                    {/* Additional Info - Only show if guest has multiple upcoming/active bookings */}
                    {(() => {
                      const upcomingBookings = bookings?.filter((b: any) => {
                        const checkInDate = new Date(b.check_in_date || b.check_in);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return checkInDate >= today && b.status !== 'cancelled';
                      }) || [];

                      return upcomingBookings.length > 1 ? (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-900">
                            <span className="font-semibold">Note:</span> This guest has {upcomingBookings.length} upcoming bookings.
                            Showing the most recent one. Click "View Full Details" to see all booking history.
                          </p>
                        </div>
                      ) : null;
                    })()}
                  </motion.div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No bookings found for this guest</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Documents & Photos</CardTitle>
                  <Button
                    size="sm"
                    onClick={() => toast.info('Document upload coming soon')}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Documents Section */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 text-gray-900">Identity Documents</h4>
                  {guest.documents && guest.documents.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {guest.documents.map((doc) => (
                        <motion.div
                          key={doc.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <FileText className="w-8 h-8 text-blue-500" />
                            <Badge>{doc.document_type}</Badge>
                          </div>
                          <p className="font-medium text-sm mb-1 text-gray-900">{doc.file_name}</p>
                          {doc.document_number && (
                            <p className="text-xs text-gray-600 mb-2">
                              #{doc.document_number}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mb-3">
                            Uploaded {formatDate(doc.uploaded_at)}
                          </p>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" className="flex-1">
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1">
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 py-4">No documents uploaded</p>
                  )}
                </div>

                {/* Photos Section */}
                <div>
                  <h4 className="font-semibold mb-3 text-gray-900">Photos</h4>
                  {guest.photos && guest.photos.length > 0 ? (
                    <div className="grid grid-cols-3 gap-4">
                      {guest.photos.map((photo) => (
                        <motion.div
                          key={photo.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.05 }}
                          className="relative aspect-square rounded-lg overflow-hidden border cursor-pointer"
                        >
                          <img
                            src={photo.photo_url}
                            alt={photo.description || 'Guest photo'}
                            className="w-full h-full object-cover"
                          />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 py-4">No photos uploaded</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle>Team Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Add Note Form */}
                <div className="mb-6">
                  <Textarea
                    placeholder="Add a note about this guest..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="mb-2"
                    rows={3}
                  />
                  <Button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || addNoteMutation.isPending}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {addNoteMutation.isPending ? 'Adding...' : 'Add Note'}
                  </Button>
                </div>

                {/* Notes List */}
                {guest.notes && guest.notes.length > 0 ? (
                  <div className="space-y-4">
                    {guest.notes.map((note) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border-l-4 border-blue-500 bg-gray-50 p-4 rounded"
                      >
                        <p className="text-sm mb-2 text-gray-900">{note.note}</p>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>By {note.created_by}</span>
                          <span>{formatDate(note.created_at)}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-gray-600">No notes yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Main Component
export default function GuestsPage() {
  const [search, setSearch] = useState('');
  const [nationalityFilter, setNationalityFilter] = useState('all');
  const [vipFilter, setVipFilter] = useState('all');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Fetch guests
  const { data: guests, isLoading } = useQuery({
    queryKey: ['all-guests'],
    queryFn: async () => {
      const response = await api.users.guests.list();
      return (response.data.results || response.data) as Guest[];
    },
  });

  // Debounced search and filtering
  const filteredGuests = useMemo(() => {
    if (!guests) return [];

    // Only show guests that are tied to at least one booking
    const bookingGuests = guests.filter((g) => (g.total_bookings || 0) > 0);

    return bookingGuests.filter((guest) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        guest.first_name.toLowerCase().includes(searchLower) ||
        guest.last_name.toLowerCase().includes(searchLower) ||
        guest.email.toLowerCase().includes(searchLower) ||
        guest.phone?.toLowerCase().includes(searchLower) ||
        guest.passport_number?.toLowerCase().includes(searchLower);

      const matchesNationality =
        nationalityFilter === 'all' || guest.nationality === nationalityFilter;

      const matchesVIP =
        vipFilter === 'all' ||
        (vipFilter === 'vip' && guest.is_vip) ||
        (vipFilter === 'regular' && !guest.is_vip);

      return matchesSearch && matchesNationality && matchesVIP;
    });
  }, [guests, search, nationalityFilter, vipFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!guests) return null;

    const bookingGuests = guests.filter((g) => (g.total_bookings || 0) > 0);
    if (bookingGuests.length === 0) {
      return {
        totalGuests: 0,
        totalBookings: 0,
        avgBookingsPerGuest: '0',
        avgGuestsPerBooking: '0.00',
        onlineBookings: 0,
      };
    }

    const totalGuests = bookingGuests.length;
    const totalBookings = bookingGuests.reduce((sum, g) => sum + (g.total_bookings || 0), 0);
    const totalGuestCount = bookingGuests.reduce((sum, g) => sum + (g.total_guests_count || 0), 0);
    const onlineBookings = bookingGuests.reduce((sum, g) => sum + (g.online_bookings || 0), 0);

    return {
      totalGuests,
      totalBookings,
      avgBookingsPerGuest: totalGuests > 0 ? (totalBookings / totalGuests).toFixed(1) : '0',
      avgGuestsPerBooking:
        totalBookings > 0 ? (totalGuestCount / totalBookings).toFixed(2) : '0.00',
      onlineBookings,
    };
  }, [guests]);

  // Get unique nationalities for filter
  const nationalities = useMemo(() => {
    if (!guests) return [];
    const uniqueNationalities = [...new Set(guests.map((g) => g.nationality).filter(Boolean))];
    return uniqueNationalities.sort();
  }, [guests]);

  const handleGuestClick = (guest: Guest) => {
    setSelectedGuest(guest);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-2">
          Guest Directory {filteredGuests.length ? `(${filteredGuests.length})` : ''}
        </h1>
        <p className="text-gray-600">
          Comprehensive guest management with profiles, documents, and booking history
        </p>
      </motion.div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Guests"
            value={stats.totalGuests}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Total Bookings"
            value={stats.totalBookings}
            icon={Calendar}
            color="purple"
          />
          <StatCard
            title="Avg. Guests / Booking"
            value={stats.avgGuestsPerBooking}
            icon={Users}
            color="orange"
          />
          <StatCard
            title="Online Check-ins"
            value={stats.onlineBookings}
            icon={TrendingUp}
            color="green"
          />
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, phone, or passport..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Nationality Filter */}
            <Select value={nationalityFilter} onValueChange={setNationalityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by nationality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Nationalities</SelectItem>
                {nationalities.map((nationality) => (
                  <SelectItem key={nationality} value={nationality!}>
                    {nationality}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* VIP Filter */}
            <Select value={vipFilter} onValueChange={setVipFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Guests</SelectItem>
                <SelectItem value="vip">VIP Only</SelectItem>
                <SelectItem value="regular">Regular Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters Display */}
          {(search || nationalityFilter !== 'all' || vipFilter !== 'all') && (
            <div className="mt-4 flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Active filters:</span>
              {search && (
                <Badge variant="secondary">
                  Search: {search}
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer"
                    onClick={() => setSearch('')}
                  />
                </Badge>
              )}
              {nationalityFilter !== 'all' && (
                <Badge variant="secondary">
                  {nationalityFilter}
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer"
                    onClick={() => setNationalityFilter('all')}
                  />
                </Badge>
              )}
              {vipFilter !== 'all' && (
                <Badge variant="secondary">
                  {vipFilter === 'vip' ? 'VIP' : 'Regular'}
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer"
                    onClick={() => setVipFilter('all')}
                  />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guest Tree/Directory */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            Guest Directory ({filteredGuests.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="h-64 animate-pulse">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mb-4" />
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-200 rounded mb-1" />
                  <div className="h-3 bg-gray-200 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredGuests.length > 0 ? (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            <AnimatePresence>
              {filteredGuests.map((guest) => (
                <GuestCard
                  key={guest.id}
                  guest={guest}
                  onClick={() => handleGuestClick(guest)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No guests found matching your filters</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSearch('');
                    setNationalityFilter('all');
                    setVipFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Guest Details Modal */}
      <GuestDetailsModal
        guest={selectedGuest}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedGuest(null);
        }}
      />
    </div>
  );
}
