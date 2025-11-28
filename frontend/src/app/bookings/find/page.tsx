'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Mail, Hash, ArrowRight, Calendar, MapPin, Users, CreditCard,
  Clock, CheckCircle2, AlertCircle, Edit3, Phone, User, Save, X,
  Shield, Gift, Sparkles, ChevronRight, FileText, UserPlus, Loader2,
  Building, Globe, CalendarCheck, Info
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import SiteNav from '@/app/components/SiteNav';
import SiteFooter from '@/app/components/SiteFooter';

// Booking type
interface Booking {
  id: string;
  booking_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_country: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  number_of_guests: number;
  status: string;
  status_display: string;
  payment_status: string;
  payment_status_display: string;
  nightly_rate: number;
  cleaning_fee: number;
  tourist_tax: number;
  total_price: number;
  special_requests: string | null;
  created_at: string;
  has_checkin_data: boolean;
  guests_count: number;
  has_account: boolean;
}

// Status colors and icons
const statusConfig: Record<string, { color: string; bg: string; icon: typeof CheckCircle2 }> = {
  pending: { color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
  confirmed: { color: 'text-blue-600', bg: 'bg-blue-50', icon: CheckCircle2 },
  paid: { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CreditCard },
  checked_in: { color: 'text-purple-600', bg: 'bg-purple-50', icon: Building },
  checked_out: { color: 'text-gray-600', bg: 'bg-gray-50', icon: CheckCircle2 },
  cancelled: { color: 'text-red-600', bg: 'bg-red-50', icon: X },
  no_show: { color: 'text-gray-600', bg: 'bg-gray-100', icon: AlertCircle },
};

// Benefits for creating account
const accountBenefits = [
  { icon: Shield, text: 'Secure access to all your bookings' },
  { icon: Clock, text: 'Faster checkout for future stays' },
  { icon: Gift, text: 'Exclusive offers and discounts' },
  { icon: FileText, text: 'Easy access to invoices & receipts' },
];

export default function FindBookingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // Search state
  const [confirmation, setConfirmation] = useState('');
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Booking state
  const [booking, setBooking] = useState<Booking | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'modify' | 'checkin'>('details');

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    guest_name: '',
    guest_phone: '',
    special_requests: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Check-in state
  const [checkinStep, setCheckinStep] = useState(0);
  const [guestForms, setGuestForms] = useState<any[]>([]);
  const [submittingCheckin, setSubmittingCheckin] = useState(false);

  // Format date for display
  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Calculate days until check-in
  const daysUntilCheckin = useMemo(() => {
    if (!booking) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkin = new Date(booking.check_in_date);
    checkin.setHours(0, 0, 0, 0);
    const diff = Math.ceil((checkin.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [booking]);

  // Search for booking
  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setBooking(null);

    if (!confirmation.trim() || !email.trim()) {
      setSearchError('Please enter both confirmation number and email');
      return;
    }

    setSearching(true);

    try {
      const response = await api.bookings.lookup(confirmation.trim(), email.trim());
      setBooking(response.data.booking);
      setEditData({
        guest_name: response.data.booking.guest_name,
        guest_phone: response.data.booking.guest_phone,
        special_requests: response.data.booking.special_requests || '',
      });
      // Initialize guest forms based on number of guests
      const numGuests = response.data.booking.number_of_guests || 1;
      setGuestForms(Array(numGuests).fill(null).map(() => ({
        first_name: '',
        last_name: '',
        email: '',
        date_of_birth: '',
        country_of_birth: '',
        birth_province: '',
        birth_city: '',
        document_type: 'passport',
        document_number: '',
        document_issue_date: '',
        document_expire_date: '',
        document_issue_country: '',
        document_issue_province: '',
        document_issue_city: '',
      })));
    } catch (err: any) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Booking not found';
      setSearchError(message);
    } finally {
      setSearching(false);
    }
  }, [confirmation, email]);

  // Save booking updates
  const handleSaveChanges = useCallback(async () => {
    if (!booking) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      await api.bookings.lookupUpdate(confirmation, email, editData);
      setBooking(prev => prev ? { ...prev, ...editData } : null);
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSearchError(err.response?.data?.error || 'Failed to update booking');
    } finally {
      setSaving(false);
    }
  }, [booking, confirmation, email, editData]);

  // Submit check-in data
  const handleSubmitCheckin = useCallback(async () => {
    if (!booking) return;

    setSubmittingCheckin(true);

    try {
      // Set primary guest email
      const guestsWithEmail = guestForms.map((guest, i) => ({
        ...guest,
        email: i === 0 ? email : guest.email,
      }));

      await api.bookings.lookupCheckin(confirmation, email, guestsWithEmail);
      setBooking(prev => prev ? { ...prev, has_checkin_data: true, guests_count: guestForms.length } : null);
      setActiveTab('details');
      setCheckinStep(0);
    } catch (err: any) {
      setSearchError(err.response?.data?.error || 'Failed to submit check-in data');
    } finally {
      setSubmittingCheckin(false);
    }
  }, [booking, confirmation, email, guestForms]);

  // Update guest form data
  const updateGuestForm = useCallback((index: number, field: string, value: string) => {
    setGuestForms(prev => prev.map((guest, i) =>
      i === index ? { ...guest, [field]: value } : guest
    ));
  }, []);

  // Redirect if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      {/* Custom styles for navbar on this page */}
      <style>{`
        /* Make navbar background always gray */
        header {
          background-color: #F3F4F6 !important;
          background-image: none !important;
        }

        /* Enlarge logo */
        header img[alt="All'Arco Apartment"] {
          height: 2.5rem !important;
        }

        @media (min-width: 640px) {
          header img[alt="All'Arco Apartment"] {
            height: 3.5rem !important;
          }
        }

        @media (min-width: 1024px) {
          header img[alt="All'Arco Apartment"] {
            height: 4.5rem !important;
          }
        }

        /* Make text dark on gray background */
        header {
          color: #1F2937;
        }

        /* Style nav links for gray background */
        nav a, header button {
          color: #374151;
        }

        nav a:hover, header button:hover {
          color: #C4A572;
        }
      `}</style>

      <SiteNav />

      <main className="flex-1 pt-6 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C4A572]/10 rounded-full text-[#C4A572] text-sm font-medium mb-4">
              <Search className="w-4 h-4" />
              Guest Self-Service
            </div>
            <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-4">
              Find Your Booking
            </h1>
            <p className="text-gray-600 max-w-xl mx-auto">
              Enter your confirmation number and email to access your reservation details,
              make modifications, or complete online check-in.
            </p>
          </motion.div>

          {/* Search Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-2xl mx-auto mb-12"
          >
            <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-6 md:p-8 border border-gray-100">
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {/* Confirmation Number */}
                <div>
                  <label htmlFor="confirmation" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmation Number
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="confirmation"
                      type="text"
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value.toUpperCase())}
                      placeholder="ARK-20241128-0001"
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {searchError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Booking not found</p>
                      <p className="text-sm text-red-500 mt-1">{searchError}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Search Button */}
              <motion.button
                type="submit"
                disabled={searching}
                whileHover={{ scale: searching ? 1 : 1.02 }}
                whileTap={{ scale: searching ? 1 : 0.98 }}
                className="w-full bg-[#C4A572] text-white py-4 rounded-xl font-semibold hover:bg-[#B39562] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#C4A572]/20"
              >
                {searching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Find Booking
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>

          {/* Booking Details */}
          <AnimatePresence mode="wait">
            {booking && (
              <motion.div
                key="booking-details"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid lg:grid-cols-3 gap-8"
              >
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Booking Header Card */}
                  <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">
                    {/* Status Banner */}
                    <div className={`px-6 py-4 ${statusConfig[booking.status]?.bg || 'bg-gray-50'} flex items-center justify-between`}>
                      <div className="flex items-center gap-3">
                        {(() => {
                          const StatusIcon = statusConfig[booking.status]?.icon || Clock;
                          return <StatusIcon className={`w-5 h-5 ${statusConfig[booking.status]?.color || 'text-gray-600'}`} />;
                        })()}
                        <span className={`font-semibold ${statusConfig[booking.status]?.color || 'text-gray-600'}`}>
                          {booking.status_display}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {booking.payment_status_display}
                      </span>
                    </div>

                    {/* Booking Info */}
                    <div className="p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Confirmation Number</p>
                          <p className="text-2xl font-bold text-gray-900 font-mono">{booking.booking_id}</p>
                        </div>
                        {daysUntilCheckin !== null && daysUntilCheckin > 0 && (
                          <div className="bg-[#C4A572]/10 px-4 py-2 rounded-xl">
                            <p className="text-sm text-[#C4A572] font-medium">
                              {daysUntilCheckin === 1 ? 'Tomorrow!' : `${daysUntilCheckin} days to go`}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Date Cards */}
                      <div className="grid sm:grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                            <Calendar className="w-4 h-4" />
                            Check-in
                          </div>
                          <p className="font-semibold text-gray-900">{formatDate(booking.check_in_date)}</p>
                          <p className="text-sm text-gray-500">From 3:00 PM</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                            <Calendar className="w-4 h-4" />
                            Check-out
                          </div>
                          <p className="font-semibold text-gray-900">{formatDate(booking.check_out_date)}</p>
                          <p className="text-sm text-gray-500">Until 11:00 AM</p>
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          {booking.nights} {booking.nights === 1 ? 'night' : 'nights'}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Users className="w-4 h-4" />
                          {booking.number_of_guests} {booking.number_of_guests === 1 ? 'guest' : 'guests'}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          Venice, Italy
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">
                    {/* Tab Headers */}
                    <div className="flex border-b border-gray-100">
                      {[
                        { id: 'details', label: 'Details', icon: FileText },
                        { id: 'modify', label: 'Modify', icon: Edit3 },
                        { id: 'checkin', label: 'Online Check-in', icon: CalendarCheck },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all relative ${
                            activeTab === tab.id
                              ? 'text-[#C4A572]'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <tab.icon className="w-4 h-4" />
                          {tab.label}
                          {activeTab === tab.id && (
                            <motion.div
                              layoutId="activeTab"
                              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C4A572]"
                            />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                      <AnimatePresence mode="wait">
                        {activeTab === 'details' && (
                          <motion.div
                            key="details"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                          >
                            {/* Guest Info */}
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-4">Guest Information</h3>
                              <div className="grid sm:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                                    <User className="w-5 h-5 text-gray-500" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500">Name</p>
                                    <p className="font-medium text-gray-900">{booking.guest_name}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                                    <Mail className="w-5 h-5 text-gray-500" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500">Email</p>
                                    <p className="font-medium text-gray-900">{booking.guest_email}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                                    <Phone className="w-5 h-5 text-gray-500" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500">Phone</p>
                                    <p className="font-medium text-gray-900">{booking.guest_phone || 'Not provided'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                                    <Globe className="w-5 h-5 text-gray-500" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500">Country</p>
                                    <p className="font-medium text-gray-900">{booking.guest_country}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Special Requests */}
                            {booking.special_requests && (
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Special Requests</h3>
                                <p className="text-gray-600 bg-gray-50 rounded-xl p-4">
                                  {booking.special_requests}
                                </p>
                              </div>
                            )}

                            {/* Check-in Status */}
                            <div className={`rounded-xl p-4 flex items-center gap-3 ${
                              booking.has_checkin_data ? 'bg-emerald-50' : 'bg-amber-50'
                            }`}>
                              {booking.has_checkin_data ? (
                                <>
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                  <div>
                                    <p className="font-medium text-emerald-700">Online check-in complete</p>
                                    <p className="text-sm text-emerald-600">{booking.guests_count} guest(s) registered</p>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <Info className="w-5 h-5 text-amber-600" />
                                  <div>
                                    <p className="font-medium text-amber-700">Online check-in pending</p>
                                    <p className="text-sm text-amber-600">Complete check-in to speed up your arrival</p>
                                  </div>
                                </>
                              )}
                            </div>
                          </motion.div>
                        )}

                        {activeTab === 'modify' && (
                          <motion.div
                            key="modify"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                          >
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-semibold text-gray-900">Modify Booking Details</h3>
                              {!isEditing && (
                                <button
                                  onClick={() => setIsEditing(true)}
                                  className="flex items-center gap-2 text-[#C4A572] hover:text-[#B39562] font-medium"
                                >
                                  <Edit3 className="w-4 h-4" />
                                  Edit
                                </button>
                              )}
                            </div>

                            {/* Success Message */}
                            <AnimatePresence>
                              {saveSuccess && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0 }}
                                  className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2"
                                >
                                  <CheckCircle2 className="w-5 h-5" />
                                  Changes saved successfully!
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <div className="space-y-4">
                              {/* Guest Name */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Guest Name</label>
                                <div className="relative">
                                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                  <input
                                    type="text"
                                    value={editData.guest_name}
                                    onChange={(e) => setEditData(prev => ({ ...prev, guest_name: e.target.value }))}
                                    disabled={!isEditing}
                                    className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-all ${
                                      isEditing
                                        ? 'bg-white border-gray-200 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent'
                                        : 'bg-gray-50 border-gray-100 text-gray-700'
                                    }`}
                                  />
                                </div>
                              </div>

                              {/* Phone */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                                <div className="relative">
                                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                  <input
                                    type="tel"
                                    value={editData.guest_phone}
                                    onChange={(e) => setEditData(prev => ({ ...prev, guest_phone: e.target.value }))}
                                    disabled={!isEditing}
                                    placeholder="+39 123 456 7890"
                                    className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-all ${
                                      isEditing
                                        ? 'bg-white border-gray-200 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent'
                                        : 'bg-gray-50 border-gray-100 text-gray-700'
                                    }`}
                                  />
                                </div>
                              </div>

                              {/* Special Requests */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Special Requests</label>
                                <textarea
                                  value={editData.special_requests}
                                  onChange={(e) => setEditData(prev => ({ ...prev, special_requests: e.target.value }))}
                                  disabled={!isEditing}
                                  rows={3}
                                  placeholder="Any special requests or preferences..."
                                  className={`w-full px-4 py-3 rounded-xl border transition-all ${
                                    isEditing
                                      ? 'bg-white border-gray-200 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent'
                                      : 'bg-gray-50 border-gray-100 text-gray-700'
                                  }`}
                                />
                              </div>

                              {/* Action Buttons */}
                              {isEditing && (
                                <div className="flex gap-3 pt-2">
                                  <button
                                    onClick={() => {
                                      setIsEditing(false);
                                      setEditData({
                                        guest_name: booking.guest_name,
                                        guest_phone: booking.guest_phone,
                                        special_requests: booking.special_requests || '',
                                      });
                                    }}
                                    className="flex-1 py-3 px-4 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={handleSaveChanges}
                                    disabled={saving}
                                    className="flex-1 py-3 px-4 bg-[#C4A572] text-white rounded-xl font-medium hover:bg-[#B39562] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                  >
                                    {saving ? (
                                      <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                      <>
                                        <Save className="w-5 h-5" />
                                        Save Changes
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                              <p className="font-medium text-gray-700 mb-1">Need to change dates or cancel?</p>
                              <p>Please contact us directly for date changes or cancellations at <a href="mailto:info@allarcoapartment.com" className="text-[#C4A572] hover:underline">info@allarcoapartment.com</a></p>
                            </div>
                          </motion.div>
                        )}

                        {activeTab === 'checkin' && (
                          <motion.div
                            key="checkin"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                          >
                            {booking.has_checkin_data ? (
                              <div className="text-center py-8">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">Check-in Complete!</h3>
                                <p className="text-gray-600 mb-4">
                                  You&apos;ve already submitted your check-in information for {booking.guests_count} guest(s).
                                </p>
                                <p className="text-sm text-gray-500">
                                  Need to make changes? Contact us at <a href="mailto:info@allarcoapartment.com" className="text-[#C4A572] hover:underline">info@allarcoapartment.com</a>
                                </p>
                              </div>
                            ) : (
                              <>
                                <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
                                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="font-medium text-blue-700">Italian Law Requirement</p>
                                    <p className="text-sm text-blue-600 mt-1">
                                      All guests must provide identification details for the Italian Police (Alloggiati Web).
                                      Complete this form before arrival to speed up check-in.
                                    </p>
                                  </div>
                                </div>

                                {/* Guest Forms */}
                                <div className="space-y-6">
                                  {guestForms.map((guest, index) => (
                                    <div key={index} className="border border-gray-200 rounded-xl p-4">
                                      <h4 className="font-semibold text-gray-900 mb-4">
                                        {index === 0 ? 'Primary Guest' : `Guest ${index + 1}`}
                                      </h4>
                                      <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                                          <input
                                            type="text"
                                            value={guest.first_name}
                                            onChange={(e) => updateGuestForm(index, 'first_name', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent"
                                            required
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                                          <input
                                            type="text"
                                            value={guest.last_name}
                                            onChange={(e) => updateGuestForm(index, 'last_name', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent"
                                            required
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                                          <input
                                            type="date"
                                            value={guest.date_of_birth}
                                            onChange={(e) => updateGuestForm(index, 'date_of_birth', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent"
                                            required
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Country of Birth *</label>
                                          <input
                                            type="text"
                                            value={guest.country_of_birth}
                                            onChange={(e) => updateGuestForm(index, 'country_of_birth', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent"
                                            required
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
                                          <select
                                            value={guest.document_type}
                                            onChange={(e) => updateGuestForm(index, 'document_type', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent"
                                          >
                                            <option value="passport">Passport</option>
                                            <option value="id_card">ID Card</option>
                                            <option value="driving_license">Driving License</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Document Number *</label>
                                          <input
                                            type="text"
                                            value={guest.document_number}
                                            onChange={(e) => updateGuestForm(index, 'document_number', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent"
                                            required
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date *</label>
                                          <input
                                            type="date"
                                            value={guest.document_issue_date}
                                            onChange={(e) => updateGuestForm(index, 'document_issue_date', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent"
                                            required
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date *</label>
                                          <input
                                            type="date"
                                            value={guest.document_expire_date}
                                            onChange={(e) => updateGuestForm(index, 'document_expire_date', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent"
                                            required
                                          />
                                        </div>
                                        <div className="sm:col-span-2">
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Issue Country *</label>
                                          <input
                                            type="text"
                                            value={guest.document_issue_country}
                                            onChange={(e) => updateGuestForm(index, 'document_issue_country', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent"
                                            required
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <button
                                  onClick={handleSubmitCheckin}
                                  disabled={submittingCheckin}
                                  className="w-full bg-[#C4A572] text-white py-4 rounded-xl font-semibold hover:bg-[#B39562] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                  {submittingCheckin ? (
                                    <>
                                      <Loader2 className="w-5 h-5 animate-spin" />
                                      Submitting...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-5 h-5" />
                                      Complete Online Check-in
                                    </>
                                  )}
                                </button>
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Price Summary */}
                  <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">${booking.nightly_rate} x {booking.nights} nights</span>
                        <span className="font-medium">${(booking.nightly_rate * booking.nights).toFixed(2)}</span>
                      </div>
                      {booking.cleaning_fee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cleaning fee</span>
                          <span className="font-medium">${booking.cleaning_fee.toFixed(2)}</span>
                        </div>
                      )}
                      {booking.tourist_tax > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tourist tax</span>
                          <span className="font-medium">${booking.tourist_tax.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t border-gray-100 pt-3 mt-3">
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-900">Total</span>
                          <span className="font-bold text-xl text-gray-900">${booking.total_price.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Create Account CTA */}
                  {!booking.has_account && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="bg-gradient-to-br from-[#C4A572]/10 to-[#C4A572]/5 rounded-2xl p-6 border border-[#C4A572]/20"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-[#C4A572] rounded-xl flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Save This Booking</h3>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">
                        Create an account to save this booking and enjoy exclusive benefits for future stays.
                      </p>
                      <ul className="space-y-2 mb-5">
                        {accountBenefits.map((benefit, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                            <benefit.icon className="w-4 h-4 text-[#C4A572]" />
                            {benefit.text}
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={`/auth/register?email=${encodeURIComponent(booking.guest_email)}`}
                        className="w-full bg-[#C4A572] text-white py-3 rounded-xl font-semibold hover:bg-[#B39562] transition-all flex items-center justify-center gap-2"
                      >
                        <UserPlus className="w-5 h-5" />
                        Create Account
                      </Link>
                    </motion.div>
                  )}

                  {/* Need Help */}
                  <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Our team is here to assist you with any questions about your stay.
                    </p>
                    <a
                      href="mailto:info@allarcoapartment.com"
                      className="w-full py-3 px-4 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Mail className="w-5 h-5" />
                      Contact Us
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info Cards (shown when no booking found) */}
          {!booking && !searching && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto"
            >
              {[
                {
                  icon: Search,
                  title: 'Find Your Booking',
                  description: 'Enter your confirmation number and email to access your reservation.',
                },
                {
                  icon: Edit3,
                  title: 'Make Changes',
                  description: 'Update guest details, phone number, or special requests.',
                },
                {
                  icon: CalendarCheck,
                  title: 'Online Check-in',
                  description: 'Submit ID information before arrival for faster check-in.',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-6 border border-gray-100 shadow-lg shadow-gray-100/50"
                >
                  <div className="w-12 h-12 bg-[#C4A572]/10 rounded-xl flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-[#C4A572]" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
