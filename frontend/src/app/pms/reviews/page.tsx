'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Check,
  X,
  Trash2,
  AlertCircle,
  Filter,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
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
import StarRating from '@/components/reviews/StarRating';
import CategoryRating, { ALL_CATEGORIES, type CategoryKey } from '@/components/reviews/CategoryRating';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import type { ReviewDetailed, ReviewCreateData, ReviewStatistics } from '@/types';

/**
 * PMS Reviews Management Page
 *
 * Features:
 * - Statistics header (total, pending, average rating)
 * - Tabs by status (Pending, Approved, Rejected, All)
 * - Search and filters (OTA source, rating)
 * - Table/card views (desktop/mobile responsive)
 * - Approve/reject workflow with dialogs
 * - Manual review creation form
 * - Toggle featured status
 * - Delete reviews
 */

// ============================================================================
// Main Component
// ============================================================================
export default function ReviewsManagementPage() {
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = useAuthStore();

  // Permissions
  const canView = hasPermission('reviews.view') || isSuperAdmin();
  const canApprove = hasPermission('reviews.approve') || isSuperAdmin();
  const canCreate = hasPermission('reviews.create') || isSuperAdmin();
  const canEdit = hasPermission('reviews.edit') || isSuperAdmin();
  const canDelete = hasPermission('reviews.delete') || isSuperAdmin();

  // State
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [otaFilter, setOtaFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  // Fetch statistics
  const { data: statsData } = useQuery({
    queryKey: ['review-statistics'],
    queryFn: async () => {
      const response = await api.reviews.statistics();
      return response.data as ReviewStatistics;
    },
    staleTime: 30000,
    enabled: canView,
  });

  // Fetch reviews list
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews-pms', activeTab, debouncedSearch, otaFilter, ratingFilter],
    queryFn: async () => {
      const params: any = {};

      // Status filter
      if (activeTab !== 'all') {
        params.status = activeTab;
      }

      // Search
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      // OTA filter
      if (otaFilter && otaFilter !== 'all') {
        params.ota_source = otaFilter;
      }

      // Rating filter
      if (ratingFilter && ratingFilter !== 'all') {
        params.rating = ratingFilter;
      }

      const response = await api.reviews.list(params);
      return response.data.results || response.data || [];
    },
    staleTime: 10000,
    enabled: canView,
  });

  const reviews = useMemo(() => reviewsData || [], [reviewsData]);
  const stats = statsData || {
    total_reviews: 0,
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    average_rating: 0,
    reviews_this_month: 0,
  };

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleCreateReview = () => {
    if (!canCreate) {
      toast.error('You do not have permission to create reviews');
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
            <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-sm text-gray-600">
              You do not have permission to view reviews
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
              <Star className="w-7 h-7 text-[#C4A572]" fill="#C4A572" />
              Review Management
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage guest reviews and ratings
            </p>
          </div>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatsCard
          icon={Star}
          iconColor="text-[#C4A572]"
          iconBg="bg-[#C4A572]/10"
          label="Total Reviews"
          value={stats.total_reviews.toString()}
        />
        <StatsCard
          icon={Clock}
          iconColor="text-orange-600"
          iconBg="bg-orange-100"
          label="Pending Approval"
          value={stats.pending_count.toString()}
          clickable
          onClick={() => setActiveTab('pending')}
        />
        <StatsCard
          icon={TrendingUp}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
          label="Average Rating"
          value={stats.average_rating ? Number(stats.average_rating).toFixed(1) : '0.0'}
        />
        <StatsCard
          icon={CheckCircle}
          iconColor="text-green-600"
          iconBg="bg-green-100"
          label="This Month"
          value={stats.reviews_this_month.toString()}
        />
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Pending ({stats.pending_count})
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Approved ({stats.approved_count})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <XCircle className="w-4 h-4" />
              Rejected ({stats.rejected_count})
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <Star className="w-4 h-4" />
              All ({stats.total_reviews})
            </TabsTrigger>
          </TabsList>

          {/* Reviews Tab Content */}
          <TabsContent value={activeTab} className="space-y-4">
            <ReviewsTab
              reviews={reviews}
              isLoading={reviewsLoading}
              search={search}
              setSearch={setSearch}
              otaFilter={otaFilter}
              setOtaFilter={setOtaFilter}
              ratingFilter={ratingFilter}
              setRatingFilter={setRatingFilter}
              onCreate={handleCreateReview}
              canCreate={canCreate}
              canApprove={canApprove}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Create Review Modal */}
      <CreateReviewModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}

// ============================================================================
// Statistics Card Component
// ============================================================================
interface StatsCardProps {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  clickable?: boolean;
  onClick?: () => void;
}

function StatsCard({ icon: Icon, iconColor, iconBg, label, value, clickable, onClick }: StatsCardProps) {
  return (
    <Card
      className={`border border-gray-200 shadow-sm ${
        clickable ? 'cursor-pointer hover:shadow-md hover:border-gray-300 transition-all' : ''
      }`}
      onClick={clickable ? onClick : undefined}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-lg ${iconBg} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
          <div>
            <p className="text-sm text-gray-600">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Reviews Tab Component
// ============================================================================
interface ReviewsTabProps {
  reviews: ReviewDetailed[];
  isLoading: boolean;
  search: string;
  setSearch: (value: string) => void;
  otaFilter: string;
  setOtaFilter: (value: string) => void;
  ratingFilter: string;
  setRatingFilter: (value: string) => void;
  onCreate: () => void;
  canCreate: boolean;
  canApprove: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

function ReviewsTab({
  reviews,
  isLoading,
  search,
  setSearch,
  otaFilter,
  setOtaFilter,
  ratingFilter,
  setRatingFilter,
  onCreate,
  canCreate,
  canApprove,
  canEdit,
  canDelete,
}: ReviewsTabProps) {
  return (
    <Card className="border border-gray-200 shadow">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg text-gray-900">
              Reviews ({reviews.length})
            </CardTitle>
            <CardDescription>Manage and moderate guest reviews</CardDescription>
          </div>
          {canCreate && (
            <Button onClick={onCreate} className="bg-[#C4A572] hover:bg-[#A38652] w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Review
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {/* Search */}
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search guest name or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* OTA Filter */}
          <Select value={otaFilter} onValueChange={setOtaFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="airbnb">Airbnb</SelectItem>
              <SelectItem value="booking_com">Booking.com</SelectItem>
              <SelectItem value="direct">Direct</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          {/* Rating Filter */}
          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Ratings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="9">5 Stars (9-10)</SelectItem>
              <SelectItem value="7">4 Stars (7-8.9)</SelectItem>
              <SelectItem value="5">3 Stars (5-6.9)</SelectItem>
              <SelectItem value="3">2 Stars (3-4.9)</SelectItem>
              <SelectItem value="1">1 Star (1-2.9)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#C4A572]"></div>
            <p className="text-sm text-gray-600 mt-4">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center">
            <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews found</h3>
            <p className="text-sm text-gray-600 mb-6">
              {search ? 'No reviews match your search' : 'No reviews in this category yet'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                      Guest
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                      Rating
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                      Source
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {reviews.map((review, index) => (
                      <ReviewRow
                        key={review.id}
                        review={review}
                        index={index}
                        canApprove={canApprove}
                        canEdit={canEdit}
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
                {reviews.map((review, index) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    index={index}
                    canApprove={canApprove}
                    canEdit={canEdit}
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
// Review Row Component (Desktop)
// ============================================================================
interface ReviewRowProps {
  review: ReviewDetailed;
  index: number;
  canApprove: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

function ReviewRow({ review, index, canApprove, canEdit, canDelete }: ReviewRowProps) {
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  return (
    <>
      <motion.tr
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, delay: index * 0.02 }}
        className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => setIsDetailModalOpen(true)}
      >
        <td className="px-4 py-3">
          <div>
            <p className="font-semibold text-sm text-gray-900">{review.guest_name}</p>
            <p className="text-xs text-gray-600">{review.location}</p>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-[#C4A572] text-[#C4A572]" />
            <span className="text-sm font-semibold text-gray-900">
              {review.rating ? Number(review.rating).toFixed(1) : '0.0'}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm text-gray-900 truncate max-w-xs">{review.title}</p>
        </td>
        <td className="px-4 py-3">
          <OTABadge source={review.ota_source} />
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={review.status} />
        </td>
        <td className="px-4 py-3">
          <p className="text-sm text-gray-600">{formatDate(review.created_at)}</p>
        </td>
        <td className="px-4 py-3">
          <ReviewActions
            review={review}
            canApprove={canApprove}
            canEdit={canEdit}
            canDelete={canDelete}
            onViewDetails={() => setIsDetailModalOpen(true)}
          />
        </td>
      </motion.tr>

      {/* Detail Modal */}
      <ReviewDetailModal
        review={review}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        canApprove={canApprove}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </>
  );
}

// ============================================================================
// Review Card Component (Mobile)
// ============================================================================
function ReviewCard({ review, index, canApprove, canEdit, canDelete }: ReviewRowProps) {
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, delay: index * 0.02 }}
        className="p-4 hover:bg-gray-50 cursor-pointer"
        onClick={() => setIsDetailModalOpen(true)}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-sm text-gray-900">{review.guest_name}</p>
              <p className="text-xs text-gray-600">{review.location}</p>
            </div>
            <ReviewActions
              review={review}
              canApprove={canApprove}
              canEdit={canEdit}
              canDelete={canDelete}
              onViewDetails={() => setIsDetailModalOpen(true)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 fill-[#C4A572] text-[#C4A572]" />
            <span className="text-sm font-semibold text-gray-900">
              {review.rating ? Number(review.rating).toFixed(1) : '0.0'}
            </span>
            <OTABadge source={review.ota_source} />
            <StatusBadge status={review.status} />
          </div>

          <p className="text-sm text-gray-900 line-clamp-2">{review.title}</p>
          <p className="text-xs text-gray-600">{formatDate(review.created_at)}</p>
        </div>
      </motion.div>

      {/* Detail Modal */}
      <ReviewDetailModal
        review={review}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        canApprove={canApprove}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </>
  );
}

// ============================================================================
// Badge Components
// ============================================================================
function OTABadge({ source }: { source: string }) {
  const colors = {
    website: 'bg-blue-100 text-blue-800',
    airbnb: 'bg-red-100 text-red-800',
    booking_com: 'bg-indigo-100 text-indigo-800',
    direct: 'bg-green-100 text-green-800',
    other: 'bg-gray-100 text-gray-800',
  };

  const labels = {
    website: 'Website',
    airbnb: 'Airbnb',
    booking_com: 'Booking.com',
    direct: 'Direct',
    other: 'Other',
  };

  return (
    <Badge className={`text-xs font-semibold ${colors[source as keyof typeof colors] || colors.other}`}>
      {labels[source as keyof typeof labels] || source}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    pending: 'bg-orange-100 text-orange-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  return (
    <Badge className={`text-xs font-semibold capitalize ${colors[status as keyof typeof colors] || colors.pending}`}>
      {status}
    </Badge>
  );
}

// ============================================================================
// Review Actions Component
// ============================================================================
interface ReviewActionsProps {
  review: ReviewDetailed;
  canApprove: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onViewDetails: () => void;
}

function ReviewActions({ review, canApprove, canEdit, canDelete, onViewDetails }: ReviewActionsProps) {
  const queryClient = useQueryClient();

  const approveReview = useMutation({
    mutationFn: async (id: string) => {
      await api.reviews.approve(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews-pms'] });
      queryClient.invalidateQueries({ queryKey: ['review-statistics'] });
      toast.success('Review approved successfully');
    },
    onError: () => {
      toast.error('Failed to approve review');
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: async (id: string) => {
      await api.reviews.toggleFeatured(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews-pms'] });
      toast.success('Featured status updated');
    },
    onError: () => {
      toast.error('Failed to update featured status');
    },
  });

  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      await api.reviews.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews-pms'] });
      queryClient.invalidateQueries({ queryKey: ['review-statistics'] });
      toast.success('Review deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete review');
    },
  });

  const handleApprove = () => {
    if (confirm('Approve this review? It will be visible on the homepage.')) {
      approveReview.mutate(review.id);
    }
  };

  const handleToggleFeatured = () => {
    toggleFeatured.mutate(review.id);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      deleteReview.mutate(review.id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="w-4 h-4 text-gray-700" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onViewDetails}>
          <Eye className="w-4 h-4 mr-2 text-gray-700" />
          View Details
        </DropdownMenuItem>

        {canApprove && review.status === 'pending' && (
          <DropdownMenuItem onClick={handleApprove}>
            <Check className="w-4 h-4 mr-2 text-green-600" />
            Approve Review
          </DropdownMenuItem>
        )}

        {canEdit && (
          <DropdownMenuItem onClick={handleToggleFeatured}>
            <Star className="w-4 h-4 mr-2 text-[#C4A572]" />
            {review.is_featured ? 'Unmark Featured' : 'Mark as Featured'}
          </DropdownMenuItem>
        )}

        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Review
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// Review Detail Modal Component
// ============================================================================
interface ReviewDetailModalProps {
  review: ReviewDetailed;
  isOpen: boolean;
  onClose: () => void;
  canApprove: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

function ReviewDetailModal({
  review,
  isOpen,
  onClose,
  canApprove,
  canEdit,
  canDelete,
}: ReviewDetailModalProps) {
  const queryClient = useQueryClient();
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const approveReview = useMutation({
    mutationFn: async (id: string) => {
      await api.reviews.approve(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews-pms'] });
      queryClient.invalidateQueries({ queryKey: ['review-statistics'] });
      toast.success('Review approved successfully');
      onClose();
    },
    onError: () => {
      toast.error('Failed to approve review');
    },
  });

  const rejectReview = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await api.reviews.reject(id, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews-pms'] });
      queryClient.invalidateQueries({ queryKey: ['review-statistics'] });
      toast.success('Review rejected');
      setIsRejectDialogOpen(false);
      setRejectionReason('');
      onClose();
    },
    onError: () => {
      toast.error('Failed to reject review');
    },
  });

  const handleApprove = () => {
    if (confirm('Approve this review? It will be visible on the homepage.')) {
      approveReview.mutate(review.id);
    }
  };

  const handleReject = () => {
    if (!rejectionReason.trim() || rejectionReason.trim().length < 10) {
      toast.error('Please provide a rejection reason (at least 10 characters)');
      return;
    }
    rejectReview.mutate({ id: review.id, reason: rejectionReason.trim() });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl">Review Details</DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={review.status} />
                  <OTABadge source={review.ota_source} />
                  {review.is_featured && (
                    <Badge className="bg-purple-100 text-purple-800 text-xs">Featured</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-[#C4A572] text-[#C4A572]" />
                <span className="text-xl font-bold text-gray-900">
                  {review.rating ? Number(review.rating).toFixed(1) : '0.0'}
                </span>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Guest Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Guest Information</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Name:</span>
                  <span className="text-sm font-medium text-gray-900">{review.guest_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Location:</span>
                  <span className="text-sm font-medium text-gray-900">{review.location || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Stay Date:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {review.stay_date ? formatDate(review.stay_date) : 'Not provided'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Submitted:</span>
                  <span className="text-sm font-medium text-gray-900">{formatDate(review.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Review Content */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Review Content</h3>
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg">{review.title}</h4>
                  <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{review.text}</p>
                </div>
              </div>
            </div>

            {/* Category Ratings */}
            {review.category_ratings && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Category Ratings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(review.category_ratings).map(([key, value]) => (
                    value !== null && (
                      <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700 capitalize">{key}</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-[#C4A572] text-[#C4A572]" />
                          <span className="text-sm font-semibold text-gray-900">
                            {value ? Number(value).toFixed(1) : '0.0'}
                          </span>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Workflow Info */}
            {(review.approved_by_name || review.rejected_by_name) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Workflow Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {review.approved_by_name && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Approved by:</span>
                        <span className="text-sm font-medium text-gray-900">{review.approved_by_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Approved at:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {review.approved_at ? formatDate(review.approved_at) : 'N/A'}
                        </span>
                      </div>
                    </>
                  )}
                  {review.rejected_by_name && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Rejected by:</span>
                        <span className="text-sm font-medium text-gray-900">{review.rejected_by_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Rejected at:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {review.rejected_at ? formatDate(review.rejected_at) : 'N/A'}
                        </span>
                      </div>
                      {review.rejection_reason && (
                        <div className="pt-2 border-t border-gray-200">
                          <span className="text-sm text-gray-600">Reason:</span>
                          <p className="text-sm text-gray-900 mt-1">{review.rejection_reason}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {canApprove && review.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsRejectDialogOpen(true)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={approveReview.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {approveReview.isPending ? 'Approving...' : 'Approve'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Reject Review</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this review. This is for internal records only.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="e.g., Inappropriate content, spam, duplicate review..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 10 characters</p>
            </div>

            {rejectionReason.trim() && rejectionReason.trim().length < 10 && (
              <div className="flex items-center gap-2 text-orange-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Please provide at least 10 characters</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectionReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={rejectReview.isPending || !rejectionReason.trim() || rejectionReason.trim().length < 10}
              className="bg-red-600 hover:bg-red-700"
            >
              {rejectReview.isPending ? 'Rejecting...' : 'Reject Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// Create Review Modal Component
// ============================================================================
interface CreateReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function CreateReviewModal({ isOpen, onClose }: CreateReviewModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<ReviewCreateData>>({
    guest_name: '',
    location: '',
    title: '',
    text: '',
    rating_cleanliness: 0,
    rating_communication: 0,
    rating_checkin: 0,
    rating_accuracy: 0,
    rating_location: 0,
    rating_value: 0,
    stay_date: '',
    ota_source: 'website',
    is_featured: false,
  });

  const createReview = useMutation({
    mutationFn: async (data: ReviewCreateData) => {
      await api.reviews.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews-pms'] });
      queryClient.invalidateQueries({ queryKey: ['review-statistics'] });
      toast.success('Review created and published successfully');
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to create review';
      toast.error(message);
    },
  });

  const resetForm = () => {
    setFormData({
      guest_name: '',
      location: '',
      title: '',
      text: '',
      rating_cleanliness: 0,
      rating_communication: 0,
      rating_checkin: 0,
      rating_accuracy: 0,
      rating_location: 0,
      rating_value: 0,
      stay_date: '',
      ota_source: 'website',
      is_featured: false,
    });
  };

  const handleRatingChange = (category: CategoryKey, value: number) => {
    setFormData(prev => ({
      ...prev,
      [`rating_${category}`]: value,
    }));
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.guest_name?.trim() || formData.guest_name.trim().length < 2) {
      toast.error('Guest name is required (min 2 characters)');
      return;
    }

    if (!formData.title?.trim() || formData.title.trim().length < 5) {
      toast.error('Review title is required (min 5 characters)');
      return;
    }

    if (!formData.text?.trim() || formData.text.trim().length < 50) {
      toast.error('Review text is required (min 50 characters)');
      return;
    }

    if (!formData.stay_date) {
      toast.error('Stay date is required');
      return;
    }

    // Check all category ratings
    const allRated = ALL_CATEGORIES.every(cat =>
      (formData[`rating_${cat}` as keyof ReviewCreateData] as number) > 0
    );

    if (!allRated) {
      toast.error('Please rate all categories');
      return;
    }

    createReview.mutate(formData as ReviewCreateData);
  };

  const handleClose = () => {
    onClose();
    setTimeout(resetForm, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Add New Review</DialogTitle>
          <DialogDescription>
            Manually create a review from external sources or direct feedback
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Guest Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Guest Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="guest_name">Guest Name *</Label>
                <Input
                  id="guest_name"
                  placeholder="Enter guest name"
                  value={formData.guest_name}
                  onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                  maxLength={150}
                />
              </div>

              <div>
                <Label htmlFor="location">Location (Optional)</Label>
                <Input
                  id="location"
                  placeholder="e.g., Paris, France"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  maxLength={150}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stay_date">Stay Date *</Label>
                <Input
                  id="stay_date"
                  type="date"
                  value={formData.stay_date}
                  onChange={(e) => setFormData({ ...formData, stay_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="ota_source">Source *</Label>
                <Select
                  value={formData.ota_source}
                  onValueChange={(value: any) => setFormData({ ...formData, ota_source: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="airbnb">Airbnb</SelectItem>
                    <SelectItem value="booking_com">Booking.com</SelectItem>
                    <SelectItem value="direct">Direct</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Category Ratings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Category Ratings *</h3>
            <div className="space-y-3">
              {ALL_CATEGORIES.map((category) => (
                <CategoryRating
                  key={category}
                  category={category}
                  value={formData[`rating_${category}` as keyof ReviewCreateData] as number || 0}
                  onChange={(value) => handleRatingChange(category, value)}
                  required
                />
              ))}
            </div>
          </div>

          {/* Review Content */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Review Content</h3>

            <div>
              <Label htmlFor="title">Review Title *</Label>
              <Input
                id="title"
                placeholder="Sum up the experience"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.title?.length || 0}/200 characters
              </p>
            </div>

            <div>
              <Label htmlFor="text">Review Text *</Label>
              <Textarea
                id="text"
                placeholder="Detailed review..."
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                rows={6}
                maxLength={2000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.text?.length || 0}/2000 characters (minimum 50)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_featured"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="w-4 h-4 text-[#C4A572] border-gray-300 rounded focus:ring-[#C4A572]"
              />
              <Label htmlFor="is_featured" className="text-sm cursor-pointer">
                Mark as Featured
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createReview.isPending}
            className="bg-[#C4A572] hover:bg-[#A38652]"
          >
            {createReview.isPending ? 'Creating...' : 'Create Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
