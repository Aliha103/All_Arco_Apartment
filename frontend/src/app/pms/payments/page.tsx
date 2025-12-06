'use client';

// ============================================================================
// Payments Management Page - Quantum Level Performance
// ============================================================================
// Features:
// - Track all open balances across bookings
// - Create payment requests linked to bookings
// - Send payment links via email
// - Mark payments as paid with payment method tracking
// - Cancel payments with reason and permission check
// - Real-time search and filtering
// - Responsive design with animations
// ============================================================================

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Mail,
  Copy,
  MoreHorizontal,
  Clock,
  Calendar,
  User,
  FileText,
  Ban,
  CreditCard,
  Banknote,
  Wallet,
  Building2,
  X,
  ChevronDown,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import api from '@/lib/api';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface PaymentRequest {
  id: string;
  booking_id: string;
  booking_reference: string;
  guest_name: string;
  guest_email: string;
  title: string;
  description: string;
  amount: number;
  status: 'pending' | 'overdue' | 'paid' | 'cancelled';
  payment_method?: 'card' | 'bank_transfer' | 'cash' | 'paypal' | 'stripe' | 'other';
  payment_url: string;
  due_date: string;
  paid_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
}

interface Booking {
  id: string;
  booking_id: string;
  guest_name: string;
  guest_email: string;
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  nights: number;
  status: string;
}

interface CreatePaymentForm {
  booking_id: string;
  title: string;
  description: string;
  amount: string;
  due_date: string;
}

// ============================================================================
// Status Configuration
// ============================================================================

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
  },
  overdue: {
    label: 'Overdue',
    color: 'bg-red-100 text-red-800',
    icon: AlertCircle,
  },
  paid: {
    label: 'Paid',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-600',
    icon: XCircle,
  },
};

const PAYMENT_METHODS = [
  { value: 'card', label: 'Credit/Debit Card', icon: CreditCard },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'paypal', label: 'PayPal', icon: Wallet },
  { value: 'stripe', label: 'Stripe', icon: CreditCard },
  { value: 'other', label: 'Other', icon: DollarSign },
];

// ============================================================================
// Mock Data (Replace with real API)
// ============================================================================

const MOCK_PAYMENTS: PaymentRequest[] = [
  {
    id: '1',
    booking_id: '1',
    booking_reference: 'ARCO-2024-001',
    guest_name: 'John Doe',
    guest_email: 'john@example.com',
    title: 'Remaining Balance',
    description: 'Final payment for 3-night stay',
    amount: 450.00,
    status: 'pending',
    payment_url: 'https://pay.arco.com/abc123',
    due_date: '2024-12-15',
    created_at: '2024-12-01T10:00:00Z',
    updated_at: '2024-12-01T10:00:00Z',
  },
  {
    id: '2',
    booking_id: '2',
    booking_reference: 'ARCO-2024-002',
    guest_name: 'Jane Smith',
    guest_email: 'jane@example.com',
    title: 'Security Deposit',
    description: 'Refundable security deposit',
    amount: 200.00,
    status: 'overdue',
    payment_url: 'https://pay.arco.com/def456',
    due_date: '2024-11-20',
    created_at: '2024-11-15T10:00:00Z',
    updated_at: '2024-11-15T10:00:00Z',
  },
];

// ============================================================================
// Main Component
// ============================================================================

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRequest | null>(null);
  const [isMarkPaidModalOpen, setIsMarkPaidModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  // ============================================================================
  // Data Fetching (Using mock data for now)
  // ============================================================================

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      // TODO: Replace with real API call
      // const response = await api.payments.list();
      // return response.data;
      return MOCK_PAYMENTS;
    },
  });

  // ============================================================================
  // Filtered & Sorted Data
  // ============================================================================

  const filteredPayments = useMemo(() => {
    let filtered = [...payments];

    // Search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (payment) =>
          payment.booking_reference.toLowerCase().includes(searchLower) ||
          payment.guest_name.toLowerCase().includes(searchLower) ||
          payment.guest_email.toLowerCase().includes(searchLower) ||
          payment.title.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((payment) => payment.status === statusFilter);
    }

    // Sort by created date (newest first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return filtered;
  }, [payments, debouncedSearch, statusFilter]);

  // ============================================================================
  // Statistics
  // ============================================================================

  const statistics = useMemo(() => {
    const openPayments = payments.filter((p) => p.status === 'pending' || p.status === 'overdue');
    const totalOpenBalance = openPayments.reduce((sum, p) => sum + p.amount, 0);
    const overduePayments = payments.filter((p) => p.status === 'overdue');
    const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0);
    const paidPayments = payments.filter((p) => p.status === 'paid');
    const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalOpenBalance,
      openCount: openPayments.length,
      totalOverdue,
      overdueCount: overduePayments.length,
      totalPaid,
      paidCount: paidPayments.length,
    };
  }, [payments]);

  // ============================================================================
  // Actions
  // ============================================================================

  const copyPaymentUrl = useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Payment URL copied to clipboard');
  }, []);

  const sendPaymentEmail = useCallback((payment: PaymentRequest) => {
    // TODO: Implement email sending
    toast.success(`Payment request sent to ${payment.guest_email}`);
  }, []);

  const handleMarkPaid = useCallback((payment: PaymentRequest) => {
    setSelectedPayment(payment);
    setIsMarkPaidModalOpen(true);
  }, []);

  const handleCancel = useCallback((payment: PaymentRequest) => {
    setSelectedPayment(payment);
    setIsCancelModalOpen(true);
  }, []);

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
            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
            <p className="text-sm text-gray-500">Track open balances and payment requests</p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Payment Request
          </Button>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border border-gray-200 hover:border-gray-300 transition-colors">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-yellow-50 rounded-lg border border-yellow-100">
                  <DollarSign className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
                    Total Open Balance
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {formatCurrency(statistics.totalOpenBalance)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {statistics.openCount} pending payment{statistics.openCount !== 1 ? 's' : ''}
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
                <div className="p-2.5 bg-red-50 rounded-lg border border-red-100">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
                    Overdue Payments
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {formatCurrency(statistics.totalOverdue)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {statistics.overdueCount} overdue
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
                <div className="p-2.5 bg-green-50 rounded-lg border border-green-100">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
                    Total Collected
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {formatCurrency(statistics.totalPaid)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {statistics.paidCount} paid
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card className="border border-gray-200">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by booking reference, guest name, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payments List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">
              All Payments ({filteredPayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <DollarSign className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No payments found</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {search || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first payment request to get started'}
                </p>
                {!search && statusFilter === 'all' && (
                  <Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Payment Request
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <AnimatePresence mode="popLayout">
                  {filteredPayments.map((payment, index) => (
                    <PaymentCard
                      key={payment.id}
                      payment={payment}
                      index={index}
                      onCopyUrl={copyPaymentUrl}
                      onSendEmail={sendPaymentEmail}
                      onMarkPaid={handleMarkPaid}
                      onCancel={handleCancel}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Modals */}
      <CreatePaymentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
      <MarkPaidModal
        isOpen={isMarkPaidModalOpen}
        onClose={() => {
          setIsMarkPaidModalOpen(false);
          setSelectedPayment(null);
        }}
        payment={selectedPayment}
      />
      <CancelPaymentModal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setSelectedPayment(null);
        }}
        payment={selectedPayment}
      />
    </div>
  );
}

// ============================================================================
// Payment Card Component
// ============================================================================

interface PaymentCardProps {
  payment: PaymentRequest;
  index: number;
  onCopyUrl: (url: string) => void;
  onSendEmail: (payment: PaymentRequest) => void;
  onMarkPaid: (payment: PaymentRequest) => void;
  onCancel: (payment: PaymentRequest) => void;
}

function PaymentCard({
  payment,
  index,
  onCopyUrl,
  onSendEmail,
  onMarkPaid,
  onCancel,
}: PaymentCardProps) {
  const statusConfig = STATUS_CONFIG[payment.status];
  const StatusIcon = statusConfig.icon;
  const isPending = payment.status === 'pending' || payment.status === 'overdue';
  const isOverdue = payment.status === 'overdue';

  // Status-based styling
  const getAccent = () => {
    switch (payment.status) {
      case 'overdue':
        return 'from-red-50 to-white border-red-100';
      case 'pending':
        return 'from-amber-50 to-white border-amber-100';
      case 'paid':
        return 'from-emerald-50 to-white border-emerald-100';
      default:
        return 'from-gray-50 to-white border-gray-100';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      layout
      className={cn(
        'rounded-xl border hover:shadow-md transition-all duration-200 bg-gradient-to-br',
        getAccent()
      )}
    >
      <div className="p-5 space-y-5 backdrop-blur-sm">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{payment.title}</h3>
              <Badge
                className={cn(
                  statusConfig.color,
                  'text-xs font-medium px-2 py-0.5'
                )}
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">{payment.description}</p>
          </div>

          {/* Amount */}
          <div className="flex flex-row md:flex-col items-start md:items-end gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Amount
            </span>
            <span className={cn(
              'text-2xl font-bold',
              isOverdue ? 'text-red-600' : isPending ? 'text-yellow-600' : 'text-green-600'
            )}>
              {formatCurrency(payment.amount)}
            </span>
            {payment.paid_at && (
              <span className="text-xs text-gray-500 mt-1">
                Paid {formatDate(payment.paid_at)}
              </span>
            )}
            {payment.cancelled_at && (
              <span className="text-xs text-gray-500 mt-1">
                Cancelled {formatDate(payment.cancelled_at)}
              </span>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pt-3 border-t border-gray-200">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 bg-blue-50 rounded border border-blue-100">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 font-medium mb-0.5">
                Booking
              </p>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {payment.booking_reference}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-1.5 bg-purple-50 rounded border border-purple-100">
              <User className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 font-medium mb-0.5">
                Guest
              </p>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {payment.guest_name}
              </p>
              <p className="text-xs text-gray-500 truncate">{payment.guest_email}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className={cn(
              'p-1.5 rounded border',
              isOverdue ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'
            )}>
              <Calendar className={cn(
                'w-3.5 h-3.5',
                isOverdue ? 'text-red-600' : 'text-orange-600'
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 font-medium mb-0.5">
                Due Date
              </p>
              <p className={cn(
                'text-sm font-semibold truncate',
                isOverdue ? 'text-red-600' : 'text-gray-900'
              )}>
                {formatDate(payment.due_date)}
              </p>
              {isOverdue && (
                <p className="text-xs text-red-600 font-medium">Overdue</p>
              )}
            </div>
          </div>

          {payment.payment_method && (
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-green-50 rounded border border-green-100">
                <CreditCard className="w-3.5 h-3.5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium mb-0.5">
                  Payment Method
                </p>
                <p className="text-sm font-semibold text-gray-900 capitalize truncate">
                  {payment.payment_method.replace('_', ' ')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions Section */}
        {isPending && (
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-3 border-t border-gray-200">
            <Button
              onClick={() => onSendEmail(payment)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              <Mail className="w-3.5 h-3.5 mr-1.5" />
              Send Email
            </Button>
            <Button
              onClick={() => onCopyUrl(payment.payment_url)}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copy URL
            </Button>
            <Button
              onClick={() => onMarkPaid(payment)}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Mark as Paid
            </Button>
            <Button
              onClick={() => onCancel(payment)}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto sm:ml-auto"
            >
              <Ban className="w-3.5 h-3.5 mr-1.5" />
              Cancel
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Create Payment Modal
// ============================================================================

interface CreatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function CreatePaymentModal({ isOpen, onClose }: CreatePaymentModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'search' | 'details'>('search');
  const [bookingSearch, setBookingSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [formData, setFormData] = useState<CreatePaymentForm>({
    booking_id: '',
    title: '',
    description: '',
    amount: '',
    due_date: '',
  });

  const debouncedBookingSearch = useDebounce(bookingSearch, 300);

  // Mock bookings data
  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings-search', debouncedBookingSearch],
    queryFn: async () => {
      if (!debouncedBookingSearch) return [];
      // TODO: Replace with real API call
      // const response = await api.bookings.search(debouncedBookingSearch);
      // return response.data;
      return [
        {
          id: '1',
          booking_id: 'ARCO-2024-001',
          guest_name: 'John Doe',
          guest_email: 'john@example.com',
          check_in_date: '2024-12-10',
          check_out_date: '2024-12-13',
          total_price: 900,
          nights: 3,
          status: 'confirmed',
        },
      ];
    },
    enabled: debouncedBookingSearch.length > 2,
  });

  const handleBookingSelect = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    setFormData((prev) => ({
      ...prev,
      booking_id: booking.id,
    }));
    setStep('details');
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedBooking || !formData.title || !formData.amount || !formData.due_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    // TODO: Implement create payment request
    toast.success('Payment request created successfully');
    queryClient.invalidateQueries({ queryKey: ['payments'] });
    onClose();

    // Reset form
    setStep('search');
    setBookingSearch('');
    setSelectedBooking(null);
    setFormData({
      booking_id: '',
      title: '',
      description: '',
      amount: '',
      due_date: '',
    });
  }, [selectedBooking, formData, onClose, queryClient]);

  const handleClose = useCallback(() => {
    setStep('search');
    setBookingSearch('');
    setSelectedBooking(null);
    setFormData({
      booking_id: '',
      title: '',
      description: '',
      amount: '',
      due_date: '',
    });
    onClose();
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Create Payment Request</DialogTitle>
          <DialogDescription className="text-gray-700">
            {step === 'search' ? 'Search and select a booking' : 'Enter payment details'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'search' ? (
            <>
              {/* Search Booking */}
              <div>
                <Label className="text-gray-900 font-medium">Search Booking</Label>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by booking reference, guest name, or email..."
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    className="pl-10 text-gray-900"
                  />
                </div>
              </div>

              {/* Booking Results */}
              {debouncedBookingSearch.length > 2 && (
                <div className="border border-gray-200 rounded-lg max-h-[400px] overflow-y-auto">
                  {bookings.length === 0 ? (
                    <div className="p-8 text-center text-gray-600">
                      No bookings found
                    </div>
                  ) : (
                    <div className="divide-y">
                      {bookings.map((booking) => (
                        <button
                          key={booking.id}
                          onClick={() => handleBookingSelect(booking)}
                          className="w-full p-4 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900">
                                  {booking.booking_id}
                                </span>
                                <Badge className="bg-blue-100 text-blue-800 text-xs">
                                  {booking.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-700">{booking.guest_name}</p>
                              <p className="text-xs text-gray-600">{booking.guest_email}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                {formatDate(booking.check_in_date)} - {formatDate(booking.check_out_date)} ({booking.nights} nights)
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">
                                {formatCurrency(booking.total_price)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Selected Booking Info */}
              {selectedBooking && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{selectedBooking.booking_id}</p>
                      <p className="text-sm text-gray-700">{selectedBooking.guest_name}</p>
                      <p className="text-xs text-gray-600">{selectedBooking.guest_email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStep('search');
                        setSelectedBooking(null);
                      }}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              )}

              {/* Payment Details Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-gray-900 font-medium">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g., Remaining Balance, Security Deposit"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="text-gray-900 mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-gray-900 font-medium">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Additional details about this payment"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="text-gray-900 mt-1.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount" className="text-gray-900 font-medium">
                      Amount <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative mt-1.5">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="pl-10 text-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="due_date" className="text-gray-900 font-medium">
                      Due Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="text-gray-900 mt-1.5"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {step === 'details' && (
            <Button onClick={handleSubmit} className="bg-blue-600">
              Create Payment Request
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Mark Paid Modal
// ============================================================================

interface MarkPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentRequest | null;
}

function MarkPaidModal({ isOpen, onClose, payment }: MarkPaidModalProps) {
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  const handleSubmit = useCallback(() => {
    if (!payment || !paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    // TODO: Implement mark as paid
    toast.success('Payment marked as paid');
    queryClient.invalidateQueries({ queryKey: ['payments'] });
    onClose();
    setPaymentMethod('');
  }, [payment, paymentMethod, onClose, queryClient]);

  const handleClose = useCallback(() => {
    setPaymentMethod('');
    onClose();
  }, [onClose]);

  if (!payment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-gray-900">Mark Payment as Paid</DialogTitle>
          <DialogDescription className="text-gray-700">
            How was this payment received?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Info */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="font-semibold text-gray-900 mb-1">{payment.title}</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
            <p className="text-sm text-gray-600 mt-1">{payment.booking_reference}</p>
          </div>

          {/* Payment Method Selection */}
          <div>
            <Label className="text-gray-900 font-medium">Payment Method <span className="text-red-500">*</span></Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select payment method" className="text-gray-900" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  return (
                    <SelectItem key={method.value} value={method.value} className="text-gray-900">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {method.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark as Paid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Cancel Payment Modal
// ============================================================================

interface CancelPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentRequest | null;
}

function CancelPaymentModal({ isOpen, onClose, payment }: CancelPaymentModalProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  const handleSubmit = useCallback(() => {
    if (!payment || !reason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    // TODO: Check user permissions
    // TODO: Implement cancel payment
    toast.success('Payment request cancelled');
    queryClient.invalidateQueries({ queryKey: ['payments'] });
    onClose();
    setReason('');
  }, [payment, reason, onClose, queryClient]);

  const handleClose = useCallback(() => {
    setReason('');
    onClose();
  }, [onClose]);

  if (!payment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-gray-900">Cancel Payment Request</DialogTitle>
          <DialogDescription className="text-gray-700">
            Why are you cancelling this payment request?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Info */}
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <p className="font-semibold text-gray-900 mb-1">{payment.title}</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
            <p className="text-sm text-gray-600 mt-1">{payment.booking_reference}</p>
          </div>

          {/* Cancellation Reason */}
          <div>
            <Label htmlFor="reason" className="text-gray-900 font-medium">
              Cancellation Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Explain why this payment is being cancelled..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="mt-1.5 text-gray-900"
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Warning</p>
                <p>This action cannot be undone. The guest will be notified that their payment request has been cancelled.</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Keep Payment Request
          </Button>
          <Button onClick={handleSubmit} variant="destructive">
            <Ban className="w-4 h-4 mr-2" />
            Cancel Payment Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
