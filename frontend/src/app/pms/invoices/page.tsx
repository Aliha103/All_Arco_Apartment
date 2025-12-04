'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Search,
  Building2,
  Receipt,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Download,
  Mail,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  FileCheck,
  CalendarDays,
  Euro,
  ChevronDown,
  X,
  Building,
  Globe,
  Phone,
  AtSign,
  Hash,
  MapPin,
  User,
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

// ============================================================================
// Types & Interfaces
// ============================================================================

interface Company {
  id: string;
  name: string;
  vat_number: string;
  sdi: string;
  tax_code?: string; // Codice Fiscale - optional
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
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issued_at: string;
  due_date: string;
  total_amount: string;
  created_at: string;
  updated_at: string;
}

interface Booking {
  id: string;
  booking_id: string;
  guest_name: string;
  guest_email: string;
  guest_tax_code?: string; // Codice Fiscale - optional
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  nights: number;
}

// Country list for dropdown
const COUNTRIES = [
  'Italy', 'United States', 'United Kingdom', 'Germany', 'France', 'Spain',
  'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Portugal', 'Greece',
  'Poland', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Ireland', 'Czech Republic',
  'Hungary', 'Romania', 'Bulgaria', 'Croatia', 'Slovenia', 'Slovakia', 'Other'
].sort();

// Status configurations
const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: FileText },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-800', icon: Mail },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-800', icon: Clock },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600', icon: XCircle },
};

// ============================================================================
// Main Component
// ============================================================================

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'invoices' | 'companies'>('invoices');

  // Search
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

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
  });

  // Fetch companies list
  const { data: companiesData, isLoading: companiesLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await api.companies.list();
      return response.data.results || response.data || [];
    },
    staleTime: 30000,
  });

  // ============================================================================
  // Computed Values
  // ============================================================================

  const invoices = useMemo(() => invoicesData || [], [invoicesData]);
  const companies = useMemo(() => companiesData || [], [companiesData]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice: Invoice) => {
      const matchesSearch = !debouncedSearch ||
        invoice.invoice_number?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        invoice.guest_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        invoice.guest_email?.toLowerCase().includes(debouncedSearch.toLowerCase());

      return matchesSearch;
    });
  }, [invoices, debouncedSearch]);

  // Statistics
  const totalInvoices = invoices.length || 0;
  const paidInvoices = invoices.filter((i: Invoice) => i.status === 'paid').length || 0;
  const pendingInvoices = invoices.filter((i: Invoice) => ['draft', 'sent'].includes(i.status)).length || 0;
  const totalRevenue = invoices.reduce((sum: number, i: Invoice) =>
    i.status === 'paid' ? sum + parseFloat(i.total_amount || '0') : sum, 0
  ) || 0;

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleClearFilters = () => {
    setSearch('');
  };

  const handleCreateInvoice = () => {
    setSelectedInvoice(null);
    setIsCreateModalOpen(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsCreateModalOpen(true);
  };

  const handleCreateCompany = () => {
    setSelectedCompany(null);
    setIsCompanyModalOpen(true);
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setIsCompanyModalOpen(true);
  };

  // ============================================================================
  // Render
  // ============================================================================

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
              Invoices
            </h1>
            <p className="text-sm text-gray-600 mt-1">Manage invoices and billing</p>
          </div>
        </div>
      </motion.div>

      {/* Statistics cards removed */}

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
              invoices={filteredInvoices}
              isLoading={invoicesLoading}
              search={search}
              setSearch={setSearch}
              onClearFilters={handleClearFilters}
              onCreate={handleCreateInvoice}
              onEdit={handleEditInvoice}
            />
          </TabsContent>

          {/* Companies Tab */}
          <TabsContent value="companies" className="space-y-4">
            <CompaniesTab
              companies={companies}
              isLoading={companiesLoading}
              onCreate={handleCreateCompany}
              onEdit={handleEditCompany}
            />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Create/Edit Invoice Modal */}
      <CreateInvoiceModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        companies={companies}
        onCompanyCreate={() => setIsCompanyModalOpen(true)}
      />

      {/* Create/Edit Company Modal */}
      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => {
          setIsCompanyModalOpen(false);
          setSelectedCompany(null);
        }}
        company={selectedCompany}
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
  onClearFilters: () => void;
  onCreate: () => void;
  onEdit: (invoice: Invoice) => void;
}

function InvoicesTab({
  invoices,
  isLoading,
  search,
  setSearch,
  onClearFilters,
  onCreate,
  onEdit,
}: InvoicesTabProps) {
  return (
    <Card className="border border-gray-200 shadow">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg text-gray-900">All Invoices ({invoices.length})</CardTitle>
            <CardDescription>View and manage all invoices and receipts</CardDescription>
          </div>
          <Button onClick={onCreate} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
          </Button>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by invoice number or guest name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
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
            <Button onClick={onCreate} className="bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Guest/Company</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Amount</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {invoices.map((invoice: Invoice, index: number) => (
                      <InvoiceRow key={invoice.id} invoice={invoice} onEdit={onEdit} index={index} />
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y">
              <AnimatePresence mode="popLayout">
                {invoices.map((invoice: Invoice, index: number) => (
                  <InvoiceCard key={invoice.id} invoice={invoice} onEdit={onEdit} index={index} />
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
  onEdit: (invoice: Invoice) => void;
  index: number;
}

function InvoiceRow({ invoice, onEdit, index }: InvoiceRowProps) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className="border-b hover:bg-gray-50 transition-colors"
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
        <Badge className="bg-gray-100 text-gray-800 border text-xs font-semibold capitalize">
          {invoice.type || 'receipt'}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm">
          <div className="font-medium text-gray-900">{formatDate(invoice.issued_at)}</div>
          {invoice.due_date && (
            <div className="text-gray-600 text-xs">Due: {formatDate(invoice.due_date)}</div>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="font-bold text-sm text-gray-900">{formatCurrency(parseFloat(invoice.total_amount || '0'))}</span>
      </td>
      <td className="px-4 py-3">
        <InvoiceActions invoice={invoice} onEdit={onEdit} />
      </td>
    </motion.tr>
  );
}

// ============================================================================
// Invoice Card Component (Mobile)
// ============================================================================

function InvoiceCard({ invoice, onEdit, index }: InvoiceRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className="p-4 hover:bg-gray-50"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm text-gray-900">{invoice.invoice_number}</span>
          <InvoiceActions invoice={invoice} onEdit={onEdit} />
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
            <p className="font-bold text-gray-900">{formatCurrency(parseFloat(invoice.total_amount || '0'))}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-gray-100 text-gray-800 border text-xs font-semibold capitalize">
            {invoice.type || 'receipt'}
          </Badge>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Invoice Actions Component
// ============================================================================

interface InvoiceActionsProps {
  invoice: Invoice;
  onEdit: (invoice: Invoice) => void;
}

function InvoiceActions({ invoice, onEdit }: InvoiceActionsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState(invoice.guest_email || '');
  const [useCustomEmail, setUseCustomEmail] = useState(false);

  const downloadPDF = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.invoices.downloadPDF(id);
      // Create blob and download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoice.invoice_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
  });

  const sendEmail = useMutation({
    mutationFn: async ({ id, email }: { id: string; email: string }) => {
      await api.invoices.sendEmail(id, { email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-invoices'] });
      setIsEmailDialogOpen(false);
      alert('Invoice sent successfully');
    },
    onError: () => {
      alert('Failed to send invoice email');
    },
  });

  const handleSendEmail = () => {
    if (!emailAddress || !emailAddress.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    sendEmail.mutate({ id: invoice.id, email: emailAddress });
  };

  const handleOpenEmailDialog = () => {
    // Reset to guest email when opening dialog
    setEmailAddress(invoice.guest_email || '');
    setUseCustomEmail(false);
    setIsEmailDialogOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="w-4 h-4 text-gray-700" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/pms/invoices/${invoice.id}`)}>
            <Eye className="w-4 h-4 mr-2 text-gray-700" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => downloadPDF.mutate(invoice.id)}>
            <Download className="w-4 h-4 mr-2 text-gray-700" />
            Download PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenEmailDialog}>
            <Mail className="w-4 h-4 mr-2 text-gray-700" />
            Send Email
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onEdit(invoice)}>
            <Edit className="w-4 h-4 mr-2 text-gray-700" />
            Edit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Email Selection Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Invoice via Email</DialogTitle>
            <DialogDescription>
              Choose the email address to send {invoice.invoice_number} to
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Guest Email Option */}
            {invoice.guest_email && (
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="guest-email"
                  name="email-option"
                  checked={!useCustomEmail}
                  onChange={() => {
                    setUseCustomEmail(false);
                    setEmailAddress(invoice.guest_email);
                  }}
                  className="w-4 h-4 text-blue-600"
                />
                <label htmlFor="guest-email" className="flex-1 cursor-pointer">
                  <div className="font-medium text-gray-900">Guest Email</div>
                  <div className="text-sm text-gray-600">{invoice.guest_email}</div>
                </label>
              </div>
            )}

            {/* Custom Email Option */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="custom-email"
                  name="email-option"
                  checked={useCustomEmail}
                  onChange={() => setUseCustomEmail(true)}
                  className="w-4 h-4 text-blue-600"
                />
                <label htmlFor="custom-email" className="font-medium text-gray-900 cursor-pointer">
                  Send to different email
                </label>
              </div>
              {useCustomEmail && (
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="ml-6"
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEmailDialogOpen(false)}
            >
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
// Companies Tab Component
// ============================================================================

interface CompaniesTabProps {
  companies: Company[];
  isLoading: boolean;
  onCreate: () => void;
  onEdit: (company: Company) => void;
}

function CompaniesTab({ companies, isLoading, onCreate, onEdit }: CompaniesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filteredCompanies = useMemo(() => {
    return companies.filter((company: Company) =>
      !debouncedSearchTerm ||
      company.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      company.vat_number.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [companies, debouncedSearchTerm]);

  return (
    <Card className="border border-gray-200 shadow">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg text-gray-900">Companies ({companies.length})</CardTitle>
            <CardDescription>Manage registered companies</CardDescription>
          </div>
          <Button onClick={onCreate} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Register Company
          </Button>
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-600 mt-4">Loading companies...</p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No companies registered</h3>
            <p className="text-sm text-gray-600 mb-6">
              {searchTerm ? 'No companies match your search' : 'Register your first company to issue invoices'}
            </p>
            <Button onClick={onCreate} className="bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Register Company
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            <AnimatePresence mode="popLayout">
              {filteredCompanies.map((company: Company, index: number) => (
                <CompanyCard key={company.id} company={company} onEdit={onEdit} index={index} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Company Card Component
// ============================================================================

interface CompanyCardProps {
  company: Company;
  onEdit: (company: Company) => void;
  index: number;
}

function CompanyCard({ company, onEdit, index }: CompanyCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className="p-4 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-lg bg-blue-100 flex-shrink-0">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1">{company.name}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                <span className="truncate">VAT: {company.vat_number}</span>
              </div>
              {company.tax_code && (
                <div className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  <span className="truncate">Tax Code: {company.tax_code}</span>
                </div>
              )}
              {company.sdi && (
                <div className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span className="truncate">SDI: {company.sdi}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{company.country}</span>
              </div>
              <div className="flex items-center gap-1">
                <AtSign className="w-3 h-3" />
                <span className="truncate">{company.email}</span>
              </div>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(company)}
          className="flex-shrink-0"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Create Invoice Modal Component
// ============================================================================

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  companies: Company[];
  onCompanyCreate: () => void;
}

function CreateInvoiceModal({ isOpen, onClose, invoice, companies, onCompanyCreate }: CreateInvoiceModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'booking' | 'type' | 'company' | 'details'>('booking');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [invoiceType, setInvoiceType] = useState<'invoice' | 'receipt'>('receipt');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [bookingSearch, setBookingSearch] = useState('');

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

  const bookings = useMemo(() => bookingsData || [], [bookingsData]);

  const handleSelectBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setStep('type');
  };

  const handleSelectType = (type: 'invoice' | 'receipt') => {
    setInvoiceType(type);
    if (type === 'invoice') {
      setStep('company');
    } else {
      setStep('details');
    }
  };

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    setStep('details');
  };

  const createInvoice = useMutation({
    mutationFn: async (data: any) => {
      await api.invoices.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-invoices'] });
      onClose();
      resetModal();
    },
  });

  const handleSubmit = () => {
    if (!selectedBooking) return;

    const data: any = {
      booking: selectedBooking.id,
      type: invoiceType,
      amount: selectedBooking.total_price,
    };

    if (invoiceType === 'invoice' && selectedCompany) {
      data.company = selectedCompany.id;
    }

    createInvoice.mutate(data);
  };

  const resetModal = () => {
    setStep('booking');
    setSelectedBooking(null);
    setInvoiceType('receipt');
    setSelectedCompany(null);
    setBookingSearch('');
  };

  const handleClose = () => {
    onClose();
    resetModal();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'booking' && 'Select Booking'}
            {step === 'type' && 'Select Document Type'}
            {step === 'company' && 'Select Company'}
            {step === 'details' && 'Confirm Details'}
          </DialogTitle>
          <DialogDescription>
            {step === 'booking' && 'Search for the booking to create an invoice'}
            {step === 'type' && 'Choose between invoice or receipt'}
            {step === 'company' && 'Select a company or register a new one'}
            {step === 'details' && 'Review and confirm invoice details'}
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
                    placeholder="Search by name, email, or confirmation code..."
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {bookingsLoading && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              )}

              {!bookingsLoading && bookings.length === 0 && bookingSearch && (
                <div className="text-center py-8 text-gray-600">
                  No bookings found
                </div>
              )}

              <div className="space-y-2">
                {bookings.map((booking: Booking) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 border rounded-lg hover:border-blue-600 cursor-pointer transition-colors"
                    onClick={() => handleSelectBooking(booking)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{booking.guest_name}</p>
                        <p className="text-sm text-gray-600">{booking.guest_email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(booking.check_in_date)} - {formatDate(booking.check_out_date)} ({booking.nights}N)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(booking.total_price)}</p>
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
                <p className="text-sm text-gray-600">{formatCurrency(selectedBooking.total_price)}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-6 border-2 rounded-lg cursor-pointer hover:border-blue-600 transition-colors"
                  onClick={() => handleSelectType('receipt')}
                >
                  <Receipt className="w-8 h-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Receipt</h3>
                  <p className="text-sm text-gray-600">Generate a simple receipt for this booking</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-6 border-2 rounded-lg cursor-pointer hover:border-blue-600 transition-colors"
                  onClick={() => handleSelectType('invoice')}
                >
                  <FileText className="w-8 h-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Invoice</h3>
                  <p className="text-sm text-gray-600">Create an invoice for a company</p>
                </motion.div>
              </div>
            </div>
          )}

          {/* Step 3: Company Selection (for invoices) */}
          {step === 'company' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Select Company</Label>
                <Button variant="outline" size="sm" onClick={onCompanyCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Company
                </Button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {companies.length === 0 ? (
                  <div className="text-center py-8 text-gray-600">
                    No companies registered. Click "New Company" to add one.
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

          {/* Step 4: Details & Confirmation */}
          {step === 'details' && selectedBooking && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div>
                  <p className="text-xs text-gray-600">Document Type</p>
                  <p className="font-semibold text-gray-900 capitalize">{invoiceType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Guest</p>
                  <p className="font-semibold text-gray-900">{selectedBooking.guest_name}</p>
                  <p className="text-sm text-gray-600">{selectedBooking.guest_email}</p>
                  {selectedBooking.guest_tax_code && (
                    <p className="text-xs text-gray-600">Tax Code: {selectedBooking.guest_tax_code}</p>
                  )}
                </div>
                {selectedCompany && (
                  <div>
                    <p className="text-xs text-gray-600">Company</p>
                    <p className="font-semibold text-gray-900">{selectedCompany.name}</p>
                    <p className="text-sm text-gray-600">VAT: {selectedCompany.vat_number}</p>
                    {selectedCompany.tax_code && (
                      <p className="text-xs text-gray-600">Tax Code: {selectedCompany.tax_code}</p>
                    )}
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-600">Stay Period</p>
                  <p className="font-semibold text-gray-900">
                    {formatDate(selectedBooking.check_in_date)} - {formatDate(selectedBooking.check_out_date)}
                  </p>
                  <p className="text-sm text-gray-600">{selectedBooking.nights} night(s)</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Amount</p>
                  <p className="font-bold text-lg text-gray-900">{formatCurrency(selectedBooking.total_price)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center gap-2 w-full justify-between">
            <Button variant="outline" onClick={step === 'booking' ? handleClose : () => setStep('booking')}>
              {step === 'booking' ? 'Cancel' : 'Back'}
            </Button>
            {step === 'details' && (
              <Button
                onClick={handleSubmit}
                disabled={createInvoice.isPending}
                className="bg-blue-600"
              >
                {createInvoice.isPending ? 'Creating...' : 'Create ' + (invoiceType === 'invoice' ? 'Invoice' : 'Receipt')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Company Modal Component
// ============================================================================

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
}

function CompanyModal({ isOpen, onClose, company }: CompanyModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    vat_number: '',
    sdi: '',
    tax_code: '',
    address: '',
    country: '',
    email: '',
    phone: '',
    website: '',
  });

  // Update form when company changes or modal opens
  const handleFormUpdate = useCallback(() => {
    if (isOpen) {
      if (company) {
        setFormData({
          name: company.name || '',
          vat_number: company.vat_number || '',
          sdi: company.sdi || '',
          tax_code: company.tax_code || '',
          address: company.address || '',
          country: company.country || '',
          email: company.email || '',
          phone: company.phone || '',
          website: company.website || '',
        });
      } else {
        setFormData({
          name: '',
          vat_number: '',
          sdi: '',
          tax_code: '',
          address: '',
          country: '',
          email: '',
          phone: '',
          website: '',
        });
      }
    }
  }, [isOpen, company]);

  // Call handleFormUpdate when modal opens or company changes
  useState(handleFormUpdate);

  const saveCompany = useMutation({
    mutationFn: async (data: any) => {
      if (company?.id) {
        await api.companies.update(company.id, data);
      } else {
        await api.companies.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveCompany.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{company ? 'Edit Company' : 'Register New Company'}</DialogTitle>
          <DialogDescription>
            {company ? 'Update company information' : 'Add a new company to issue invoices'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="name">
                Company Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Acme Corporation"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="vat">
                VAT Number <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="vat"
                  value={formData.vat_number}
                  onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                  placeholder="IT12345678901"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="sdi">SDI Code</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="sdi"
                  value={formData.sdi}
                  onChange={(e) => setFormData({ ...formData, sdi: e.target.value })}
                  placeholder="ABCDEFG"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tax_code">Tax Code (Codice Fiscale)</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="tax_code"
                  value={formData.tax_code}
                  onChange={(e) => setFormData({ ...formData, tax_code: e.target.value })}
                  placeholder="RSSMRA80A01H501U"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="address">
                Address <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Business Street, City, Postal Code"
                  className="pl-10"
                  rows={2}
                  required
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="country">
                Country <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.country}
                onValueChange={(value) => setFormData({ ...formData, country: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@company.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+39 123 456 7890"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="website">Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://www.company.com"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveCompany.isPending} className="bg-blue-600">
              {saveCompany.isPending ? 'Saving...' : company ? 'Update Company' : 'Register Company'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
