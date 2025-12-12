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
  const [manualPricingEnabled, setManualPricingEnabled] = useState(false);
  const [checkInLinkCopied, setCheckInLinkCopied] = useState(false);
  const [sendingCheckInEmail, setSendingCheckInEmail] = useState(false);

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
    const ref = formData.booking_id || (formData.id ? generateArcoReference(formData.id) : '');
    if (ref) {
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

  // Render helpers
  const renderHeader = () => {
    const title =
      mode === 'create' ? 'New Booking' : mode === 'edit' ? 'Edit Booking' : 'Booking Details';

    return (
      <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {(formData.booking_id || formData.id) && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-semibold text-gray-700">
                {formData.booking_id || generateArcoReference(formData.id)}
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

    </>
  );
}
