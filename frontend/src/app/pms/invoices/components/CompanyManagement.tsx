'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Hash,
  FileText,
  MapPin,
  AtSign,
  Phone,
  Globe,
  Building,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

// ============================================================================
// Types
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

// Country list for dropdown
const COUNTRIES = [
  'Italy',
  'United States',
  'United Kingdom',
  'Germany',
  'France',
  'Spain',
  'Netherlands',
  'Belgium',
  'Switzerland',
  'Austria',
  'Portugal',
  'Greece',
  'Poland',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Ireland',
  'Czech Republic',
  'Hungary',
  'Romania',
  'Bulgaria',
  'Croatia',
  'Slovenia',
  'Slovakia',
  'Other',
].sort();

// ============================================================================
// Main Component
// ============================================================================

export function CompanyManagement() {
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = useAuthStore();

  const canCreate = hasPermission('invoices.create') || isSuperAdmin();
  const canEdit = hasPermission('invoices.edit') || isSuperAdmin();
  const canDelete = hasPermission('invoices.delete') || isSuperAdmin();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Fetch companies
  const { data: companiesData, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await api.companies.list();
      return response.data.results || response.data || [];
    },
    staleTime: 30000,
  });

  const companies = useMemo(() => companiesData || [], [companiesData]);

  const filteredCompanies = useMemo(() => {
    return companies.filter(
      (company: Company) =>
        !debouncedSearchTerm ||
        company.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        company.vat_number.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [companies, debouncedSearchTerm]);

  const handleCreate = () => {
    if (!canCreate) {
      toast.error('You do not have permission to create companies');
      return;
    }
    setSelectedCompany(null);
    setIsModalOpen(true);
  };

  const handleEdit = (company: Company) => {
    if (!canEdit) {
      toast.error('You do not have permission to edit companies');
      return;
    }
    setSelectedCompany(company);
    setIsModalOpen(true);
  };

  const deleteCompany = useMutation({
    mutationFn: async (id: string) => {
      await api.companies.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Company deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete company');
    },
  });

  const handleDelete = (company: Company) => {
    if (!canDelete) {
      toast.error('You do not have permission to delete companies');
      return;
    }
    if (
      confirm(
        `Are you sure you want to delete "${company.name}"? This action cannot be undone.`
      )
    ) {
      deleteCompany.mutate(company.id);
    }
  };

  return (
    <>
      <Card className="border border-gray-200 shadow">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg text-gray-900">
                Companies ({companies.length})
              </CardTitle>
              <CardDescription>Manage registered companies for invoicing</CardDescription>
            </div>
            {canCreate && (
              <Button
                onClick={handleCreate}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Register Company
              </Button>
            )}
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No companies registered
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {searchTerm
                  ? 'No companies match your search'
                  : 'Register your first company to issue invoices'}
              </p>
              {canCreate && (
                <Button onClick={handleCreate} className="bg-blue-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Register Company
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              <AnimatePresence mode="popLayout">
                {filteredCompanies.map((company: Company, index: number) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    index={index}
                    canEdit={canEdit}
                    canDelete={canDelete}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company Modal */}
      <CompanyModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCompany(null);
        }}
        company={selectedCompany}
      />
    </>
  );
}

// ============================================================================
// Company Card Component
// ============================================================================

interface CompanyCardProps {
  company: Company;
  onEdit: (company: Company) => void;
  onDelete: (company: Company) => void;
  index: number;
  canEdit: boolean;
  canDelete: boolean;
}

function CompanyCard({
  company,
  onEdit,
  onDelete,
  index,
  canEdit,
  canDelete,
}: CompanyCardProps) {
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
              {company.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  <span className="truncate">{company.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(company)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(company)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
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
  useState(() => {
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
  });

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
      toast.success(company ? 'Company updated successfully' : 'Company registered successfully');
      onClose();
    },
    onError: () => {
      toast.error('Failed to save company');
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
              <Label htmlFor="sdi">
                SDI Code <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="sdi"
                  value={formData.sdi}
                  onChange={(e) => setFormData({ ...formData, sdi: e.target.value })}
                  placeholder="ABCDEFG"
                  className="pl-10"
                  required
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
              {saveCompany.isPending
                ? 'Saving...'
                : company
                ? 'Update Company'
                : 'Register Company'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
