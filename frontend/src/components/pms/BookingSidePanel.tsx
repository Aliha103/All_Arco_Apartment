'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Loader2,
  Mail,
  Copy,
  Check,
  Download,
  Eye,
  Edit as EditIcon,
  Save,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  Users,
  Ban,
  Link as LinkIcon,
  UserPlus,
  Send,
  CreditCard,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { logResourceAction } from '@/lib/auditLogger';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface BookingSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'view' | 'edit' | 'create';
  bookingId?: string;
  onSuccess?: () => void;
}

interface BookingData {
  id?: string;
  booking_id?: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_address?: string;
  guest_country?: string;
  guest_date_of_birth?: string;
  check_in_date: string;
  check_out_date: string;
  number_of_guests: number;
  adults?: number;
  children?: number;
  infants?: number;
  booking_source: string;
  special_requests?: string;
  internal_notes?: string;
  status: string;
  payment_status: string;
  payment_method?: string;
  nightly_rate?: number;
  cleaning_fee?: number;
  tourist_tax?: number;
  total_price?: number;
  amount_paid?: number;
  manual_pricing_override?: boolean;
  custom_nightly_rate?: number;
  custom_cleaning_fee?: number;
  custom_tourist_tax?: number;
  custom_total_price?: number;
  created_at?: string;
  updated_at?: string;
  nights?: number;
}

// Status configurations
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
  no_show: {
    label: 'No Show',
    color: 'bg-slate-100 text-slate-800 border-slate-200',
    icon: XCircle,
  },
};

const PAYMENT_STATUS_CONFIG = {
  unpaid: { label: 'Unpaid', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  partial: { label: 'Partial', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  paid: { label: 'Paid', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  refunded: { label: 'Refunded', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  partially_refunded: { label: 'Partial Refund', color: 'bg-gray-50 text-gray-700 border-gray-200' },
};

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'other', label: 'Other' },
];

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia',
  'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
  'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'East Timor', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Ethiopia',
  'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Jamaica', 'Japan', 'Jordan',
  'Kazakhstan', 'Kenya', 'Kiribati', 'North Korea', 'South Korea', 'Kosovo', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Macedonia', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'Norway',
  'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar',
  'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Swaziland', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan',
  'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
  'Yemen',
  'Zambia', 'Zimbabwe'
];

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

// ============================================================================
// Main Component
// ============================================================================

export default function BookingSidePanel({
  isOpen,
  onClose,
  mode: initialMode,
  bookingId,
  onSuccess,
}: BookingSidePanelProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const auditUser = user && (user as any).role_info ? user : null;

  // State
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>(initialMode);
  const [formData, setFormData] = useState<BookingData>({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    guest_address: '',
    guest_country: '',
    guest_date_of_birth: '',
    check_in_date: '',
    check_out_date: '',
    number_of_guests: 2,
    adults: 2,
    children: 0,
    infants: 0,
    booking_source: 'website',
    special_requests: '',
    internal_notes: '',
    status: 'pending',
    payment_status: 'unpaid',
    payment_method: '',
    manual_pricing_override: false,
  });
  const [initialData, setInitialData] = useState<BookingData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [onlineCheckInModalOpen, setOnlineCheckInModalOpen] = useState(false);
  const [guestRegistrationModalOpen, setGuestRegistrationModalOpen] = useState(false);
  const [manualPricingEnabled, setManualPricingEnabled] = useState(false);
  const [checkInLinkCopied, setCheckInLinkCopied] = useState(false);
  const [sendingCheckInEmail, setSendingCheckInEmail] = useState(false);
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
  const [guestFormData, setGuestFormData] = useState({
    is_primary: false,
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
  });
  const [guestFormErrors, setGuestFormErrors] = useState<Record<string, string>>({});

  // Multi-step wizard state
  const [registrationStep, setRegistrationStep] = useState(1);
  const [billingData, setBillingData] = useState({
    invoice_name: '',
    company_name: '',
    vat_number: '',
    fiscal_code: '',
    billing_address: '',
    billing_city: '',
    billing_postal_code: '',
    billing_country: '',
    billing_email: '',
    billing_phone: '',
  });
  const [billingErrors, setBillingErrors] = useState<Record<string, string>>({});

  // Fetch booking details (for view/edit mode)
  const { data: bookingData, isLoading: loadingBooking, error: bookingError } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const response = await api.bookings.get(bookingId!);
      return response.data;
    },
    enabled: !!bookingId && isOpen,
  });

  // Fetch payments (for view/edit mode)
  const { data: paymentsData } = useQuery({
    queryKey: ['payments', bookingId],
    queryFn: async () => {
      const response = await api.payments.list({ booking: bookingId });
      return response.data?.results || response.data || [];
    },
    enabled: !!bookingId && isOpen,
  });

  // Fetch booking guests (for guest registration)
  const { data: bookingGuestsData, refetch: refetchGuests } = useQuery({
    queryKey: ['booking-guests', bookingId],
    queryFn: async () => {
      const response = await api.bookings.guests.list(bookingId!);
      return response.data;
    },
    enabled: !!bookingId && isOpen,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Calculate price (for create/edit mode when dates change)
  const { data: priceCalculation } = useQuery({
    queryKey: ['price-calculation', formData.check_in_date, formData.check_out_date, formData.number_of_guests],
    queryFn: async () => {
      const response = await api.pricing.calculatePrice(
        formData.check_in_date,
        formData.check_out_date,
        formData.number_of_guests
      );
      return response.data;
    },
    enabled: !!formData.check_in_date && !!formData.check_out_date && (mode === 'create' || mode === 'edit'),
  });

  // Check availability (for create mode)
  const { data: availability } = useQuery({
    queryKey: ['availability-check', formData.check_in_date, formData.check_out_date],
    queryFn: async () => {
      const response = await api.bookings.checkAvailability(
        formData.check_in_date,
        formData.check_out_date
      );
      return response.data;
    },
    enabled: !!formData.check_in_date && !!formData.check_out_date && mode === 'create',
  });

  // Create booking mutation
  const createBooking = useMutation({
    mutationFn: (data: any) => api.bookings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success('Booking created successfully');
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      if (errorData && typeof errorData === 'object') {
        setFormErrors(errorData);
      }
      toast.error(errorData?.message || 'Failed to create booking');
    },
  });

  // Update booking mutation
  const updateBooking = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.bookings.update(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success('Booking updated successfully');
      setMode('view');
      setHasChanges(false);
      // Update local state with fresh data
      if (response.data) {
        setFormData(response.data);
        setInitialData(response.data);
      }
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      if (errorData && typeof errorData === 'object') {
        setFormErrors(errorData);
      }
      toast.error(errorData?.message || 'Failed to update booking');
    },
  });

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.bookings.update(id, { status }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      toast.success(`Booking status updated`);
      if (response.data) {
        setFormData((prev) => ({ ...prev, status: response.data.status }));
      }
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  // Create booking guest mutation
  const createBookingGuest = useMutation({
    mutationFn: (data: any) => api.bookings.guests.create(bookingId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-guests', bookingId] });
      resetGuestForm();
      toast.success('Guest registered successfully');
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      if (errorData && typeof errorData === 'object') {
        setGuestFormErrors(errorData);
      }
      toast.error(errorData?.message || 'Failed to register guest');
    },
  });

  // Update booking guest mutation
  const updateBookingGuest = useMutation({
    mutationFn: ({ guestId, data }: { guestId: string; data: any }) =>
      api.bookings.guests.update(bookingId!, guestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-guests', bookingId] });
      resetGuestForm();
      setEditingGuestId(null);
      toast.success('Guest updated successfully');
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      if (errorData && typeof errorData === 'object') {
        setGuestFormErrors(errorData);
      }
      toast.error(errorData?.message || 'Failed to update guest');
    },
  });

  // Delete booking guest mutation
  const deleteBookingGuest = useMutation({
    mutationFn: (guestId: string) => api.bookings.guests.delete(bookingId!, guestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-guests', bookingId] });
      toast.success('Guest removed successfully');
    },
    onError: () => {
      toast.error('Failed to remove guest');
    },
  });

  // Calculate amounts
  const paidAmount = useMemo(() => {
    return payments.reduce((sum, payment) => {
      const status = (payment.status || '').toLowerCase();
      if (['succeeded', 'partially_refunded'].includes(status)) {
        return sum + Number(payment.amount || 0);
      }
      return sum;
    }, 0);
  }, [payments]);

  const balanceDue = useMemo(() => {
    if (!formData.total_price) return 0;
    return Math.max(0, Number(formData.total_price) - paidAmount);
  }, [formData.total_price, paidAmount]);

  // Calculate nights
  const nights = useMemo(() => {
    if (!formData.check_in_date || !formData.check_out_date) return 0;
    const checkIn = new Date(formData.check_in_date);
    const checkOut = new Date(formData.check_out_date);
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  }, [formData.check_in_date, formData.check_out_date]);

  // Initialize data when booking is fetched
  useEffect(() => {
    if (bookingData && (mode === 'view' || mode === 'edit')) {
      setFormData(bookingData);
      setInitialData(bookingData);
    }
  }, [bookingData, mode]);

  // Update payments when fetched
  useEffect(() => {
    if (paymentsData) {
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
    }
  }, [paymentsData]);

  // Reset mode when initialMode changes or when panel opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setHasChanges(false);
      setFormErrors({});
    }
  }, [initialMode, isOpen]);

  // Track changes
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      const changed = JSON.stringify(formData) !== JSON.stringify(initialData);
      setHasChanges(changed);
    }
  }, [formData, initialData, mode]);

  // Pre-fill guest form with primary guest data from booking when modal opens
  useEffect(() => {
    if (guestRegistrationModalOpen && formData && !editingGuestId) {
      // Only pre-fill if there are no guests registered yet
      if (!bookingGuestsData || bookingGuestsData.length === 0) {
        const names = formData.guest_name?.split(' ') || [];
        const firstName = names[0] || '';
        const lastName = names.slice(1).join(' ') || '';

        setGuestFormData({
          is_primary: true,
          first_name: firstName,
          last_name: lastName,
          email: formData.guest_email || '',
          date_of_birth: formData.guest_date_of_birth || '',
          country_of_birth: formData.guest_country || '',
          birth_province: '',
          birth_city: '',
          document_type: 'passport',
          document_number: '',
          document_issue_date: '',
          document_expire_date: '',
          document_issue_country: '',
          document_issue_province: '',
          document_issue_city: '',
        });
      }
    }
  }, [guestRegistrationModalOpen, formData, bookingGuestsData, editingGuestId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
      // Ctrl/Cmd + E to enter edit mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'e' && mode === 'view') {
        e.preventDefault();
        setMode('edit');
      }
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && mode === 'edit') {
        e.preventDefault();
        handleSave();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, mode]);

  // Handlers
  const handleClose = useCallback(() => {
    if (hasChanges && mode === 'edit') {
      setShowDiscardDialog(true);
    } else if (mode === 'create' && hasAnyFieldFilled()) {
      setShowDiscardDialog(true);
    } else {
      onClose();
    }
  }, [hasChanges, mode, onClose]);

  const hasAnyFieldFilled = () => {
    return (
      formData.guest_name ||
      formData.guest_email ||
      formData.guest_phone ||
      formData.check_in_date ||
      formData.check_out_date
    );
  };

  const handleDiscard = () => {
    setShowDiscardDialog(false);
    setHasChanges(false);
    if (initialData) {
      setFormData(initialData);
    }
    if (mode === 'create') {
      onClose();
    } else {
      setMode('view');
    }
  };

  const handleChange = (field: keyof BookingData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.guest_name?.trim()) {
      errors.guest_name = 'Guest name is required';
    }
    if (!formData.guest_email?.trim()) {
      errors.guest_email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guest_email)) {
      errors.guest_email = 'Invalid email format';
    }
    if (!formData.check_in_date) {
      errors.check_in_date = 'Check-in date is required';
    }
    if (!formData.check_out_date) {
      errors.check_out_date = 'Check-out date is required';
    }
    if (formData.check_in_date && formData.check_out_date) {
      const checkIn = new Date(formData.check_in_date);
      const checkOut = new Date(formData.check_out_date);
      if (checkOut <= checkIn) {
        errors.check_out_date = 'Check-out must be after check-in';
      }
    }
    if (formData.number_of_guests < 1) {
      errors.number_of_guests = 'At least 1 guest required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    if (mode === 'create') {
      if (availability && !availability.available) {
        toast.error('Selected dates are not available');
        return;
      }
      createBooking.mutate({
        ...formData,
        status: 'pending',
        payment_status: 'unpaid',
      });
    } else if (mode === 'edit' && bookingId) {
      updateBooking.mutate({
        id: bookingId,
        data: formData,
      });
    }
  };

  const handleCopyReference = () => {
    if (formData.id) {
      const ref = generateArcoReference(formData.id);
      navigator.clipboard.writeText(ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Reference copied to clipboard');
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!bookingId) return;
    setStatusUpdating(true);
    try {
      await updateStatus.mutateAsync({ id: bookingId, status: newStatus });
      if (auditUser?.id) {
        logResourceAction('booking_update', auditUser as any, 'booking', bookingId, { newStatus });
      }
    } finally {
      setStatusUpdating(false);
    }
  };

  // Generate online check-in link
  const generateOnlineCheckInLink = () => {
    if (!formData.id) return '';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/check-in/${formData.id}`;
  };

  // Copy online check-in link
  const handleCopyCheckInLink = () => {
    const link = generateOnlineCheckInLink();
    navigator.clipboard.writeText(link);
    setCheckInLinkCopied(true);
    setTimeout(() => setCheckInLinkCopied(false), 2000);
    toast.success('Check-in link copied to clipboard');
  };

  // Send online check-in email
  const handleSendCheckInEmail = async (customEmail?: string) => {
    if (!bookingId) return;
    setSendingCheckInEmail(true);
    try {
      const emailTo = customEmail || formData.guest_email;
      // TODO: Implement API call to send check-in email
      // await api.bookings.sendCheckInEmail(bookingId, emailTo);
      toast.success(`Check-in email sent to ${emailTo}`);
      setOnlineCheckInModalOpen(false);
    } catch (error) {
      toast.error('Failed to send check-in email');
    } finally {
      setSendingCheckInEmail(false);
    }
  };

  // Sync guest breakdown with total
  const handleGuestChange = (field: 'adults' | 'children' | 'infants', value: number) => {
    const newData = { ...formData, [field]: value };
    const total = (newData.adults || 0) + (newData.children || 0) + (newData.infants || 0);
    setFormData({ ...newData, number_of_guests: total });
  };

  // Guest form handlers
  const resetGuestForm = () => {
    setGuestFormData({
      is_primary: false,
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
    });
    setGuestFormErrors({});
    setEditingGuestId(null);
  };

  const handleGuestFormChange = (field: string, value: any) => {
    setGuestFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (guestFormErrors[field]) {
      setGuestFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateGuestForm = () => {
    const errors: Record<string, string> = {};

    // Basic required fields
    if (!guestFormData.first_name?.trim()) {
      errors.first_name = 'First name is required';
    }
    if (!guestFormData.last_name?.trim()) {
      errors.last_name = 'Last name is required';
    }
    if (!guestFormData.date_of_birth) {
      errors.date_of_birth = 'Date of birth is required';
    }
    if (!guestFormData.country_of_birth?.trim()) {
      errors.country_of_birth = 'Country of birth is required';
    }

    // Email required for primary guest
    if (guestFormData.is_primary && !guestFormData.email?.trim()) {
      errors.email = 'Email is required for primary guest';
    }

    // Validate email format if provided
    if (guestFormData.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestFormData.email)) {
      errors.email = 'Invalid email format';
    }

    // Italian citizen requirements
    const isItalianCitizen = guestFormData.country_of_birth?.toLowerCase().includes('ital');
    if (isItalianCitizen) {
      if (!guestFormData.birth_province?.trim()) {
        errors.birth_province = 'Birth province is required for Italian citizens';
      }
      if (!guestFormData.birth_city?.trim()) {
        errors.birth_city = 'Birth city is required for Italian citizens';
      }
    }

    // Document information required
    if (!guestFormData.document_type) {
      errors.document_type = 'Document type is required';
    }
    if (!guestFormData.document_number?.trim()) {
      errors.document_number = 'Document number is required';
    }
    if (!guestFormData.document_issue_date) {
      errors.document_issue_date = 'Document issue date is required';
    }
    if (!guestFormData.document_expire_date) {
      errors.document_expire_date = 'Document expire date is required';
    }
    if (!guestFormData.document_issue_country?.trim()) {
      errors.document_issue_country = 'Document issue country is required';
    }

    // Italian-issued document requirements
    const isItalianDocument = guestFormData.document_issue_country?.toLowerCase().includes('ital');
    if (isItalianDocument) {
      if (!guestFormData.document_issue_province?.trim()) {
        errors.document_issue_province = 'Document issue province is required for Italian-issued documents';
      }
      if (!guestFormData.document_issue_city?.trim()) {
        errors.document_issue_city = 'Document issue city is required for Italian-issued documents';
      }
    }

    // Date validation
    if (guestFormData.document_issue_date && guestFormData.document_expire_date) {
      const issueDate = new Date(guestFormData.document_issue_date);
      const expireDate = new Date(guestFormData.document_expire_date);
      if (expireDate <= issueDate) {
        errors.document_expire_date = 'Expire date must be after issue date';
      }
    }

    setGuestFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveGuest = () => {
    if (!validateGuestForm()) return;

    if (editingGuestId) {
      updateBookingGuest.mutate({ guestId: editingGuestId, data: guestFormData });
    } else {
      createBookingGuest.mutate(guestFormData);
    }
  };

  const handleEditGuest = (guest: any) => {
    setGuestFormData({
      is_primary: guest.is_primary || false,
      first_name: guest.first_name || '',
      last_name: guest.last_name || '',
      email: guest.email || '',
      date_of_birth: guest.date_of_birth || '',
      country_of_birth: guest.country_of_birth || '',
      birth_province: guest.birth_province || '',
      birth_city: guest.birth_city || '',
      document_type: guest.document_type || 'passport',
      document_number: guest.document_number || '',
      document_issue_date: guest.document_issue_date || '',
      document_expire_date: guest.document_expire_date || '',
      document_issue_country: guest.document_issue_country || '',
      document_issue_province: guest.document_issue_province || '',
      document_issue_city: guest.document_issue_city || '',
    });
    setEditingGuestId(guest.id);
  };

  const handleDeleteGuest = (guestId: string) => {
    if (window.confirm('Are you sure you want to remove this guest?')) {
      deleteBookingGuest.mutate(guestId);
    }
  };

  // Billing form handlers
  const handleBillingChange = (field: string, value: any) => {
    setBillingData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (billingErrors[field]) {
      setBillingErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateBillingStep = () => {
    const errors: Record<string, string> = {};

    // Invoice name is required
    if (!billingData.invoice_name?.trim()) {
      errors.invoice_name = 'Invoice name is required';
    }

    // Email format validation if provided
    if (billingData.billing_email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingData.billing_email)) {
      errors.billing_email = 'Invalid email format';
    }

    setBillingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (registrationStep === 1) {
      // Validate billing step before moving to guest registration
      if (validateBillingStep()) {
        setRegistrationStep(2);
      }
    } else if (registrationStep === 2) {
      // Check if at least one guest is registered
      if (!bookingGuestsData || bookingGuestsData.length === 0) {
        toast.error('Please register at least one guest before proceeding');
        return;
      }
      setRegistrationStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (registrationStep > 1) {
      setRegistrationStep(registrationStep - 1);
    }
  };

  const resetWizard = () => {
    setRegistrationStep(1);
    setBillingData({
      invoice_name: '',
      company_name: '',
      vat_number: '',
      fiscal_code: '',
      billing_address: '',
      billing_city: '',
      billing_postal_code: '',
      billing_country: '',
      billing_email: '',
      billing_phone: '',
    });
    setBillingErrors({});
    resetGuestForm();
  };

  // Render helpers
  const renderHeader = () => {
    const title =
      mode === 'create' ? 'New Booking' : mode === 'edit' ? 'Edit Booking' : 'Booking Details';

    return (
      <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {formData.id && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-semibold text-gray-700">
                {generateArcoReference(formData.id)}
              </span>
              <button
                onClick={handleCopyReference}
                className="text-gray-400 hover:text-gray-600"
              >
                {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          )}
        </div>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-700" />
        </button>
      </div>
    );
  };

  const renderViewMode = () => {
    if (loadingBooking) {
      return (
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      );
    }

    if (bookingError) {
      return (
        <div className="p-6">
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-rose-700">
            Failed to load booking details
          </div>
        </div>
      );
    }

    const statusConfig = STATUS_CONFIG[formData.status as keyof typeof STATUS_CONFIG];
    const StatusIcon = statusConfig?.icon;
    const computedPaymentStatus =
      formData.total_price && paidAmount >= formData.total_price
        ? 'paid'
        : paidAmount > 0
        ? 'partial'
        : 'unpaid';
    const paymentConfig = PAYMENT_STATUS_CONFIG[computedPaymentStatus as keyof typeof PAYMENT_STATUS_CONFIG];

    return (
      <div className="space-y-4 p-6">
        {/* Status Badges */}
        <div className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-lg p-4">
          {statusConfig && (
            <Badge className={`${statusConfig.color} border text-xs font-semibold`}>
              {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
              {statusConfig.label}
            </Badge>
          )}
          {paymentConfig && (
            <Badge className={`${paymentConfig.color} border text-xs font-semibold`}>
              {paymentConfig.label}
            </Badge>
          )}
          <Badge className="bg-gray-100 text-gray-800 border text-xs font-semibold capitalize">
            {(formData.booking_source || 'direct').replace('_', ' ')}
          </Badge>
        </div>

        {/* Guest Information */}
        <div className="bg-white rounded-lg border p-4">
          <Label className="text-xs text-gray-600 mb-2 block">Guest Information</Label>
          <p className="font-semibold text-gray-900">{formData.guest_name}</p>
          <p className="text-sm text-gray-700">{formData.guest_email}</p>
          {formData.guest_phone && <p className="text-sm text-gray-700">{formData.guest_phone}</p>}
          {formData.guest_address && (
            <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">{formData.guest_address}</p>
          )}
          {formData.guest_country && <p className="text-sm text-gray-700">{formData.guest_country}</p>}
        </div>

        {/* Dates and Guests */}
        <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
          <div>
            <Label className="text-xs text-gray-600">Check-in</Label>
            <p className="font-semibold text-gray-900">{formatDate(formData.check_in_date)}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-600">Check-out</Label>
            <p className="font-semibold text-gray-900">{formatDate(formData.check_out_date)}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-600">Nights</Label>
            <p className="font-semibold text-gray-900">{formData.nights || nights}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-600">Guests</Label>
            <p className="font-semibold text-gray-900">{formData.number_of_guests}</p>
          </div>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <Label className="text-xs text-gray-600 mb-2 block">Pricing</Label>
            <p className="text-sm text-gray-800">
              Nightly: {formatCurrency(formData.nightly_rate || 0)} × {formData.nights || nights} nights
            </p>
            <p className="text-sm text-gray-800">Cleaning: {formatCurrency(formData.cleaning_fee || 0)}</p>
            <p className="text-sm text-gray-800">Tourist Tax: {formatCurrency(formData.tourist_tax || 0)}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <Label className="text-xs text-gray-600 mb-2 block">Totals</Label>
            <p className="font-semibold text-lg text-gray-900">
              Total: {formatCurrency(formData.total_price || 0)}
            </p>
            <p className="text-sm text-emerald-700 mt-1">Paid: {formatCurrency(paidAmount)}</p>
            <p className={`text-sm ${balanceDue > 0 ? 'text-rose-700' : 'text-gray-700'}`}>
              Balance: {formatCurrency(balanceDue)}
            </p>
          </div>
        </div>

        {/* Special Requests & Notes */}
        {(formData.special_requests || formData.internal_notes) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {formData.special_requests && (
              <div>
                <Label className="text-xs text-gray-600">Special Requests</Label>
                <p className="text-sm text-gray-700 whitespace-pre-line">{formData.special_requests}</p>
              </div>
            )}
            {formData.internal_notes && (
              <div>
                <Label className="text-xs text-gray-600">Internal Notes</Label>
                <p className="text-sm text-gray-700 whitespace-pre-line">{formData.internal_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Timestamps */}
        {(formData.created_at || formData.updated_at) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
            {formData.created_at && <p>Created: {formatDate(formData.created_at)}</p>}
            {formData.updated_at && <p>Updated: {formatDate(formData.updated_at)}</p>}
          </div>
        )}
      </div>
    );
  };

  const renderEditMode = () => {
    return (
      <div className="space-y-4 p-6">
        {/* Guest Information */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-gray-900">Guest Information</h3>
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Guest Name *</Label>
            <Input className="text-gray-900 bg-white border-gray-300"
              value={formData.guest_name}
              onChange={(e) => handleChange('guest_name', e.target.value)}
              placeholder="John Doe"
            />
            {formErrors.guest_name && (
              <p className="text-sm text-red-600">{formErrors.guest_name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Email *</Label>
            <Input className="text-gray-900 bg-white border-gray-300"
              type="email"
              value={formData.guest_email}
              onChange={(e) => handleChange('guest_email', e.target.value)}
              placeholder="john@example.com"
            />
            {formErrors.guest_email && (
              <p className="text-sm text-red-600">{formErrors.guest_email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Phone</Label>
            <Input className="text-gray-900 bg-white border-gray-300"
              type="tel"
              value={formData.guest_phone}
              onChange={(e) => handleChange('guest_phone', e.target.value)}
              placeholder="+1 234 567 8900"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Address</Label>
            <Textarea className="text-gray-900 bg-white border-gray-300"
              value={formData.guest_address || ''}
              onChange={(e) => handleChange('guest_address', e.target.value)}
              placeholder="Street address"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Country</Label>
            <Select
              value={formData.guest_country || ''}
              onValueChange={(value) => handleChange('guest_country', value)}
            >
              <SelectTrigger className="text-gray-900 bg-white border-gray-300">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {COUNTRIES.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Date of Birth (Optional)</Label>
            <Input className="text-gray-900 bg-white border-gray-300"
              type="date"
              value={formData.guest_date_of_birth || ''}
              onChange={(e) => handleChange('guest_date_of_birth', e.target.value)}
            />
          </div>
        </div>

        {/* Booking Details */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-gray-900">Booking Details</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-gray-900 font-medium">Check-in *</Label>
              <Input className="text-gray-900 bg-white border-gray-300"
                type="date"
                value={formData.check_in_date}
                onChange={(e) => handleChange('check_in_date', e.target.value)}
              />
              {formErrors.check_in_date && (
                <p className="text-sm text-red-600">{formErrors.check_in_date}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-gray-900 font-medium">Check-out *</Label>
              <Input className="text-gray-900 bg-white border-gray-300"
                type="date"
                value={formData.check_out_date}
                onChange={(e) => handleChange('check_out_date', e.target.value)}
              />
              {formErrors.check_out_date && (
                <p className="text-sm text-red-600">{formErrors.check_out_date}</p>
              )}
            </div>
          </div>
          <div className="space-y-3">
            <Label className="text-gray-900 font-medium">Guest Breakdown *</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Adults</Label>
                <Input className="text-gray-900 bg-white border-gray-300"
                  type="number"
                  min={0}
                  value={formData.adults || 0}
                  onChange={(e) => handleGuestChange('adults', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Children</Label>
                <Input className="text-gray-900 bg-white border-gray-300"
                  type="number"
                  min={0}
                  value={formData.children || 0}
                  onChange={(e) => handleGuestChange('children', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Infants</Label>
                <Input className="text-gray-900 bg-white border-gray-300"
                  type="number"
                  min={0}
                  value={formData.infants || 0}
                  onChange={(e) => handleGuestChange('infants', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <p className="text-xs text-gray-600">
              Total: {(formData.adults || 0) + (formData.children || 0) + (formData.infants || 0)} guests
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Booking Source</Label>
            <Select
              value={formData.booking_source}
              onValueChange={(value) => handleChange('booking_source', value)}
            >
              <SelectTrigger className="text-gray-900 bg-white border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
                <SelectItem value="airbnb">Airbnb</SelectItem>
                <SelectItem value="booking_com">Booking.com</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleChange('status', value)}
            >
              <SelectTrigger className="text-gray-900 bg-white border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="checked_in">Checked In</SelectItem>
                <SelectItem value="checked_out">Checked Out</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no_show">No Show</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Payment Status</Label>
            <Select
              value={formData.payment_status}
              onValueChange={(value) => handleChange('payment_status', value)}
            >
              <SelectTrigger className="text-gray-900 bg-white border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="partially_refunded">Partially Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.payment_status === 'partial' && (
            <>
              <div className="space-y-2">
                <Label className="text-gray-900 font-medium">Amount Paid</Label>
                <Input className="text-gray-900 bg-white border-gray-300"
                  type="number"
                  step="0.01"
                  min={0}
                  value={formData.amount_paid || 0}
                  onChange={(e) => handleChange('amount_paid', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-900 font-medium">Payment Method</Label>
                <Select
                  value={formData.payment_method || ''}
                  onValueChange={(value) => handleChange('payment_method', value)}
                >
                  <SelectTrigger className="text-gray-900 bg-white border-gray-300">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        {/* Special Requests & Notes */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Special Requests</Label>
            <Textarea className="text-gray-900 bg-white border-gray-300"
              value={formData.special_requests || ''}
              onChange={(e) => handleChange('special_requests', e.target.value)}
              placeholder="Guest requests..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Internal Notes</Label>
            <Textarea className="text-gray-900 bg-white border-gray-300"
              value={formData.internal_notes || ''}
              onChange={(e) => handleChange('internal_notes', e.target.value)}
              placeholder="Team-only notes..."
              rows={3}
            />
          </div>
        </div>

        {/* Pricing Section */}
        {mode === 'edit' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-gray-900">Pricing</h3>
              <button
                type="button"
                onClick={() => setManualPricingEnabled(!manualPricingEnabled)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {manualPricingEnabled ? 'Use Auto Pricing' : 'Edit Manually'}
              </button>
            </div>
            {!manualPricingEnabled ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <Label className="text-xs text-gray-600 mb-2 block">Automatically Calculated</Label>
                <p className="text-sm text-gray-800">
                  Total: {formatCurrency(formData.total_price || 0)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Based on dates and pricing rules
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <Label className="text-xs text-blue-700 mb-2 block">Manual Pricing Override</Label>
                <div className="space-y-2">
                  <Label className="text-gray-900 font-medium text-xs">Nightly Rate</Label>
                  <Input className="text-gray-900 bg-white border-gray-300"
                    type="number"
                    step="0.01"
                    value={formData.custom_nightly_rate || formData.nightly_rate || 0}
                    onChange={(e) => handleChange('custom_nightly_rate', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-900 font-medium text-xs">Cleaning Fee</Label>
                  <Input className="text-gray-900 bg-white border-gray-300"
                    type="number"
                    step="0.01"
                    value={formData.custom_cleaning_fee || formData.cleaning_fee || 0}
                    onChange={(e) => handleChange('custom_cleaning_fee', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-900 font-medium text-xs">Tourist Tax</Label>
                  <Input className="text-gray-900 bg-white border-gray-300"
                    type="number"
                    step="0.01"
                    value={formData.custom_tourist_tax || formData.tourist_tax || 0}
                    onChange={(e) => handleChange('custom_tourist_tax', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-900 font-medium text-xs">Total Price</Label>
                  <Input className="text-gray-900 bg-white border-gray-300"
                    type="number"
                    step="0.01"
                    value={formData.custom_total_price || formData.total_price || 0}
                    onChange={(e) => handleChange('custom_total_price', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCreateMode = () => {
    return (
      <div className="space-y-4 p-6">
        {/* Guest Information */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-gray-900">Guest Information</h3>
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Guest Name *</Label>
            <Input className="text-gray-900 bg-white border-gray-300"
              value={formData.guest_name}
              onChange={(e) => handleChange('guest_name', e.target.value)}
              placeholder="John Doe"
            />
            {formErrors.guest_name && (
              <p className="text-sm text-red-600">{formErrors.guest_name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Email *</Label>
            <Input className="text-gray-900 bg-white border-gray-300"
              type="email"
              value={formData.guest_email}
              onChange={(e) => handleChange('guest_email', e.target.value)}
              placeholder="john@example.com"
            />
            {formErrors.guest_email && (
              <p className="text-sm text-red-600">{formErrors.guest_email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Phone</Label>
            <Input className="text-gray-900 bg-white border-gray-300"
              type="tel"
              value={formData.guest_phone}
              onChange={(e) => handleChange('guest_phone', e.target.value)}
              placeholder="+1 234 567 8900"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Address</Label>
            <Textarea className="text-gray-900 bg-white border-gray-300"
              value={formData.guest_address || ''}
              onChange={(e) => handleChange('guest_address', e.target.value)}
              placeholder="Street address"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Country</Label>
            <Select
              value={formData.guest_country || ''}
              onValueChange={(value) => handleChange('guest_country', value)}
            >
              <SelectTrigger className="text-gray-900 bg-white border-gray-300">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {COUNTRIES.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Date of Birth (Optional)</Label>
            <Input className="text-gray-900 bg-white border-gray-300"
              type="date"
              value={formData.guest_date_of_birth || ''}
              onChange={(e) => handleChange('guest_date_of_birth', e.target.value)}
            />
          </div>
        </div>

        {/* Booking Details */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-gray-900">Booking Details</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-gray-900 font-medium">Check-in *</Label>
              <Input className="text-gray-900 bg-white border-gray-300"
                type="date"
                value={formData.check_in_date}
                onChange={(e) => handleChange('check_in_date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              {formErrors.check_in_date && (
                <p className="text-sm text-red-600">{formErrors.check_in_date}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-gray-900 font-medium">Check-out *</Label>
              <Input className="text-gray-900 bg-white border-gray-300"
                type="date"
                value={formData.check_out_date}
                onChange={(e) => handleChange('check_out_date', e.target.value)}
                min={formData.check_in_date || new Date().toISOString().split('T')[0]}
              />
              {formErrors.check_out_date && (
                <p className="text-sm text-red-600">{formErrors.check_out_date}</p>
              )}
            </div>
          </div>

          {/* Availability Check */}
          {formData.check_in_date && formData.check_out_date && (
            <div
              className={`p-3 rounded-lg ${
                availability?.available
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {availability?.available ? (
                <p className="text-green-800 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Dates are available ({nights} night{nights !== 1 ? 's' : ''})
                </p>
              ) : (
                <p className="text-red-800 text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Selected dates are not available
                </p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-gray-900 font-medium">Guest Breakdown *</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Adults</Label>
                <Input className="text-gray-900 bg-white border-gray-300"
                  type="number"
                  min={0}
                  value={formData.adults || 0}
                  onChange={(e) => handleGuestChange('adults', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Children</Label>
                <Input className="text-gray-900 bg-white border-gray-300"
                  type="number"
                  min={0}
                  value={formData.children || 0}
                  onChange={(e) => handleGuestChange('children', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Infants</Label>
                <Input className="text-gray-900 bg-white border-gray-300"
                  type="number"
                  min={0}
                  value={formData.infants || 0}
                  onChange={(e) => handleGuestChange('infants', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <p className="text-xs text-gray-600">
              Total: {(formData.adults || 0) + (formData.children || 0) + (formData.infants || 0)} guests
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Booking Source</Label>
            <Select
              value={formData.booking_source}
              onValueChange={(value) => handleChange('booking_source', value)}
            >
              <SelectTrigger className="text-gray-900 bg-white border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
                <SelectItem value="airbnb">Airbnb</SelectItem>
                <SelectItem value="booking_com">Booking.com</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Pricing Preview */}
        {priceCalculation && nights > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-gray-900">Pricing Preview</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {nights} night{nights !== 1 ? 's' : ''} × {formatCurrency(priceCalculation.nightly_rate)}
                </span>
                <span className="font-medium">{formatCurrency(priceCalculation.accommodation_total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Cleaning Fee</span>
                <span className="font-medium">{formatCurrency(priceCalculation.cleaning_fee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Tourist Tax</span>
                <span className="font-medium">{formatCurrency(priceCalculation.tourist_tax)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCurrency(priceCalculation.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Special Requests & Notes */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Special Requests</Label>
            <Textarea className="text-gray-900 bg-white border-gray-300"
              value={formData.special_requests || ''}
              onChange={(e) => handleChange('special_requests', e.target.value)}
              placeholder="Guest requests..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Internal Notes</Label>
            <Textarea className="text-gray-900 bg-white border-gray-300"
              value={formData.internal_notes || ''}
              onChange={(e) => handleChange('internal_notes', e.target.value)}
              placeholder="Team-only notes..."
              rows={3}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderFooter = () => {
    if (mode === 'view') {
      const canCheckIn = formData.status && ['confirmed', 'paid', 'pending'].includes(formData.status);
      const canCheckOut = formData.status === 'checked_in';
      const canCancel = formData.status && !['cancelled', 'checked_out', 'no_show', 'checked_in'].includes(formData.status);
      const canMarkNoShow = formData.status && ['confirmed', 'paid'].includes(formData.status);
      const canUndoNoShow = formData.status === 'no_show';
      const canUndoCancel = formData.status === 'cancelled';
      const canUndoCheckIn = formData.status === 'checked_in';

      return (
        <div className="border-t px-6 py-4 bg-gray-50 space-y-3">
          {/* Primary Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
              Close
            </Button>
            <Button
              onClick={() => setMode('edit')}
              disabled={!!formData.status && ['checked_out', 'cancelled', 'no_show'].includes(formData.status)}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white"
            >
              <EditIcon className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>

          {/* Guest Management Buttons */}
          {formData.status && !['cancelled'].includes(formData.status) && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setOnlineCheckInModalOpen(true)}
                size="sm"
                className="border-blue-400 text-blue-700 hover:bg-blue-50"
              >
                <LinkIcon className="w-4 h-4 mr-1" />
                Online Check-in
              </Button>
              <Button
                variant="outline"
                onClick={() => setGuestRegistrationModalOpen(true)}
                size="sm"
                className="border-purple-400 text-purple-700 hover:bg-purple-50"
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Guest Registration
              </Button>
            </div>
          )}

          {/* Status Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {canCheckIn && (
              <Button
                variant="outline"
                disabled={statusUpdating}
                onClick={() => handleStatusUpdate('checked_in')}
                size="sm"
                className="border-violet-300 text-violet-700 hover:bg-violet-50"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                {statusUpdating ? 'Updating...' : 'Check-in'}
              </Button>
            )}
            {canUndoCheckIn && (
              <Button
                variant="outline"
                disabled={statusUpdating}
                onClick={() => handleStatusUpdate('confirmed')}
                size="sm"
                className="border-orange-400 text-orange-700 hover:bg-orange-50"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                {statusUpdating ? 'Updating...' : 'Undo Check-in'}
              </Button>
            )}
            {canCheckOut && (
              <Button
                variant="outline"
                disabled={statusUpdating || balanceDue > 0}
                onClick={() => handleStatusUpdate('checked_out')}
                size="sm"
                className="border-gray-400 text-gray-700 hover:bg-gray-100"
                title={balanceDue > 0 ? 'Cannot check out with outstanding balance' : ''}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                {statusUpdating ? 'Updating...' : 'Check-out'}
              </Button>
            )}
            {canMarkNoShow && (
              <Button
                variant="outline"
                disabled={statusUpdating}
                onClick={() => handleStatusUpdate('no_show')}
                size="sm"
                className="border-slate-400 text-slate-700 hover:bg-slate-100"
              >
                <Ban className="w-4 h-4 mr-1" />
                {statusUpdating ? 'Updating...' : 'No Show'}
              </Button>
            )}
            {canUndoNoShow && (
              <Button
                variant="outline"
                disabled={statusUpdating}
                onClick={() => handleStatusUpdate('confirmed')}
                size="sm"
                className="border-green-400 text-green-700 hover:bg-green-50"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                {statusUpdating ? 'Updating...' : 'Undo No Show'}
              </Button>
            )}
            {canUndoCancel && (
              <Button
                variant="outline"
                disabled={statusUpdating}
                onClick={() => handleStatusUpdate('confirmed')}
                size="sm"
                className="border-green-400 text-green-700 hover:bg-green-50"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                {statusUpdating ? 'Updating...' : 'Undo Cancellation'}
              </Button>
            )}
            {canCancel && (
              <Button
                variant="outline"
                disabled={statusUpdating}
                onClick={() => handleStatusUpdate('cancelled')}
                size="sm"
                className="border-rose-400 text-rose-700 hover:bg-rose-50"
              >
                <XCircle className="w-4 h-4 mr-1" />
                {statusUpdating ? 'Updating...' : 'Cancel Booking'}
              </Button>
            )}
          </div>
        </div>
      );
    }

    if (mode === 'edit' || mode === 'create') {
      const isLoading = createBooking.isPending || updateBooking.isPending;
      const isDisabled = isLoading || (mode === 'create' && availability && !availability.available);

      return (
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-between gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isDisabled} className="min-w-[120px]">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {mode === 'create' ? 'Creating...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {mode === 'create' ? 'Create Booking' : 'Save Changes'}
              </>
            )}
          </Button>
        </div>
      );
    }

    return null;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={handleClose}
          />
        )}
      </AnimatePresence>

      {/* Side Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 480 }}
            animate={{ x: 0 }}
            exit={{ x: 480 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white shadow-lg z-50 flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            {renderHeader()}
            <div className="flex-1 overflow-y-auto">
              {mode === 'view' && renderViewMode()}
              {mode === 'edit' && renderEditMode()}
              {mode === 'create' && renderCreateMode()}
            </div>
            {renderFooter()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discard Changes Dialog */}
      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard Changes?</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Are you sure you want to discard them?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscardDialog(false)}>
              Keep Editing
            </Button>
            <Button variant="destructive" onClick={handleDiscard}>
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Online Check-in Modal */}
      <Dialog open={onlineCheckInModalOpen} onOpenChange={setOnlineCheckInModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Online Check-in</DialogTitle>
            <DialogDescription>
              Share the online check-in link with your guest
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={generateOnlineCheckInLink()}
                className="flex-1 text-sm text-gray-700 bg-gray-50"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyCheckInLink}
              >
                {checkInLinkCopied ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-3">Send link via email</p>
              <div className="space-y-2">
                <Button
                  className="w-full"
                  variant="default"
                  onClick={() => handleSendCheckInEmail()}
                  disabled={sendingCheckInEmail}
                >
                  {sendingCheckInEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send to {formData.guest_email}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOnlineCheckInModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guest Registration Modal */}
      <Dialog open={guestRegistrationModalOpen} onOpenChange={(open) => {
        setGuestRegistrationModalOpen(open);
        if (!open) {
          resetGuestForm();
          setEditingGuestId(null);
        }
      }}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Guest Registration
            </DialogTitle>
            <DialogDescription>
              Register guests for {formData.guest_name} • Booking #{formData.booking_id} • {formData.number_of_guests || 0} guests expected
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Registration Progress Card */}
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-300 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Registration Progress
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Expected: <span className="font-bold text-gray-900">{formData.number_of_guests || 0}</span> guest(s) for this booking
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {bookingGuestsData?.length || 0}/{formData.number_of_guests || 0}
                  </div>
                  <p className="text-xs text-gray-600 font-medium">registered</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-3 bg-white/80 rounded-full overflow-hidden shadow-inner border border-blue-200">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(100, ((bookingGuestsData?.length || 0) / Math.max(1, formData.number_of_guests || 1)) * 100)}%`,
                  }}
                />
              </div>

              {/* Status Messages */}
              {(() => {
                const registered = bookingGuestsData?.length || 0;
                const expected = formData.number_of_guests || 1;
                const remaining = expected - registered;

                if (registered === expected && registered > 0) {
                  return (
                    <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-emerald-100 border-2 border-emerald-400">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                      <p className="text-sm font-bold text-emerald-900">
                        Perfect! All {expected} guests have been registered successfully.
                      </p>
                    </div>
                  );
                } else if (registered > expected) {
                  return (
                    <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-amber-100 border-2 border-amber-400">
                      <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0" />
                      <p className="text-sm font-bold text-amber-900">
                        {registered} guests registered, but only {expected} expected. Please remove {registered - expected} guest(s).
                      </p>
                    </div>
                  );
                } else if (remaining > 0) {
                  return (
                    <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-orange-100 border-2 border-orange-400">
                      <AlertTriangle className="w-5 h-5 text-orange-700 flex-shrink-0" />
                      <p className="text-sm font-bold text-orange-900">
                        {remaining} more guest(s) needed to complete registration.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Registered Guests List */}
            {bookingGuestsData && bookingGuestsData.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Registered Guests</h3>
                  <Badge className="bg-blue-600 text-white text-sm px-3 py-1">
                    {bookingGuestsData.length} {bookingGuestsData.length === 1 ? 'Guest' : 'Guests'}
                  </Badge>
                </div>

                <div className="grid gap-3">
                  {bookingGuestsData.map((guest: any, index: number) => (
                    <div
                      key={guest.id}
                      className="group relative bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-lg transition-all duration-200"
                    >
                      {/* Number Badge */}
                      <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg border-2 border-white">
                        {index + 1}
                      </div>

                      <div className="flex items-start gap-4 ml-4">
                        {/* Guest Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-gray-900 text-lg">
                              {guest.first_name} {guest.last_name}
                            </h4>
                            {guest.is_primary && (
                              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 text-xs font-bold">
                                PRIMARY
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span className="font-medium">Born:</span>
                              <span>{new Date(guest.date_of_birth).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <span className="font-medium">Country:</span>
                              <span>{guest.country_of_birth}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-600 col-span-2">
                              <FileText className="w-4 h-4" />
                              <span className="font-medium">Document:</span>
                              <span className="font-mono">{guest.document_type.replace('_', ' ').toUpperCase()}: {guest.document_number}</span>
                            </div>
                            {guest.email && (
                              <div className="flex items-center gap-1.5 text-gray-600 col-span-2">
                                <Mail className="w-4 h-4" />
                                <span className="truncate">{guest.email}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditGuest(guest)}
                            className="border-blue-400 text-blue-700 hover:bg-blue-50"
                          >
                            <EditIcon className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteGuest(guest.id)}
                            className="border-red-400 text-red-700 hover:bg-red-50"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Guest Form */}
            <div className="border-2 border-gray-300 rounded-xl p-5 bg-gradient-to-br from-gray-50 to-white">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-indigo-600" />
                    {editingGuestId ? 'Edit Guest Information' : 'Add New Guest'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {editingGuestId ? 'Update guest details below' : 'Fill in all required guest information'}
                  </p>
                </div>
                {editingGuestId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      resetGuestForm();
                      setEditingGuestId(null);
                    }}
                    className="border-gray-400"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel Edit
                  </Button>
                )}
              </div>

              {/* Primary Guest Checkbox */}
              <div className="mb-5 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-lg">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="is_primary"
                    checked={guestFormData.is_primary}
                    onChange={(e) => handleGuestFormChange('is_primary', e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <Label htmlFor="is_primary" className="text-sm font-bold text-gray-900 cursor-pointer">
                      Mark as Primary Guest
                    </Label>
                    <p className="text-xs text-gray-600 mt-0.5">Primary guest is the main contact for this booking</p>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="space-y-4 mb-5">
                <h4 className="font-bold text-gray-900 flex items-center gap-2 pb-2 border-b-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Personal Information
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-900">First Name *</Label>
                    <Input
                      value={guestFormData.first_name}
                      onChange={(e) => handleGuestFormChange('first_name', e.target.value)}
                      placeholder="John"
                    />
                    {guestFormErrors.first_name && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {guestFormErrors.first_name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-900">Last Name *</Label>
                    <Input
                      value={guestFormData.last_name}
                      onChange={(e) => handleGuestFormChange('last_name', e.target.value)}
                      placeholder="Doe"
                    />
                    {guestFormErrors.last_name && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {guestFormErrors.last_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-900">
                      Email {guestFormData.is_primary && <span className="text-red-600">*</span>}
                    </Label>
                    <Input
                      type="email"
                      value={guestFormData.email}
                      onChange={(e) => handleGuestFormChange('email', e.target.value)}
                      placeholder="john@example.com"
                    />
                    {guestFormErrors.email && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {guestFormErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-900">Date of Birth *</Label>
                    <Input
                      type="date"
                      value={guestFormData.date_of_birth}
                      onChange={(e) => handleGuestFormChange('date_of_birth', e.target.value)}
                    />
                    {guestFormErrors.date_of_birth && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {guestFormErrors.date_of_birth}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900">Country of Birth *</Label>
                  <Select
                    value={guestFormData.country_of_birth}
                    onValueChange={(value) => handleGuestFormChange('country_of_birth', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px]">
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {guestFormErrors.country_of_birth && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {guestFormErrors.country_of_birth}
                    </p>
                  )}
                </div>

                {/* Italian Citizen Fields */}
                {guestFormData.country_of_birth?.toLowerCase().includes('ital') && (
                  <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg space-y-3">
                    <p className="text-sm font-bold text-blue-900">Italian Citizen Additional Info</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Birth Province *</Label>
                        <Input
                          value={guestFormData.birth_province}
                          onChange={(e) => handleGuestFormChange('birth_province', e.target.value)}
                          placeholder="e.g., Roma"
                        />
                        {guestFormErrors.birth_province && (
                          <p className="text-xs text-red-600">{guestFormErrors.birth_province}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Birth City *</Label>
                        <Input
                          value={guestFormData.birth_city}
                          onChange={(e) => handleGuestFormChange('birth_city', e.target.value)}
                          placeholder="e.g., Roma"
                        />
                        {guestFormErrors.birth_city && (
                          <p className="text-xs text-red-600">{guestFormErrors.birth_city}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Document Information */}
              <div className="space-y-4">
                <h4 className="font-bold text-gray-900 flex items-center gap-2 pb-2 border-b-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Document Information
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-900">Document Type *</Label>
                    <Select
                      value={guestFormData.document_type}
                      onValueChange={(value) => handleGuestFormChange('document_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="id_card">ID Card</SelectItem>
                        <SelectItem value="driving_license">Driving License</SelectItem>
                        <SelectItem value="residence_permit">Residence Permit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-900">Document Number *</Label>
                    <Input
                      value={guestFormData.document_number}
                      onChange={(e) => handleGuestFormChange('document_number', e.target.value)}
                      placeholder="ABC123456"
                    />
                    {guestFormErrors.document_number && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {guestFormErrors.document_number}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-900">Issue Date *</Label>
                    <Input
                      type="date"
                      value={guestFormData.document_issue_date}
                      onChange={(e) => handleGuestFormChange('document_issue_date', e.target.value)}
                    />
                    {guestFormErrors.document_issue_date && (
                      <p className="text-xs text-red-600">{guestFormErrors.document_issue_date}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-900">Expiry Date *</Label>
                    <Input
                      type="date"
                      value={guestFormData.document_expire_date}
                      onChange={(e) => handleGuestFormChange('document_expire_date', e.target.value)}
                    />
                    {guestFormErrors.document_expire_date && (
                      <p className="text-xs text-red-600">{guestFormErrors.document_expire_date}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900">Document Issue Country *</Label>
                  <Select
                    value={guestFormData.document_issue_country}
                    onValueChange={(value) => handleGuestFormChange('document_issue_country', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px]">
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {guestFormErrors.document_issue_country && (
                    <p className="text-xs text-red-600">{guestFormErrors.document_issue_country}</p>
                  )}
                </div>

                {/* Italian-issued Document Fields */}
                {guestFormData.document_issue_country?.toLowerCase().includes('ital') && (
                  <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-lg space-y-3">
                    <p className="text-sm font-bold text-purple-900">Italian-Issued Document Additional Info</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Issue Province *</Label>
                        <Input
                          value={guestFormData.document_issue_province}
                          onChange={(e) => handleGuestFormChange('document_issue_province', e.target.value)}
                          placeholder="e.g., Milano"
                        />
                        {guestFormErrors.document_issue_province && (
                          <p className="text-xs text-red-600">{guestFormErrors.document_issue_province}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Issue City *</Label>
                        <Input
                          value={guestFormData.document_issue_city}
                          onChange={(e) => handleGuestFormChange('document_issue_city', e.target.value)}
                          placeholder="e.g., Milano"
                        />
                        {guestFormErrors.document_issue_city && (
                          <p className="text-xs text-red-600">{guestFormErrors.document_issue_city}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="mt-6">
                <Button
                  onClick={handleSaveGuest}
                  disabled={createBookingGuest.isPending || updateBookingGuest.isPending}
                  className="w-full h-12 text-base font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
                >
                  {(createBookingGuest.isPending || updateBookingGuest.isPending) ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {editingGuestId ? 'Updating Guest...' : 'Saving Guest...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      {editingGuestId ? 'Update Guest Information' : 'Add Guest to Booking'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t bg-gray-50">
            <Button
              variant="outline"
              onClick={() => setGuestRegistrationModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
