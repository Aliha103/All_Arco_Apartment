'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Search,
  Filter,
  Euro,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Clock,
  MapPin,
  Users,
  Edit,
  AlertCircle,
  Plus,
  Mail,
  CreditCard
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import SiteNav from '@/app/components/SiteNav';
import SiteFooter from '@/app/components/SiteFooter';
import { useRouter, useParams } from 'next/navigation';
import { generateUserId, verifyUserId } from '@/lib/userId';
import type { Booking } from '@/types';

const smoothEase = [0.16, 1, 0.3, 1] as const;

type BookingStatus = 'all' | 'pending' | 'confirmed' | 'paid' | 'checked_in' | 'checked_out' | 'cancelled';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: Check },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800', icon: Check },
  checked_in: { label: 'Checked In', color: 'bg-purple-100 text-purple-800', icon: MapPin },
  checked_out: { label: 'Checked Out', color: 'bg-gray-100 text-gray-800', icon: Check },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: X },
};

export default function BookingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useParams();

  const [selectedStatus, setSelectedStatus] = useState<BookingStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [claimConfirmation, setClaimConfirmation] = useState('');
  const [claimEmail, setClaimEmail] = useState('');
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [claimError, setClaimError] = useState('');

  // Security: Verify userId
  const urlUserId = params.userId as string;
  const isAuthorized = useMemo(() => verifyUserId(urlUserId, user), [urlUserId, user]);

  // Fetch user's bookings
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['userBookings', user?.id],
    queryFn: async () => {
      const response = await api.bookings.list({ user_only: true });
      return response.data;
    },
    enabled: !!user && isAuthorized,
  });

  const bookings: Booking[] = bookingsData?.results || bookingsData || [];

  // Filter bookings
  const filteredBookings = useMemo(() => {
    let filtered = bookings;

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(b => b.status === selectedStatus);
    }

    // Filter by search query (booking ID, guest name, email)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.booking_id.toLowerCase().includes(query) ||
        b.guest_name.toLowerCase().includes(query) ||
        b.guest_email.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [bookings, selectedStatus, searchQuery]);

  // Calculate total spent (confirmed + checked_in + checked_out + cancelled with payment)
  const totalSpent = useMemo(() => {
    const spentStatuses = ['confirmed', 'paid', 'checked_in', 'checked_out'];
    return bookings
      .filter(b => spentStatuses.includes(b.status) || (b.status === 'cancelled' && b.payment_status === 'paid'))
      .reduce((sum, b) => sum + parseFloat(b.total_price || '0'), 0);
  }, [bookings]);

  // Claim booking mutation
  const claimBookingMutation = useMutation({
    mutationFn: async () => {
      const response = await api.bookings.claimBooking(claimConfirmation.trim(), claimEmail.trim());
      return response.data;
    },
    onSuccess: (data) => {
      // Booking successfully linked to user account
      queryClient.invalidateQueries({ queryKey: ['userBookings'] });
      setShowClaimDialog(false);
      setClaimConfirmation('');
      setClaimEmail('');
      setClaimError('');
    },
    onError: (error: any) => {
      setClaimError(error.response?.data?.error || 'Booking not found. Please check your confirmation ID and email.');
    },
  });

  const handleClaimBooking = () => {
    if (!claimConfirmation || !claimEmail) {
      setClaimError('Please enter both confirmation ID and email address.');
      return;
    }
    setClaimError('');
    claimBookingMutation.mutate();
  };

  // Auth & authorization guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!authLoading && user && !isAuthorized) {
      const correctUserId = generateUserId(user);
      router.replace(`/u/${correctUserId}/bookings`);
    }
  }, [authLoading, user, isAuthorized, router]);

  if (authLoading || !user || !isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <SiteNav />
        <main className="flex-1 flex items-center justify-center pt-24">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#C4A572]/30 border-t-[#C4A572]" />
            <p className="text-sm text-gray-600">Loading your bookings...</p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SiteNav />

      <main className="flex-1 pt-20 sm:pt-24 pb-8 sm:pb-12 px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => router.back()}
            className="md:hidden flex items-center gap-2 text-gray-600 hover:text-[#C4A572] mb-4 py-2 px-3 -ml-3 rounded-lg hover:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </motion.button>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-8"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">My Bookings</h1>
            <p className="text-sm sm:text-base text-gray-600">View and manage your reservations</p>
          </motion.div>

          {/* Stats Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-[#C4A572] to-[#B39562] rounded-2xl p-6 mb-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90 mb-1">Total Spent</p>
                <p className="text-3xl font-bold">€{totalSpent.toFixed(2)}</p>
                <p className="text-xs opacity-75 mt-1">{bookings.length} total bookings</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Euro className="w-8 h-8" />
              </div>
            </div>
          </motion.div>

          {/* Search & Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6"
          >
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by confirmation ID, name, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none"
                  />
                </div>
              </div>

              {/* Claim Booking Button */}
              <button
                onClick={() => setShowClaimDialog(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-[#C4A572] text-white rounded-xl hover:bg-[#B39562] transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>Add Booking</span>
              </button>
            </div>

            {/* Status Filters */}
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              {(['all', 'confirmed', 'paid', 'checked_in', 'checked_out', 'cancelled'] as BookingStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedStatus === status
                      ? 'bg-[#C4A572] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'All' : statusConfig[status as keyof typeof statusConfig]?.label || status}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Bookings List */}
          {bookingsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#C4A572]/30 border-t-[#C4A572]" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center"
            >
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || selectedStatus !== 'all'
                  ? 'Try adjusting your filters'
                  : 'You haven\'t made any bookings yet'}
              </p>
              {!searchQuery && selectedStatus === 'all' && (
                <button
                  onClick={() => setShowClaimDialog(true)}
                  className="px-6 py-3 bg-[#C4A572] text-white rounded-xl hover:bg-[#B39562] transition-colors font-medium"
                >
                  Add Existing Booking
                </button>
              )}
            </motion.div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking, index) => {
                const StatusIcon = statusConfig[booking.status as keyof typeof statusConfig]?.icon || Clock;
                const statusStyle = statusConfig[booking.status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-800';

                return (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      {/* Left: Booking Info */}
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-12 h-12 bg-[#C4A572]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-6 h-6 text-[#C4A572]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {booking.booking_id}
                              </h3>
                              {booking.booked_for_someone_else && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                                  <Users className="w-3 h-3" />
                                  For {booking.guest_name.split(' ')[0]}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                All'Arco Apartment
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {booking.adults || 2} {(booking.adults || 2) === 1 ? 'adult' : 'adults'}
                                {(booking.children || 0) > 0 && `, ${booking.children} ${booking.children === 1 ? 'child' : 'children'}`}
                                {(booking.infants || 0) > 0 && `, ${booking.infants} ${booking.infants === 1 ? 'infant' : 'infants'}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">Check-in</p>
                            <p className="font-medium text-gray-900">
                              {new Date(booking.check_in_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Check-out</p>
                            <p className="font-medium text-gray-900">
                              {new Date(booking.check_out_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right: Status & Actions */}
                      <div className="flex flex-col items-end gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusStyle}`}>
                          <StatusIcon className="w-4 h-4" />
                          {statusConfig[booking.status as keyof typeof statusConfig]?.label || booking.status}
                        </span>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">€{booking.total_price}</p>
                          <p className="text-xs text-gray-600">{booking.nights} {booking.nights === 1 ? 'night' : 'nights'}</p>
                          {booking.payment_status === 'paid' && booking.amount_due && parseFloat(booking.amount_due) > 0 ? (
                            <div className="mt-2 text-xs space-y-1">
                              <div className="flex items-center gap-1 text-green-600 justify-end">
                                <Check className="w-3 h-3" />
                                <span>€{(parseFloat(booking.total_price) - parseFloat(booking.amount_due)).toFixed(2)} paid online</span>
                              </div>
                              <div className="flex items-center gap-1 text-amber-600 justify-end">
                                <Clock className="w-3 h-3" />
                                <span>€{parseFloat(booking.amount_due).toFixed(2)} at property</span>
                              </div>
                              {(booking as any).payment_method === 'Stripe' && (
                                <div className="flex items-center gap-1 text-blue-600 justify-end mt-1">
                                  <CreditCard className="w-3 h-3" />
                                  <span className="font-medium">Paid by Stripe</span>
                                  {(booking as any).payment_timestamp && (
                                    <span className="text-gray-500 ml-1">
                                      • {new Date((booking as any).payment_timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : booking.payment_status === 'paid' ? (
                            <div className="mt-1 text-xs space-y-1">
                              <p className="text-green-600 flex items-center gap-1 justify-end">
                                <Check className="w-3 h-3" />
                                Paid in full
                              </p>
                              {(booking as any).payment_method === 'Stripe' && (
                                <p className="text-blue-600 flex items-center gap-1 justify-end">
                                  <CreditCard className="w-3 h-3" />
                                  <span className="font-medium">Paid by Stripe</span>
                                  {(booking as any).payment_timestamp && (
                                    <span className="text-gray-500 ml-1">
                                      • {new Date((booking as any).payment_timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                          ) : null}
                        </div>
                        <button
                          onClick={() => router.push(`/booking/${booking.booking_id}`)}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                          View Details
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Claim Booking Dialog */}
      <AnimatePresence>
        {showClaimDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowClaimDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Existing Booking</h2>
              <p className="text-gray-600 mb-6">
                Enter your booking confirmation ID and email to link it to your account
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmation ID
                  </label>
                  <input
                    type="text"
                    placeholder="ARCO-XXXXXX"
                    value={claimConfirmation}
                    onChange={(e) => setClaimConfirmation(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={claimEmail}
                    onChange={(e) => setClaimEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none"
                  />
                </div>

                {claimError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{claimError}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowClaimDialog(false);
                      setClaimConfirmation('');
                      setClaimEmail('');
                      setClaimError('');
                    }}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClaimBooking}
                    disabled={claimBookingMutation.isPending}
                    className="flex-1 px-4 py-3 bg-[#C4A572] text-white rounded-xl hover:bg-[#B39562] transition-colors font-medium disabled:opacity-50"
                  >
                    {claimBookingMutation.isPending ? 'Checking...' : 'Add Booking'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SiteFooter />
    </div>
  );
}
