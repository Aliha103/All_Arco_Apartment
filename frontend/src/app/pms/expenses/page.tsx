'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  MoreHorizontal,
  Check,
  Timer,
  X,
  Receipt,
  DollarSign,
  FileText,
  Ban,
  Loader2,
  TrendingUp,
  Sparkles,
  Lock,
  Edit2,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';

// Expense categories
const EXPENSE_CATEGORIES = [
  { value: 'gas', label: 'Gas' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'water', label: 'Water' },
  { value: 'internet', label: 'Internet' },
  { value: 'garbage_fee', label: 'Garbage Fee' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'maintenance', label: 'Maintenance & Repairs' },
  { value: 'cleaning', label: 'Cleaning Supplies' },
  { value: 'amenities', label: 'Guest Amenities' },
  { value: 'marketing', label: 'Marketing & Advertising' },
  { value: 'software', label: 'Software & Subscriptions' },
  { value: 'taxes', label: 'Taxes & Fees' },
  { value: 'supplies', label: 'Office Supplies' },
  { value: 'professional', label: 'Professional Services' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Credit/Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
];

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Timer },
  approved: { label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Check },
  rejected: { label: 'Rejected', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: X },
};

interface Expense {
  id: string;
  title: string;
  category: string;
  category_display: string;
  amount: string;
  expense_date: string;
  vendor?: string;
  payment_method: string;
  payment_method_display: string;
  status: 'pending' | 'approved' | 'rejected';
  status_display: string;
  description?: string;
  created_by_name?: string;
  approved_by_name?: string;
  created_at: string;
}

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();

  // Check permissions
  const canView = hasPermission('expenses.view');
  const canCreate = hasPermission('expenses.create');
  const canEdit = hasPermission('expenses.edit');
  const canDelete = hasPermission('expenses.delete');
  const canApprove = hasPermission('expenses.approve');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'other',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    vendor: '',
    payment_method: 'cash',
    description: '',
  });

  // Fetch expenses
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', { search, category: categoryFilter, status: statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await apiClient.get(`/expenses/?${params.toString()}`);
      return response.data.results || response.data;
    },
  });

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ['expense-statistics'],
    queryFn: async () => {
      const response = await apiClient.get('/expenses/statistics/');
      return response.data;
    },
  });

  // Create expense mutation with optimistic update
  const createExpense = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/expenses/', data);
      return response.data;
    },
    onMutate: async (newExpense) => {
      await queryClient.cancelQueries({ queryKey: ['expenses'] });
      const previousExpenses = queryClient.getQueryData(['expenses']);

      queryClient.setQueryData(['expenses'], (old: any) => {
        const optimisticExpense = {
          ...newExpense,
          id: 'temp-' + Date.now(),
          status: 'pending',
          created_at: new Date().toISOString(),
        };
        return [optimisticExpense, ...(old || [])];
      });

      return { previousExpenses };
    },
    onError: (err, newExpense, context) => {
      queryClient.setQueryData(['expenses'], context?.previousExpenses);
      toast.error('Failed to create expense');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-statistics'] });
      toast.success('Expense created successfully');
      setIsFormOpen(false);
      setFormData({
        title: '',
        category: 'other',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        vendor: '',
        payment_method: 'cash',
        description: '',
      });
    },
  });

  // Delete expense
  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/expenses/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-statistics'] });
      toast.success('Expense deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete expense');
    },
  });

  // Approve expense
  const approveExpense = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/expenses/${id}/approve/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-statistics'] });
      toast.success('Expense approved');
    },
  });

  // Reject expense
  const rejectExpense = useMutation({
    mutationFn: async ({id, reason}: {id: string, reason?: string}) => {
      await apiClient.post(`/expenses/${id}/reject/`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-statistics'] });
      toast.success('Expense rejected');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createExpense.mutate(formData);
  };

  const filteredExpenses = useMemo(() => {
    return expenses;
  }, [expenses]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              Expense Management
            </h1>
            <p className="text-gray-600 mt-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C4A572]" />
              Track and manage all business expenses professionally
            </p>
          </div>
          {canCreate && (
            <Button
              onClick={() => setIsFormOpen(true)}
              className="bg-gradient-to-r from-[#C4A572] to-[#B39562] hover:from-[#B39562] hover:to-[#A08552] text-white shadow-lg shadow-[#C4A572]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[#C4A572]/30 hover:scale-105"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          )}
          {!canView && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <Lock className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-800 font-medium">Limited Access</span>
            </div>
          )}
        </motion.div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">Total Expenses</CardTitle>
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                    {formatCurrency(stats.total_expenses)}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    This month
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-emerald-50/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">Approved</CardTitle>
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-md">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-600">
                    {formatCurrency(stats.approved_expenses)}
                  </div>
                  <p className="text-xs text-emerald-600/70 mt-2 font-medium">Confirmed payments</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-amber-50/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">Pending Review</CardTitle>
                  <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-md">
                    <Timer className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-600">
                    {formatCurrency(stats.pending_expenses)}
                  </div>
                  <p className="text-xs text-amber-600/70 mt-2 font-medium">Awaiting approval</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">Categories</CardTitle>
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">
                    {Object.keys(stats.category_breakdown || {}).length}
                  </div>
                  <p className="text-xs text-purple-600/70 mt-2 font-medium">Active categories</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-[#C4A572] transition-colors" />
                  <Input
                    placeholder="Search expenses..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 border-gray-200 focus:border-[#C4A572] focus:ring-[#C4A572] transition-all"
                  />
                </div>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="border-gray-200 focus:border-[#C4A572] focus:ring-[#C4A572]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="border-gray-200 focus:border-[#C4A572] focus:ring-[#C4A572]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Expenses Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-96 bg-gradient-to-br from-gray-50 to-white">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="w-12 h-12 text-[#C4A572]" />
                  </motion.div>
                  <p className="text-gray-500 mt-4 font-medium">Loading expenses...</p>
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 bg-gradient-to-br from-gray-50 via-white to-gray-50">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.6 }}
                    className="p-6 bg-gradient-to-br from-[#C4A572]/10 to-[#B39562]/10 rounded-full mb-6"
                  >
                    <Receipt className="w-16 h-16 text-[#C4A572]" />
                  </motion.div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No expenses yet</h3>
                  <p className="text-gray-500 mb-6 text-center max-w-md">
                    {canCreate
                      ? 'Start tracking your business expenses by adding your first entry'
                      : 'No expenses have been created yet. Contact an administrator to add expenses.'}
                  </p>
                  {canCreate && (
                    <Button
                      onClick={() => setIsFormOpen(true)}
                      className="bg-gradient-to-r from-[#C4A572] to-[#B39562] hover:from-[#B39562] hover:to-[#A08552] text-white shadow-lg"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Expense
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Month</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Vendor</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created By</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <AnimatePresence>
                        {filteredExpenses.map((expense: Expense, index: number) => (
                          <motion.tr
                            key={expense.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-transparent transition-all duration-200 group"
                          >
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-900 group-hover:text-[#C4A572] transition-colors">
                                  {expense.title}
                                </span>
                                {expense.description && (
                                  <span className="text-xs text-gray-500 mt-1 line-clamp-1">
                                    {expense.description}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                {expense.category_display}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <span className="text-base font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                {formatCurrency(parseFloat(expense.amount))}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-900">
                                  {new Date(expense.expense_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                                <span className="text-xs text-gray-500 mt-0.5">
                                  {formatDate(expense.expense_date)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span className="text-sm text-gray-700">{expense.vendor || '—'}</span>
                            </td>
                            <td className="px-6 py-5">
                              <Badge className={`${STATUS_CONFIG[expense.status].color} border font-medium`}>
                                {expense.status_display}
                              </Badge>
                            </td>
                            <td className="px-6 py-5">
                              <span className="text-sm text-gray-700">{expense.created_by_name || '—'}</span>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="hover:bg-gray-100 transition-colors"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  {canApprove && expense.status === 'pending' && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => approveExpense.mutate(expense.id)}
                                        className="cursor-pointer"
                                      >
                                        <Check className="w-4 h-4 mr-2 text-emerald-600" />
                                        <span className="text-emerald-600 font-medium">Approve</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => rejectExpense.mutate({id: expense.id})}
                                        className="cursor-pointer"
                                      >
                                        <X className="w-4 h-4 mr-2 text-rose-600" />
                                        <span className="text-rose-600 font-medium">Reject</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </>
                                  )}
                                  {canEdit && (
                                    <DropdownMenuItem className="cursor-pointer">
                                      <Edit2 className="w-4 h-4 mr-2" />
                                      <span className="font-medium">Edit</span>
                                    </DropdownMenuItem>
                                  )}
                                  {canDelete && (
                                    <>
                                      {canEdit && <DropdownMenuSeparator />}
                                      <DropdownMenuItem
                                        onClick={() => deleteExpense.mutate(expense.id)}
                                        className="cursor-pointer text-rose-600 focus:text-rose-600"
                                      >
                                        <Ban className="w-4 h-4 mr-2" />
                                        <span className="font-medium">Delete</span>
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {!canEdit && !canDelete && !canApprove && (
                                    <DropdownMenuItem disabled className="text-gray-400">
                                      <Lock className="w-4 h-4 mr-2" />
                                      <span>No actions available</span>
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Add Expense Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-[600px] bg-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Add New Expense
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Record a new business expense for tracking and approval.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="title" className="text-sm font-semibold text-gray-700">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Electricity - December 2024"
                    required
                    className="mt-1.5 border-gray-300 focus:border-[#C4A572] focus:ring-[#C4A572] text-gray-900"
                  />
                </div>

                <div>
                  <Label htmlFor="category" className="text-sm font-semibold text-gray-700">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="mt-1.5 border-gray-300 focus:border-[#C4A572] focus:ring-[#C4A572] text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="amount" className="text-sm font-semibold text-gray-700">Amount (€) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                    className="mt-1.5 border-gray-300 focus:border-[#C4A572] focus:ring-[#C4A572] text-gray-900"
                  />
                </div>

                <div>
                  <Label htmlFor="expense_date" className="text-sm font-semibold text-gray-700">Expense Date (Month/Period) *</Label>
                  <Input
                    id="expense_date"
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    required
                    className="mt-1.5 border-gray-300 focus:border-[#C4A572] focus:ring-[#C4A572] text-gray-900"
                  />
                </div>

                <div>
                  <Label htmlFor="payment_method" className="text-sm font-semibold text-gray-700">Payment Method *</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                  >
                    <SelectTrigger className="mt-1.5 border-gray-300 focus:border-[#C4A572] focus:ring-[#C4A572] text-gray-900">
                      <SelectValue />
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

                <div className="col-span-2">
                  <Label htmlFor="vendor" className="text-sm font-semibold text-gray-700">Vendor/Payee</Label>
                  <Input
                    id="vendor"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    placeholder="e.g., Venice Water Company"
                    className="mt-1.5 border-gray-300 focus:border-[#C4A572] focus:ring-[#C4A572] text-gray-900"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="description" className="text-sm font-semibold text-gray-700">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Additional notes about this expense..."
                    rows={3}
                    className="mt-1.5 border-gray-300 focus:border-[#C4A572] focus:ring-[#C4A572] text-gray-900"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-[#C4A572] to-[#B39562] hover:from-[#B39562] hover:to-[#A08552] text-white shadow-lg"
                  disabled={createExpense.isPending}
                >
                  {createExpense.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Expense
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
