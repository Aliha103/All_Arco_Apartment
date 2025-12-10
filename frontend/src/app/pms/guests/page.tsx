'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Users,
  Star,
  TrendingUp,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  X,
  ChevronRight,
  Filter,
  Download,
  User,
  Clock,
  CheckCircle2,
  Building2,
  Globe,
  CreditCard,
  MessageSquare,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

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
  document_issue_date?: string;
  document_expire_date?: string;
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
  created_at: string;
  eta_checkin_time?: string;
  eta_checkout_time?: string;
  has_billing_details?: boolean;
  billing_company_name?: string;
  billing_vat_number?: string;
}

interface GuestNote {
  id: string;
  note: string;
  created_by_name: string;
  created_at: string;
}

interface GuestBooking {
  id: string;
  booking_id: string;
  check_in_date: string;
  check_out_date: string;
  total_price: string;
  status: string;
  number_of_guests: number;
  nights: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function GuestDirectoryPage() {
  const queryClient = useQueryClient();
  const guestsApi = (api as any).guests;

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [nationalityFilter, setNationalityFilter] = useState('all');
  const [vipFilter, setVipFilter] = useState('all');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [newNote, setNewNote] = useState('');

  // ============================================================================
  // QUERIES
  // ============================================================================

  const { data: guestsData, isLoading: loadingGuests } = useQuery({
    queryKey: ['guests'],
    queryFn: async () => {
      const response = await guestsApi.list();
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const guests: Guest[] = guestsData || [];

  const { data: selectedGuestBookings } = useQuery({
    queryKey: ['guest-bookings', selectedGuest?.email],
    queryFn: async () => {
      if (!selectedGuest?.email) return [];
      const response = await api.bookings.list({ guest_email: selectedGuest.email });
      return response.data.results || response.data || [];
    },
    enabled: !!selectedGuest?.email,
  });

  const { data: selectedGuestNotes, refetch: refetchNotes } = useQuery({
    queryKey: ['guest-notes', selectedGuest?.id],
    queryFn: async () => {
      if (!selectedGuest?.id) return [];
      const response = await guestsApi.notes(selectedGuest.id);
      return response.data;
    },
    enabled: !!selectedGuest?.id,
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const addNoteMutation = useMutation({
    mutationFn: async ({ guestId, note }: { guestId: string; note: string }) => {
      return await guestsApi.addNote(guestId, note);
    },
    onSuccess: () => {
      toast.success('Note added successfully');
      setNewNote('');
      refetchNotes();
    },
    onError: () => {
      toast.error('Failed to add note');
    },
  });

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const stats = useMemo(() => {
    const totalGuests = guests.length;
    const totalBookings = guests.reduce((sum, g) => sum + (g.total_bookings || 0), 0);
    const avgBookingsPerGuest = totalGuests > 0 ? (totalBookings / totalGuests).toFixed(1) : '0';
    const onlineCheckins = guests.filter((g) => g.online_checkin).length;
    const vipGuests = guests.filter((g) => g.is_vip).length;

    return {
      totalGuests,
      totalBookings,
      avgBookingsPerGuest,
      onlineCheckins,
      vipGuests,
    };
  }, [guests]);

  const nationalities = useMemo(() => {
    const uniqueNationalities = new Set(guests.map((g) => g.nationality).filter(Boolean));
    return Array.from(uniqueNationalities).sort();
  }, [guests]);

  const filteredGuests = useMemo(() => {
    let filtered = [...guests];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.first_name?.toLowerCase().includes(query) ||
          g.last_name?.toLowerCase().includes(query) ||
          g.email?.toLowerCase().includes(query) ||
          g.phone?.toLowerCase().includes(query) ||
          g.passport_number?.toLowerCase().includes(query)
      );
    }

    // Nationality filter
    if (nationalityFilter !== 'all') {
      filtered = filtered.filter((g) => g.nationality === nationalityFilter);
    }

    // VIP filter
    if (vipFilter === 'vip') {
      filtered = filtered.filter((g) => g.is_vip);
    } else if (vipFilter === 'regular') {
      filtered = filtered.filter((g) => !g.is_vip);
    }

    return filtered.sort((a, b) => {
      const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
      const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [guests, searchQuery, nationalityFilter, vipFilter]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleAddNote = () => {
    if (!selectedGuest || !newNote.trim()) return;
    addNoteMutation.mutate({ guestId: selectedGuest.id, note: newNote });
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Nationality', 'Total Bookings', 'VIP'];
    const rows = filteredGuests.map((g) => [
      `${g.first_name} ${g.last_name}`,
      g.email,
      g.phone || '',
      g.nationality || '',
      g.total_bookings,
      g.is_vip ? 'Yes' : 'No',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guests-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Guest list exported');
  };

  const activeFilters = [
    searchQuery && { key: 'search', label: `Search: "${searchQuery}"`, clear: () => setSearchQuery('') },
    nationalityFilter !== 'all' && {
      key: 'nationality',
      label: `Nationality: ${nationalityFilter}`,
      clear: () => setNationalityFilter('all'),
    },
    vipFilter !== 'all' && {
      key: 'vip',
      label: `VIP: ${vipFilter === 'vip' ? 'Yes' : 'No'}`,
      clear: () => setVipFilter('all'),
    },
  ].filter(Boolean) as Array<{ key: string; label: string; clear: () => void }>;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1800px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Guest Directory</h1>
              <p className="text-gray-600 mt-1">Comprehensive guest management with profiles and booking history</p>
            </div>
            <Button onClick={handleExportCSV} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-6 py-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <StatCard
            icon={Users}
            label="Total Guests"
            value={stats.totalGuests.toString()}
            sublabel={`${stats.vipGuests} VIP`}
            iconColor="text-blue-600"
            bgColor="bg-blue-50"
          />
          <StatCard
            icon={TrendingUp}
            label="Total Bookings"
            value={stats.totalBookings.toString()}
            sublabel={`${stats.avgBookingsPerGuest} avg/guest`}
            iconColor="text-green-600"
            bgColor="bg-green-50"
          />
          <StatCard
            icon={UserCheck}
            label="Online Check-ins"
            value={stats.onlineCheckins.toString()}
            sublabel={`${
              stats.totalGuests ? ((stats.onlineCheckins / stats.totalGuests) * 100).toFixed(0) : '0'
            }% completion`}
            iconColor="text-emerald-600"
            bgColor="bg-emerald-50"
          />
        </div>

        {/* Filters */}
        <Card className="mb-6 border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search by name, email, phone, or passport..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 border-gray-300"
                  />
                </div>
              </div>
              <Select value={nationalityFilter} onValueChange={setNationalityFilter}>
                <SelectTrigger className="w-full lg:w-[200px] h-11 border-gray-300">
                  <SelectValue placeholder="Nationality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Nationalities</SelectItem>
                  {nationalities.map((nat) => (
                    <SelectItem key={nat} value={nat!}>
                      {nat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={vipFilter} onValueChange={setVipFilter}>
                <SelectTrigger className="w-full lg:w-[180px] h-11 border-gray-300">
                  <SelectValue placeholder="VIP Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Guests</SelectItem>
                  <SelectItem value="vip">VIP Only</SelectItem>
                  <SelectItem value="regular">Regular Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-600 font-medium">Active Filters:</span>
                {activeFilters.map((filter) => (
                  <Badge
                    key={filter.key}
                    variant="secondary"
                    className="gap-1 px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  >
                    {filter.label}
                    <button onClick={filter.clear} className="ml-1 hover:text-blue-900">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setNationalityFilter('all');
                    setVipFilter('all');
                  }}
                  className="h-6 px-2 text-xs"
                >
                  Clear All
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content: Guest List + Side Panel */}
        <div className="flex gap-6">
          {/* Guest List */}
          <div className={`transition-all duration-300 ${selectedGuest ? 'lg:w-1/2' : 'w-full'}`}>
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200 bg-gray-50">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Guests ({filteredGuests.length})
                </CardTitle>
                <CardDescription>Click on a guest to view detailed information</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loadingGuests ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading guests...</p>
                    </div>
                  </div>
                ) : filteredGuests.length === 0 ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No guests found</h3>
                      <p className="text-gray-500 mb-6">
                        {activeFilters.length > 0 ? 'Try adjusting your filters' : 'No guests registered yet'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 max-h-[700px] overflow-y-auto">
                    {filteredGuests.map((guest) => (
                      <GuestRow
                        key={guest.id}
                        guest={guest}
                        isSelected={selectedGuest?.id === guest.id}
                        onClick={() => setSelectedGuest(guest)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          {selectedGuest && (
            <div className="hidden lg:block w-1/2">
              <GuestDetailPanel
                guest={selectedGuest}
                bookings={selectedGuestBookings || []}
                notes={selectedGuestNotes || []}
                newNote={newNote}
                onNewNoteChange={setNewNote}
                onAddNote={handleAddNote}
                onClose={() => setSelectedGuest(null)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sublabel: string;
  iconColor: string;
  bgColor: string;
}

function StatCard({ icon: Icon, label, value, sublabel, iconColor, bgColor }: StatCardProps) {
  return (
    <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
            <p className="text-xs text-gray-500">{sublabel}</p>
          </div>
          <div className={`${bgColor} p-3 rounded-xl`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface GuestRowProps {
  guest: Guest;
  isSelected: boolean;
  onClick: () => void;
}

function GuestRow({ guest, isSelected, onClick }: GuestRowProps) {
  const fullName = `${guest.first_name} ${guest.last_name}`;
  const initials = `${guest.first_name[0] || ''}${guest.last_name[0] || ''}`.toUpperCase();

  return (
    <div
      onClick={onClick}
      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
            {initials}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">{fullName}</h3>
            {guest.is_vip && (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
                <Star className="w-3 h-3 mr-1" />
                VIP
              </Badge>
            )}
            {guest.online_checkin && (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Online
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />
              {guest.email}
            </span>
            {guest.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                {guest.phone}
              </span>
            )}
            {guest.nationality && (
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                {guest.nationality}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex-shrink-0 text-right">
          <div className="text-sm font-medium text-gray-900">{guest.total_bookings} bookings</div>
        </div>

        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
      </div>
    </div>
  );
}

interface GuestDetailPanelProps {
  guest: Guest;
  bookings: GuestBooking[];
  notes: GuestNote[];
  newNote: string;
  onNewNoteChange: (value: string) => void;
  onAddNote: () => void;
  onClose: () => void;
}

function GuestDetailPanel({ guest, bookings, notes, newNote, onNewNoteChange, onAddNote, onClose }: GuestDetailPanelProps) {
  const fullName = `${guest.first_name} ${guest.last_name}`;
  const initials = `${guest.first_name[0] || ''}${guest.last_name[0] || ''}`.toUpperCase();

  return (
    <Card className="border-gray-200 shadow-lg sticky top-6 max-h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-gray-900">{fullName}</h2>
                {guest.is_vip && (
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    <Star className="w-3 h-3 mr-1" />
                    VIP
                  </Badge>
                )}
              </div>
              <p className="text-gray-600">{guest.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>

      {/* Tabs */}
      <CardContent className="p-0 flex-1 overflow-hidden">
        <Tabs defaultValue="profile" className="h-full flex flex-col">
          <TabsList className="w-full justify-start border-b border-gray-200 rounded-none bg-gray-50 flex-shrink-0 px-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="bookings">Bookings ({bookings.length})</TabsTrigger>
            <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Profile Tab */}
            <TabsContent value="profile" className="mt-0 space-y-6">
              {/* Contact Information */}
              <Section title="Contact Information" icon={Mail}>
                <InfoRow icon={Mail} label="Email" value={guest.email} />
                <InfoRow icon={Phone} label="Phone" value={guest.phone || 'Not provided'} />
                <InfoRow icon={Calendar} label="Date of Birth" value={guest.date_of_birth ? formatDate(guest.date_of_birth) : 'Not provided'} />
                <InfoRow icon={Globe} label="Nationality" value={guest.nationality || 'Not provided'} />
              </Section>

              {/* Address */}
              {(guest.address || guest.city || guest.country) && (
                <Section title="Address" icon={MapPin}>
                  <InfoRow label="Street" value={guest.address || 'Not provided'} />
                  <InfoRow label="City" value={guest.city || 'Not provided'} />
                  <InfoRow label="Country" value={guest.country || 'Not provided'} />
                  <InfoRow label="Postal Code" value={guest.postal_code || 'Not provided'} />
                </Section>
              )}

              {/* Identification */}
              {(guest.document_number || guest.passport_number) && (
                <Section title="Identification" icon={CreditCard}>
                  <InfoRow icon={FileText} label="Document Type" value={guest.document_type || 'Passport'} />
                  <InfoRow label="Document Number" value={guest.document_number || guest.passport_number || 'Not provided'} />
                  {guest.document_issue_date && (
                    <InfoRow icon={Calendar} label="Issue Date" value={formatDate(guest.document_issue_date)} />
                  )}
                  {guest.document_expire_date && (
                    <InfoRow icon={Calendar} label="Expire Date" value={formatDate(guest.document_expire_date)} />
                  )}
                </Section>
              )}

              {/* Billing Details */}
              {guest.has_billing_details && (
                <Section title="Billing Details" icon={Building2}>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-3">
                    <div className="flex items-center gap-2 text-sm text-blue-800">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="font-medium">Billing information provided</span>
                    </div>
                  </div>
                  {guest.billing_company_name && (
                    <InfoRow icon={Building2} label="Company Name" value={guest.billing_company_name} />
                  )}
                  {guest.billing_vat_number && (
                    <InfoRow icon={FileText} label="VAT Number" value={guest.billing_vat_number} />
                  )}
                </Section>
              )}

              {/* Emergency Contact */}
              {(guest.emergency_contact_name || guest.emergency_contact_phone) && (
                <Section title="Emergency Contact" icon={AlertCircle}>
                  <InfoRow icon={User} label="Name" value={guest.emergency_contact_name || 'Not provided'} />
                  <InfoRow icon={Phone} label="Phone" value={guest.emergency_contact_phone || 'Not provided'} />
                </Section>
              )}

              {/* Preferences */}
              {guest.preferences && (
                <Section title="Preferences" icon={MessageSquare}>
                  <p className="text-sm text-gray-700">{guest.preferences}</p>
                </Section>
              )}

              {/* Stats */}
              <Section title="Guest Statistics" icon={TrendingUp}>
                <div className="grid grid-cols-2 gap-4">
                  {guest.online_bookings !== undefined && (
                    <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                      <p className="text-sm text-gray-600 mb-1">Online Check-ins</p>
                      <p className="text-2xl font-bold text-emerald-600">{guest.online_bookings}</p>
                    </div>
                  )}
                  {guest.total_guests_count !== undefined && (
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                      <p className="text-sm text-gray-600 mb-1">Total Companions</p>
                      <p className="text-2xl font-bold text-orange-600">{guest.total_guests_count}</p>
                    </div>
                  )}
                </div>
              </Section>
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="mt-0 space-y-4">
              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No bookings found for this guest</p>
                </div>
              ) : (
                bookings.map((booking) => (
                  <Card key={booking.id} className="border-gray-200 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">{booking.booking_id}</h4>
                          <Badge className={getStatusBadgeClass(booking.status)}>{booking.status}</Badge>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/pms/bookings/${booking.id}`} target="_blank">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Check-in</p>
                          <p className="font-medium text-gray-900">{formatDate(booking.check_in_date)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Check-out</p>
                          <p className="font-medium text-gray-900">{formatDate(booking.check_out_date)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Nights</p>
                          <p className="font-medium text-gray-900">{booking.nights}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Guests</p>
                          <p className="font-medium text-gray-900">{booking.number_of_guests}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-0 space-y-4">
              {/* Add Note */}
              <Card className="border-gray-200 shadow-sm bg-blue-50">
                <CardContent className="p-4">
                  <Textarea
                    placeholder="Add a note about this guest..."
                    value={newNote}
                    onChange={(e) => onNewNoteChange(e.target.value)}
                    className="mb-3 border-gray-300 bg-white"
                    rows={3}
                  />
                  <Button onClick={onAddNote} disabled={!newNote.trim()} className="w-full">
                    Add Note
                  </Button>
                </CardContent>
              </Card>

              {/* Notes List */}
              {notes.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No notes yet for this guest</p>
                </div>
              ) : (
                notes.map((note) => (
                  <Card key={note.id} className="border-gray-200 shadow-sm">
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-700 mb-3">{note.note}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <User className="w-3 h-3" />
                        <span>{note.created_by_name}</span>
                        <span>•</span>
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(note.created_at)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface SectionProps {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}

function Section({ title, icon: Icon, children }: SectionProps) {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className="w-5 h-5 text-gray-600" />}
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

interface InfoRowProps {
  icon?: React.ElementType;
  label: string;
  value: string;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-600 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function getStatusBadgeClass(status: string) {
  const classes: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
    paid: 'bg-green-100 text-green-800 border-green-300',
    checked_in: 'bg-purple-100 text-purple-800 border-purple-300',
    checked_out: 'bg-gray-100 text-gray-800 border-gray-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  };
  return classes[status] || 'bg-gray-100 text-gray-800 border-gray-300';
}
