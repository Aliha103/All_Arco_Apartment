'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Search,
  Building2,
  Receipt,
  MoreHorizontal,
  Eye,
  Download,
  Mail,
  Trash2,
  X,
  Calendar,
  DollarSign,
  ShoppingCart,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { CompanyManagement } from './components/CompanyManagement';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface Company {
  id: string;
  name: string;
  vat_number: string;
  sdi: string;
  tax_code?: string;
  address: string;
  country: string;
  email: string;
  phone: string;
  website?: string;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  booking: string;
  booking_id: string;
  guest_name: string;
  guest_email: string;
  company_id?: string;
  company_name?: string;
  type: 'invoice' | 'receipt';
  issued_at: string;
  due_date?: string;
  total_amount: string;
  line_items: LineItem[];
  created_at: string;
  updated_at: string;
}

interface Booking {
  id: string;
  booking_id: string;
  guest_name: string;
  guest_email: string;
  guest_tax_code?: string;
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  nightly_rate: number;
  nights: number;
  cleaning_fee: number;
  tourist_tax: number;
}

interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total: number;
}

// ============================================================================
// Main Component
// ============================================================================

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'invoices' | 'companies'>('invoices');
  const { hasPermission, isSuperAdmin } = useAuthStore();

  // Permissions
  const canView = hasPermission('invoices.view') || isSuperAdmin();
  const canCreate = hasPermission('invoices.create') || isSuperAdmin();
  const canDelete = hasPermission('invoices.delete') || isSuperAdmin();

  // Search
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  // Fetch invoices list
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['all-invoices', debouncedSearch],
    queryFn: async () => {
      const params: any = {};
      if (debouncedSearch) params.search = debouncedSearch;
      const response = await api.invoices.list(params);
      return response.data.results || response.data || [];
    },
    staleTime: 10000,
    enabled: canView,
  });

  const invoices = useMemo(() => invoicesData || [], [invoicesData]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleCreateInvoice = () => {
    if (!canCreate) {
      toast.error('You do not have permission to create invoices');
      return;
    }
    setIsCreateModalOpen(true);
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (!canView) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-sm text-gray-600">
              You do not have permission to view invoices
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-7 h-7 text-blue-600" />
              Invoices & Receipts
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Create and manage invoices for bookings
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="invoices" className="gap-2">
              <Receipt className="w-4 h-4" />
              Invoices/Receipts
            </TabsTrigger>
            <TabsTrigger value="companies" className="gap-2">
              <Building2 className="w-4 h-4" />
              Companies
            </TabsTrigger>
          </TabsList>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-4">
            <InvoicesTab
              invoices={invoices}
              isLoading={invoicesLoading}
              search={search}
              setSearch={setSearch}
              onCreate={handleCreateInvoice}
              canCreate={canCreate}
              canDelete={canDelete}
            />
          </TabsContent>

          {/* Companies Tab */}
          <TabsContent value="companies" className="space-y-4">
            <CompanyManagement />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Create Invoice Modal */}
      <CreateInvoiceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}

// ============================================================================
// Invoices Tab Component
// ============================================================================

interface InvoicesTabProps {
  invoices: Invoice[];
  isLoading: boolean;
  search: string;
  setSearch: (value: string) => void;
  onCreate: () => void;
  canCreate: boolean;
  canDelete: boolean;
}

function InvoicesTab({
  invoices,
  isLoading,
  search,
  setSearch,
  onCreate,
  canCreate,
  canDelete,
}: InvoicesTabProps) {
  return (
    <Card className="border border-gray-200 shadow">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg text-gray-900">
              All Invoices ({invoices.length})
            </CardTitle>
            <CardDescription>View and manage all invoices and receipts</CardDescription>
          </div>
          {canCreate && (
            <Button onClick={onCreate} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice/Receipt
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by invoice number or guest name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-600 mt-4">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No invoices yet</h3>
            <p className="text-sm text-gray-600 mb-6">
              {search ? 'No invoices match your search' : 'Get started by creating your first invoice'}
            </p>
            {canCreate && (
              <Button onClick={onCreate} className="bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                      Invoice #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                      Guest/Company
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                      Amount
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {invoices.map((invoice: Invoice, index: number) => (
                      <InvoiceRow
                        key={invoice.id}
                        invoice={invoice}
                        index={index}
                        canDelete={canDelete}
                      />
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y">
              <AnimatePresence mode="popLayout">
                {invoices.map((invoice: Invoice, index: number) => (
                  <InvoiceCard
                    key={invoice.id}
                    invoice={invoice}
                    index={index}
                    canDelete={canDelete}
                  />
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Invoice Row Component (Desktop)
// ============================================================================

interface InvoiceRowProps {
  invoice: Invoice;
  index: number;
  canDelete: boolean;
}

function InvoiceRow({ invoice, index, canDelete }: InvoiceRowProps) {
  const router = useRouter();

  return (
    <motion.tr
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={() => router.push(`/pms/invoices/${invoice.id}`)}
    >
      <td className="px-4 py-3">
        <span className="font-semibold text-sm text-gray-900">{invoice.invoice_number}</span>
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-sm text-gray-900">{invoice.guest_name}</p>
          {invoice.company_name && (
            <p className="text-xs text-gray-600">{invoice.company_name}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge
          className={`border text-xs font-semibold capitalize ${
            invoice.type === 'invoice'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-green-100 text-green-800'
          }`}
        >
          {invoice.type}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-gray-900">{formatDate(invoice.issued_at)}</div>
      </td>
      <td className="px-4 py-3">
        <span className="font-bold text-sm text-gray-900">
          {formatCurrency(parseFloat(invoice.total_amount || '0'))}
        </span>
      </td>
      <td className="px-4 py-3">
        <InvoiceActions invoice={invoice} canDelete={canDelete} />
      </td>
    </motion.tr>
  );
}

// ============================================================================
// Invoice Card Component (Mobile)
// ============================================================================

function InvoiceCard({ invoice, index, canDelete }: InvoiceRowProps) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className="p-4 hover:bg-gray-50 cursor-pointer"
      onClick={() => router.push(`/pms/invoices/${invoice.id}`)}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm text-gray-900">{invoice.invoice_number}</span>
          <InvoiceActions invoice={invoice} canDelete={canDelete} />
        </div>

        <div>
          <p className="font-semibold text-sm text-gray-900">{invoice.guest_name}</p>
          {invoice.company_name && (
            <p className="text-xs text-gray-600">{invoice.company_name}</p>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="text-xs text-gray-600">Issue Date</p>
            <p className="font-medium text-gray-900">{formatDate(invoice.issued_at)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600">Amount</p>
            <p className="font-bold text-gray-900">
              {formatCurrency(parseFloat(invoice.total_amount || '0'))}
            </p>
          </div>
        </div>

        <Badge
          className={`border text-xs font-semibold capitalize ${
            invoice.type === 'invoice'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-green-100 text-green-800'
          }`}
        >
          {invoice.type}
        </Badge>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Invoice Actions Component
// ============================================================================

interface InvoiceActionsProps {
  invoice: Invoice;
  canDelete: boolean;
}

function InvoiceActions({ invoice, canDelete }: InvoiceActionsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState(invoice.guest_email || '');

  const downloadPDF = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.invoices.downloadPDF(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoice.invoice_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
    onError: () => {
      toast.error('Failed to download PDF');
    },
  });

  const sendEmail = useMutation({
    mutationFn: async ({ id, email }: { id: string; email: string }) => {
      await api.invoices.sendEmail(id, { email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-invoices'] });
      setIsEmailDialogOpen(false);
      toast.success('Invoice sent successfully from support@allarcoapartment.com');
    },
    onError: () => {
      toast.error('Failed to send invoice email');
    },
  });

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      await api.invoices.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-invoices'] });
      toast.success('Invoice deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete invoice');
    },
  });

  const handleSendEmail = () => {
    if (!emailAddress || !emailAddress.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    sendEmail.mutate({ id: invoice.id, email: emailAddress });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      deleteInvoice.mutate(invoice.id);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="w-4 h-4 text-gray-700" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => router.push(`/pms/invoices/${invoice.id}`)}>
            <Eye className="w-4 h-4 mr-2 text-gray-700" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => downloadPDF.mutate(invoice.id)}>
            <Download className="w-4 h-4 mr-2 text-gray-700" />
            Download PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsEmailDialogOpen(true)}>
            <Mail className="w-4 h-4 mr-2 text-gray-700" />
            Send Email
          </DropdownMenuItem>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Invoice
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Send Invoice via Email</DialogTitle>
            <DialogDescription>
              Invoice will be sent from support@allarcoapartment.com
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Recipient Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={sendEmail.isPending || !emailAddress}
              className="bg-blue-600"
            >
              {sendEmail.isPending ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// Create Invoice Modal Component
// ============================================================================

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function CreateInvoiceModal({ isOpen, onClose }: CreateInvoiceModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'booking' | 'type' | 'company' | 'items' | 'preview'>(
    'booking'
  );
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [invoiceType, setInvoiceType] = useState<'invoice' | 'receipt'>('receipt');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState('');
  const [bookingSearch, setBookingSearch] = useState('');
  const [dueDate, setDueDate] = useState('');

  const debouncedBookingSearch = useDebounce(bookingSearch, 300);

  // Search bookings
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings-search', debouncedBookingSearch],
    queryFn: async () => {
      if (!debouncedBookingSearch) return [];
      const params: any = { search: debouncedBookingSearch };
      const response = await api.bookings.list(params);
      return response.data.results || response.data || [];
    },
    enabled: isOpen && step === 'booking' && debouncedBookingSearch.length > 0,
  });

  // Fetch companies
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await api.companies.list();
      return response.data.results || response.data || [];
    },
    enabled: isOpen && step === 'company',
  });

  const bookings = useMemo(() => bookingsData || [], [bookingsData]);
  const companies = useMemo(() => companiesData || [], [companiesData]);

  const createInvoice = useMutation({
    mutationFn: async (data: any) => {
      await api.invoices.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-invoices'] });
      toast.success('Invoice created successfully');
      onClose();
      resetModal();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.booking?.[0] || 'Failed to create invoice';
      toast.error(message);
    },
  });

  const handleSelectBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    // Auto-populate line items from booking
    const items: LineItem[] = [
      {
        description: `Accommodation (${booking.nights} night${booking.nights > 1 ? 's' : ''})`,
        quantity: booking.nights,
        unit_price: booking.nightly_rate,
        tax_rate: 0,
        total: booking.nightly_rate * booking.nights,
      },
    ];
    if (booking.cleaning_fee > 0) {
      items.push({
        description: 'Cleaning Fee',
        quantity: 1,
        unit_price: booking.cleaning_fee,
        tax_rate: 0,
        total: booking.cleaning_fee,
      });
    }
    if (booking.tourist_tax > 0) {
      items.push({
        description: 'Tourist Tax',
        quantity: 1,
        unit_price: booking.tourist_tax,
        tax_rate: 0,
        total: booking.tourist_tax,
      });
    }
    setLineItems(items);
    setStep('type');
  };

  const handleSelectType = (type: 'invoice' | 'receipt') => {
    setInvoiceType(type);
    if (type === 'invoice') {
      setStep('company');
    } else {
      setStep('items');
    }
  };

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    setStep('items');
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        description: '',
        quantity: 1,
        unit_price: 0,
        tax_rate: 0,
        total: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Recalculate total
    const quantity = updatedItems[index].quantity;
    const unitPrice = updatedItems[index].unit_price;
    const taxRate = updatedItems[index].tax_rate;
    const subtotal = quantity * unitPrice;
    const tax = subtotal * (taxRate / 100);
    updatedItems[index].total = subtotal + tax;

    setLineItems(updatedItems);
  };

  const calculateGrandTotal = () => {
    return lineItems.reduce((sum, item) => {
      const total = typeof item.total === 'number' && !isNaN(item.total) ? item.total : 0;
      return sum + total;
    }, 0);
  };

  const handleSubmit = () => {
    if (!selectedBooking || lineItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    const data: any = {
      booking: selectedBooking.id,
      type: invoiceType,
      line_items: lineItems,
      notes,
    };

    if (invoiceType === 'invoice' && selectedCompany) {
      data.company = selectedCompany.id;
    }

    if (dueDate) {
      data.due_date = dueDate;
    }

    createInvoice.mutate(data);
  };

  const resetModal = () => {
    setStep('booking');
    setSelectedBooking(null);
    setInvoiceType('receipt');
    setSelectedCompany(null);
    setLineItems([]);
    setNotes('');
    setBookingSearch('');
    setDueDate('');
  };

  const handleClose = () => {
    onClose();
    setTimeout(resetModal, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === 'booking' && 'Select Booking'}
            {step === 'type' && 'Select Document Type'}
            {step === 'company' && 'Select Company'}
            {step === 'items' && 'Add Line Items'}
            {step === 'preview' && 'Review & Create'}
          </DialogTitle>
          <DialogDescription>
            {step === 'booking' && 'Search for the booking to create an invoice/receipt'}
            {step === 'type' && 'Choose between invoice (for company) or receipt (for guest)'}
            {step === 'company' && 'Select a company to invoice'}
            {step === 'items' && 'Add, edit, or remove line items for this invoice'}
            {step === 'preview' && 'Review invoice details before creating'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Booking Search */}
          {step === 'booking' && (
            <div className="space-y-4">
              <div>
                <Label>Search Booking</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by guest name, email, or booking ID..."
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>

              {bookingsLoading && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              )}

              {!bookingsLoading && bookings.length === 0 && bookingSearch && (
                <div className="text-center py-8 text-gray-600">No bookings found</div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {bookings.map((booking: Booking) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 border rounded-lg hover:border-blue-600 cursor-pointer transition-colors"
                    onClick={() => handleSelectBooking(booking)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{booking.guest_name}</p>
                        <p className="text-sm text-gray-600">{booking.guest_email}</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {formatDate(booking.check_in_date)} - {formatDate(booking.check_out_date)}{' '}
                          ({booking.nights}N)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {formatCurrency(booking.total_price)}
                        </p>
                        <p className="text-xs text-gray-600">{booking.booking_id}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Type Selection */}
          {step === 'type' && selectedBooking && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Selected Booking</p>
                <p className="font-semibold text-gray-900">{selectedBooking.guest_name}</p>
                <p className="text-sm text-gray-600">
                  {formatCurrency(selectedBooking.total_price)}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-6 border-2 rounded-lg cursor-pointer hover:border-blue-600 transition-colors"
                  onClick={() => handleSelectType('receipt')}
                >
                  <Receipt className="w-8 h-8 text-green-600 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Receipt</h3>
                  <p className="text-sm text-gray-600">
                    Generate a receipt for the guest
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-6 border-2 rounded-lg cursor-pointer hover:border-blue-600 transition-colors"
                  onClick={() => handleSelectType('invoice')}
                >
                  <FileText className="w-8 h-8 text-purple-600 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Invoice</h3>
                  <p className="text-sm text-gray-600">
                    Create an invoice for a company
                  </p>
                </motion.div>
              </div>
            </div>
          )}

          {/* Step 3: Company Selection (for invoices) */}
          {step === 'company' && (
            <div className="space-y-4">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {companies.length === 0 ? (
                  <div className="text-center py-8 text-gray-600">
                    No companies registered. Please register a company first.
                  </div>
                ) : (
                  companies.map((company: Company) => (
                    <motion.div
                      key={company.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 border rounded-lg hover:border-blue-600 cursor-pointer transition-colors"
                      onClick={() => handleSelectCompany(company)}
                    >
                      <p className="font-semibold text-gray-900">{company.name}</p>
                      <p className="text-sm text-gray-600">VAT: {company.vat_number}</p>
                      <p className="text-xs text-gray-500">{company.country}</p>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Step 4: Line Items */}
          {step === 'items' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Line Items</Label>
                <Button type="button" onClick={addLineItem} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg bg-gray-50 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-3">
                        <div>
                          <Label className="text-xs">Description</Label>
                          <Input
                            placeholder="Item description"
                            value={item.description}
                            onChange={(e) =>
                              updateLineItem(index, 'description', e.target.value)
                            }
                          />
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateLineItem(index, 'quantity', parseFloat(e.target.value) || 1)
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Unit Price (€)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) =>
                                updateLineItem(
                                  index,
                                  'unit_price',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Tax %</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={item.tax_rate}
                              onChange={(e) =>
                                updateLineItem(index, 'tax_rate', parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Total (€)</Label>
                            <Input
                              type="text"
                              value={typeof item.total === 'number' && !isNaN(item.total) ? item.total.toFixed(2) : '0.00'}
                              disabled
                              className="bg-gray-100"
                            />
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">Grand Total</span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatCurrency(calculateGrandTotal())}
                  </span>
                </div>
              </div>

              {invoiceType === 'invoice' && (
                <div>
                  <Label>Due Date (Optional)</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              )}

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Add any additional notes or payment instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center gap-2 w-full justify-between">
            <Button
              variant="outline"
              onClick={() => {
                if (step === 'booking') {
                  handleClose();
                } else if (step === 'type') {
                  setStep('booking');
                } else if (step === 'company') {
                  setStep('type');
                } else if (step === 'items') {
                  if (invoiceType === 'invoice') {
                    setStep('company');
                  } else {
                    setStep('type');
                  }
                }
              }}
            >
              {step === 'booking' ? 'Cancel' : 'Back'}
            </Button>
            {step === 'items' && (
              <Button
                onClick={handleSubmit}
                disabled={createInvoice.isPending || lineItems.length === 0}
                className="bg-blue-600"
              >
                {createInvoice.isPending ? 'Creating...' : `Create ${invoiceType === 'invoice' ? 'Invoice' : 'Receipt'}`}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
