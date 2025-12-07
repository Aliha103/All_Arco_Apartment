'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import { HeroImage } from '@/types';
import { toast } from 'sonner';
import {
  ImagePlus,
  GalleryHorizontal,
  LayoutGrid,
  Star,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Upload,
  Link as LinkIcon,
  X,
  Loader2,
  ImageIcon,
} from 'lucide-react';

export default function GalleryPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { hasPermission } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<HeroImage | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);

  // Permission check
  useEffect(() => {
    if (!authLoading && (!user || !hasPermission('gallery.view'))) {
      router.push('/pms');
    }
  }, [user, authLoading, hasPermission, router]);

  const { data: images, isLoading } = useQuery({
    queryKey: ['gallery-images', typeFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (typeFilter !== 'all') params.image_type = typeFilter;
      const response = await api.gallery.list(params);
      return response.data.results || response.data;
    },
    enabled: hasPermission('gallery.view'),
  });

  const [uploadFormData, setUploadFormData] = useState({
    title: '',
    alt_text: '',
    image_type: 'both' as 'hero' | 'gallery' | 'both',
    order: 0,
    is_active: true,
    image_url: '',
    image: null as File | null,
  });

  const [editFormData, setEditFormData] = useState({
    title: '',
    alt_text: '',
    image_type: 'both' as 'hero' | 'gallery' | 'both',
    order: 0,
    is_active: true,
    image_url: '',
    image: null as File | null,
  });

  const uploadImage = useMutation({
    mutationFn: (formData: FormData) => api.gallery.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-images'] });
      setIsUploadModalOpen(false);
      resetUploadForm();
      toast.success('Image uploaded successfully!');
    },
    onError: (error: Error & { response?: { data?: { message?: string; error?: string } } }) => {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to upload image');
    },
  });

  const updateImage = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData | Record<string, unknown> }) => api.gallery.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-images'] });
      setIsEditModalOpen(false);
      setSelectedImage(null);
      toast.success('Image updated successfully!');
    },
    onError: (error: Error & { response?: { data?: { message?: string; error?: string } } }) => {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to update image');
    },
  });

  const deleteImage = useMutation({
    mutationFn: (id: string) => api.gallery.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-images'] });
      toast.success('Image deleted successfully!');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to delete image');
    },
  });

  const toggleActive = useMutation({
    mutationFn: (id: string) => api.gallery.toggleActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-images'] });
      toast.success('Status updated!');
    },
  });

  const reorderImage = useMutation({
    mutationFn: ({ id, order }: { id: string; order: number }) => api.gallery.reorder(id, order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-images'] });
    },
  });

  const resetUploadForm = () => {
    setUploadFormData({
      title: '',
      alt_text: '',
      image_type: 'both',
      order: 0,
      is_active: true,
      image_url: '',
      image: null,
    });
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', uploadFormData.title);
    formData.append('alt_text', uploadFormData.alt_text);
    formData.append('image_type', uploadFormData.image_type);
    formData.append('order', uploadFormData.order.toString());
    formData.append('is_active', uploadFormData.is_active.toString());

    if (uploadFormData.image) {
      formData.append('image', uploadFormData.image);
    } else if (uploadFormData.image_url) {
      formData.append('image_url', uploadFormData.image_url);
    }
    uploadImage.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage) return;

    if (editFormData.image) {
      const formData = new FormData();
      formData.append('title', editFormData.title);
      formData.append('alt_text', editFormData.alt_text);
      formData.append('image_type', editFormData.image_type);
      formData.append('order', editFormData.order.toString());
      formData.append('is_active', editFormData.is_active.toString());
      formData.append('image', editFormData.image);
      updateImage.mutate({ id: selectedImage.id, data: formData });
    } else {
      const data: Record<string, unknown> = {
        title: editFormData.title,
        alt_text: editFormData.alt_text,
        image_type: editFormData.image_type,
        order: editFormData.order,
        is_active: editFormData.is_active,
      };
      if (editFormData.image_url && editFormData.image_url !== selectedImage.image_url) {
        data.image_url = editFormData.image_url;
      }
      updateImage.mutate({ id: selectedImage.id, data });
    }
  };

  const handleEdit = (image: HeroImage) => {
    setSelectedImage(image);
    setEditFormData({
      title: image.title,
      alt_text: image.alt_text,
      image_type: image.image_type,
      order: image.order,
      is_active: image.is_active,
      image_url: image.image_url || '',
      image: null,
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (image: HeroImage) => {
    if (confirm(`Are you sure you want to delete "${image.title}"? This action cannot be undone.`)) {
      deleteImage.mutate(image.id);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (isEdit) {
        setEditFormData({ ...editFormData, image: file, image_url: '' });
      } else {
        setUploadFormData({ ...uploadFormData, image: file, image_url: '' });
        setPreviewUrl(url);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setUploadFormData({ ...uploadFormData, image: file, image_url: '' });
      setPreviewUrl(url);
    }
  };

  const getImageUrl = (image: HeroImage): string => {
    return image.url || image.image || image.image_url || '';
  };

  const normalizeImageUrl = (url: string): string => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    // Default to production host for relative media paths
    return `https://www.allarcoapartment.com${url}`;
  };

  const isExternalUrl = (url: string): boolean => {
    if (!url || url.startsWith('/')) return false;
    return url.startsWith('http') &&
      !url.includes('allarcoapartment.com') &&
      !url.includes('unsplash.com');
  };

  const filterTabs = [
    { id: 'all', label: 'All Images', icon: GalleryHorizontal },
    { id: 'hero', label: 'Hero', icon: Star },
    { id: 'gallery', label: 'Gallery', icon: LayoutGrid },
    { id: 'both', label: 'Both', icon: ImageIcon },
  ];

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#C4A572]" />
      </div>
    );
  }

  if (!user || !hasPermission('gallery.view')) {
    return null;
  }

  const canManage = hasPermission('gallery.manage');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gallery Management</h1>
          <p className="text-gray-600 mt-1">Manage hero carousel and gallery images for your website</p>
        </div>
        {canManage && (
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-[#C4A572] hover:bg-[#B39562] text-white shadow-sm"
          >
            <ImagePlus className="w-4 h-4 mr-2" />
            Upload Image
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 inline-flex gap-1 flex-wrap">
        {filterTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = typeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-[#C4A572] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Images Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Images <span className="text-gray-400 font-normal">({images?.length || 0})</span>
          </h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#C4A572]" />
          </div>
        ) : images && images.length > 0 ? (
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence>
                {images.map((image: HeroImage, index: number) => (
                  <motion.div
                    key={image.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="group bg-gray-50 rounded-xl overflow-hidden border border-gray-200 hover:border-[#C4A572] hover:shadow-lg transition-all duration-300"
                  >
                    {/* Image Preview */}
                    <div className="relative aspect-[4/3] bg-gray-200 overflow-hidden">
                      {getImageUrl(image) ? (
                        <Image
                          src={normalizeImageUrl(getImageUrl(image))}
                          alt={image.alt_text}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          // Always bypass Next optimizer for media files to prevent _next/image 500s
                          unoptimized
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                          <ImageIcon className="w-12 h-12" />
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="absolute top-2 left-2">
                        <span className={`
                          inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                          ${image.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                          }
                        `}>
                          {image.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          {image.is_active ? 'Active' : 'Hidden'}
                        </span>
                      </div>

                      {/* Type Badge */}
                      <div className="absolute top-2 right-2">
                        <span className={`
                          px-2 py-1 rounded-full text-xs font-medium
                          ${image.image_type === 'hero' ? 'bg-purple-100 text-purple-700' : ''}
                          ${image.image_type === 'gallery' ? 'bg-blue-100 text-blue-700' : ''}
                          ${image.image_type === 'both' ? 'bg-amber-100 text-amber-700' : ''}
                        `}>
                          {image.image_type === 'both' ? 'Hero & Gallery' : image.image_type}
                        </span>
                      </div>

                      {/* Hover Actions */}
                      {canManage && (
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(image)}
                            className="p-2 bg-white rounded-lg text-gray-700 hover:bg-[#C4A572] hover:text-white transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleActive.mutate(image.id)}
                            className="p-2 bg-white rounded-lg text-gray-700 hover:bg-[#C4A572] hover:text-white transition-colors"
                            title={image.is_active ? 'Hide' : 'Show'}
                          >
                            {image.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(image)}
                            className="p-2 bg-white rounded-lg text-gray-700 hover:bg-red-500 hover:text-white transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Image Info */}
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 truncate">{image.title}</h3>
                      <p className="text-sm text-gray-500 truncate mt-0.5">{image.alt_text}</p>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                        <span className="text-xs text-gray-400">
                          {formatDate(image.created_at)}
                        </span>

                        {canManage && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => reorderImage.mutate({ id: image.id, order: Math.max(0, image.order - 1) })}
                              disabled={image.order === 0}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move up"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <span className="text-xs text-gray-500 w-6 text-center">{image.order}</span>
                            <button
                              onClick={() => reorderImage.mutate({ id: image.id, order: image.order + 1 })}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Move down"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="py-16 px-6 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <GalleryHorizontal className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No images yet</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Upload images to display on your website&apos;s hero carousel and gallery sections.
            </p>
            {canManage && (
              <Button
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-[#C4A572] hover:bg-[#B39562] text-white"
              >
                <ImagePlus className="w-4 h-4 mr-2" />
                Upload Your First Image
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Upload Image</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadSubmit} className="space-y-5">
            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-xl p-6 text-center transition-all
                ${dragOver ? 'border-[#C4A572] bg-[#C4A572]/5' : 'border-gray-300 hover:border-gray-400'}
                ${previewUrl ? 'pb-4' : ''}
              `}
            >
              {previewUrl ? (
                <div className="space-y-3">
                  <div className="relative w-full h-40 rounded-lg overflow-hidden bg-gray-100">
                    <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => { setPreviewUrl(''); setUploadFormData({ ...uploadFormData, image: null }); }}
                      className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">{uploadFormData.image?.name}</p>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 mb-2">
                    Drag and drop an image, or{' '}
                    <label className="text-[#C4A572] hover:text-[#B39562] cursor-pointer font-medium">
                      browse
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e)}
                        className="hidden"
                      />
                    </label>
                  </p>
                  <p className="text-xs text-gray-400">PNG, JPG, WebP up to 10MB</p>
                </>
              )}
            </div>

            {/* OR Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-sm text-gray-500">or paste URL</span>
              </div>
            </div>

            {/* URL Input */}
            <div className="space-y-2">
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="url"
                  value={uploadFormData.image_url}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, image_url: e.target.value, image: null })}
                  placeholder="https://images.unsplash.com/..."
                  disabled={!!uploadFormData.image}
                  className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label className="text-gray-700">Title *</Label>
                <Input
                  type="text"
                  value={uploadFormData.title}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, title: e.target.value })}
                  placeholder="e.g., Venice Canal View"
                  required
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-gray-700">Alt Text *</Label>
                <Input
                  type="text"
                  value={uploadFormData.alt_text}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, alt_text: e.target.value })}
                  placeholder="Descriptive text for accessibility"
                  required
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Display In</Label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent"
                  value={uploadFormData.image_type}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, image_type: e.target.value as 'hero' | 'gallery' | 'both' })}
                >
                  <option value="both">Hero & Gallery</option>
                  <option value="hero">Hero Only</option>
                  <option value="gallery">Gallery Only</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Order</Label>
                <Input
                  type="number"
                  min="0"
                  value={uploadFormData.order}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, order: parseInt(e.target.value) || 0 })}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={uploadFormData.is_active}
                onChange={(e) => setUploadFormData({ ...uploadFormData, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-[#C4A572] focus:ring-[#C4A572]"
              />
              <span className="text-gray-700">Active (visible on website)</span>
            </label>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => { setIsUploadModalOpen(false); resetUploadForm(); }} className="border-gray-300 text-gray-700 hover:bg-gray-50">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploadImage.isPending || (!uploadFormData.image && !uploadFormData.image_url)}
                className="bg-[#C4A572] hover:bg-[#B39562] text-white disabled:opacity-50"
              >
                {uploadImage.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload Image'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Edit Image</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-5">
            {/* Current Image */}
            {selectedImage && (
              <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gray-100">
                {getImageUrl(selectedImage) ? (
                  <Image
                    src={getImageUrl(selectedImage)}
                    alt={selectedImage.alt_text}
                    fill
                    className="object-cover"
                    unoptimized={isExternalUrl(getImageUrl(selectedImage))}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
              </div>
            )}

            {/* Replace Image */}
            <div className="space-y-2">
              <Label className="text-gray-700">Replace Image (optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, true)}
                className="bg-white border-gray-300 text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#C4A572]/10 file:text-[#C4A572] hover:file:bg-[#C4A572]/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Or External URL</Label>
              <Input
                type="url"
                value={editFormData.image_url}
                onChange={(e) => setEditFormData({ ...editFormData, image_url: e.target.value, image: null })}
                placeholder="https://images.unsplash.com/..."
                disabled={!!editFormData.image}
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label className="text-gray-700">Title *</Label>
                <Input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  required
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-gray-700">Alt Text *</Label>
                <Input
                  type="text"
                  value={editFormData.alt_text}
                  onChange={(e) => setEditFormData({ ...editFormData, alt_text: e.target.value })}
                  required
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Display In</Label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent"
                  value={editFormData.image_type}
                  onChange={(e) => setEditFormData({ ...editFormData, image_type: e.target.value as 'hero' | 'gallery' | 'both' })}
                >
                  <option value="both">Hero & Gallery</option>
                  <option value="hero">Hero Only</option>
                  <option value="gallery">Gallery Only</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Order</Label>
                <Input
                  type="number"
                  min="0"
                  value={editFormData.order}
                  onChange={(e) => setEditFormData({ ...editFormData, order: parseInt(e.target.value) || 0 })}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={editFormData.is_active}
                onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-[#C4A572] focus:ring-[#C4A572]"
              />
              <span className="text-gray-700">Active (visible on website)</span>
            </label>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} className="border-gray-300 text-gray-700 hover:bg-gray-50">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateImage.isPending}
                className="bg-[#C4A572] hover:bg-[#B39562] text-white disabled:opacity-50"
              >
                {updateImage.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
