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
  date_of_birth?: string;
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  is_vip: boolean;
  preferences?: string;
  total_bookings: number;
  total_spent: string;
  total_guests_count?: number;
  online_bookings?: number;
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
  const initials = `${guest.first_name[0]}${guest.last_name[0]}`.toUpperCase();

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
      <Card className="h-full hover:border-blue-300 transition-colors">
        <CardContent className="p-6">
          {/* Avatar & VIP Badge */}
          <div className="flex items-start justify-between mb-4">
            <div className="relative">
              {guest.avatar_url ? (
                <img
                  src={guest.avatar_url}
                  alt={`${guest.first_name} ${guest.last_name}`}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                  {initials}
                </div>
              )}
              {guest.is_vip && (
                <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1">
                  <Star className="w-4 h-4 text-white fill-current" />
                </div>
              )}
            </div>
            {guest.is_vip && (
              <Badge className="bg-yellow-400 text-yellow-900">VIP</Badge>
            )}
          </div>

          {/* Name */}
          <h3 className="text-lg font-semibold mb-1">
            {guest.first_name} {guest.last_name}
          </h3>

          {/* Contact Info */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{guest.email}</span>
            </div>
            {guest.phone && (
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{guest.phone}</span>
              </div>
            )}
            {guest.nationality && (
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{guest.nationality}</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-xs text-gray-500">Bookings</p>
              <p className="text-lg font-semibold">{guest.total_bookings}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Spent</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(guest.total_spent)}
              </p>
            </div>
          </div>

          {/* Documents Status */}
          {guest.documents && guest.documents.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center text-xs text-green-600">
                <UserCheck className="w-4 h-4 mr-1" />
                <span>{guest.documents.length} documents verified</span>
              </div>
            </div>
          )}
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

  const addNoteMutation = useMutation({
    mutationFn: (note: string) => api.users.guests.addNote(guest!.id, note),
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

  if (!guest) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {guest.avatar_url ? (
                <img
                  src={guest.avatar_url}
                  alt={`${guest.first_name} ${guest.last_name}`}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                  {`${guest.first_name[0]}${guest.last_name[0]}`.toUpperCase()}
                </div>
              )}
              <div>
                <DialogTitle className="text-2xl">
                  {guest.first_name} {guest.last_name}
                </DialogTitle>
                <p className="text-sm text-gray-600 mt-1">{guest.email}</p>
                {guest.is_vip && (
                  <Badge className="bg-yellow-400 text-yellow-900 mt-2">
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    VIP Guest
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-sm mt-1">{guest.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-sm mt-1">{guest.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Date of Birth</label>
                    <p className="text-sm mt-1">{guest.date_of_birth ? formatDate(guest.date_of_birth) : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Nationality</label>
                    <p className="text-sm mt-1">{guest.nationality || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-600">Street Address</label>
                    <p className="text-sm mt-1">{guest.address || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">City</label>
                    <p className="text-sm mt-1">{guest.city || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Country</label>
                    <p className="text-sm mt-1">{guest.country || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Postal Code</label>
                    <p className="text-sm mt-1">{guest.postal_code || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Identification */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Identification</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <label className="text-sm font-medium text-gray-600">Passport Number</label>
                  <p className="text-sm mt-1">{guest.passport_number || 'N/A'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Name</label>
                    <p className="text-sm mt-1">{guest.emergency_contact_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-sm mt-1">{guest.emergency_contact_phone || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preferences */}
            {guest.preferences && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Preferences & Special Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{guest.preferences}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Booking History</CardTitle>
              </CardHeader>
              <CardContent>
                {guest.bookings && guest.bookings.length > 0 ? (
                  <div className="space-y-4">
                    {guest.bookings.map((booking) => (
                      <motion.div
                        key={booking.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="font-semibold">{booking.confirmation_code}</span>
                          </div>
                          <Badge>{booking.status}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Check-in</p>
                            <p className="font-medium">{formatDate(booking.check_in)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Check-out</p>
                            <p className="font-medium">{formatDate(booking.check_out)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Amount</p>
                            <p className="font-semibold text-green-600">
                              {formatCurrency(booking.total_amount)}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-gray-600">No bookings found</p>
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
                  <Button size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Documents Section */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-3">Identity Documents</h4>
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
                          <p className="font-medium text-sm mb-1">{doc.file_name}</p>
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
                  <h4 className="font-semibold mb-3">Photos</h4>
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
                        <p className="text-sm mb-2">{note.note}</p>
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
        <h1 className="text-3xl font-bold mb-2">Guest Directory</h1>
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
