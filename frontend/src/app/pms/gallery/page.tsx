'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import { HeroImage } from '@/types';
import { toast } from 'sonner';

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

  // Permission check - requires gallery.view
  useEffect(() => {
    if (!authLoading && (!user || !hasPermission('gallery.view'))) {
      router.push('/pms');
    }
  }, [user, authLoading, hasPermission, router]);

  const { data: images, isLoading } = useQuery({
    queryKey: ['gallery-images', typeFilter],
    queryFn: async () => {
      const params: any = {};
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
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to upload image');
    },
  });

  const updateImage = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData | any }) => api.gallery.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-images'] });
      setIsEditModalOpen(false);
      setSelectedImage(null);
      toast.success('Image updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to update image');
    },
  });

  const deleteImage = useMutation({
    mutationFn: (id: string) => api.gallery.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-images'] });
      toast.success('Image deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete image');
    },
  });

  const toggleActive = useMutation({
    mutationFn: (id: string) => api.gallery.toggleActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-images'] });
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

    // If we're uploading a new file, use FormData
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
      // Just update metadata
      const data: any = {
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

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'hero':
        return 'bg-purple-100 text-purple-800';
      case 'gallery':
        return 'bg-blue-100 text-blue-800';
      case 'both':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (authLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!user || !hasPermission('gallery.view')) {
    return null;
  }

  const canManage = hasPermission('gallery.manage');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gallery Management</h1>
        <p className="text-gray-600">Manage hero carousel and gallery images</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-2 flex-wrap">
            {['all', 'hero', 'gallery', 'both'].map((type) => (
              <Button
                key={type}
                variant={typeFilter === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter(type)}
                className="capitalize"
              >
                {type === 'all' ? 'All Images' : type === 'both' ? 'Hero & Gallery' : type}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Images Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Images ({images?.length || 0})</CardTitle>
            {canManage && (
              <Button onClick={() => setIsUploadModalOpen(true)}>
                Upload Image
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8">Loading images...</p>
          ) : images && images.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Preview</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  {canManage && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {images.map((image: HeroImage) => (
                  <TableRow key={image.id}>
                    <TableCell>
                      <div className="relative w-20 h-14 rounded overflow-hidden bg-gray-100">
                        <Image
                          src={image.url || image.image || image.image_url || '/placeholder.png'}
                          alt={image.alt_text}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{image.title}</p>
                        <p className="text-sm text-gray-500 truncate max-w-[200px]">{image.alt_text}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeBadgeColor(image.image_type)}>
                        {image.image_type === 'both' ? 'Hero & Gallery' : image.image_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canManage ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reorderImage.mutate({ id: image.id, order: Math.max(0, image.order - 1) })}
                            disabled={image.order === 0}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">{image.order}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reorderImage.mutate({ id: image.id, order: image.order + 1 })}
                          >
                            +
                          </Button>
                        </div>
                      ) : (
                        image.order
                      )}
                    </TableCell>
                    <TableCell>
                      {canManage ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive.mutate(image.id)}
                          className={image.is_active ? 'text-green-600' : 'text-gray-500'}
                        >
                          {image.is_active ? 'Active' : 'Inactive'}
                        </Button>
                      ) : (
                        <Badge variant={image.is_active ? 'success' : 'secondary'}>
                          {image.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{formatDate(image.created_at)}</p>
                        {image.uploaded_by_name && (
                          <p className="text-gray-500">by {image.uploaded_by_name}</p>
                        )}
                      </div>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(image)}>
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(image)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-600">
              <p>No images found</p>
              {canManage && (
                <Button className="mt-4" onClick={() => setIsUploadModalOpen(true)}>
                  Upload Your First Image
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Image Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Image</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                type="text"
                value={uploadFormData.title}
                onChange={(e) => setUploadFormData({ ...uploadFormData, title: e.target.value })}
                placeholder="e.g., Venice Canal View"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Alt Text *</Label>
              <Input
                type="text"
                value={uploadFormData.alt_text}
                onChange={(e) => setUploadFormData({ ...uploadFormData, alt_text: e.target.value })}
                placeholder="Descriptive text for accessibility"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Image Type</Label>
              <select
                className="w-full px-3 py-2 border rounded-lg"
                value={uploadFormData.image_type}
                onChange={(e) => setUploadFormData({ ...uploadFormData, image_type: e.target.value as any })}
              >
                <option value="hero">Hero Carousel Only</option>
                <option value="gallery">Gallery Only</option>
                <option value="both">Both Hero & Gallery</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input
                type="number"
                min="0"
                value={uploadFormData.order}
                onChange={(e) => {
                  const order = Number.parseInt(e.target.value, 10);
                  setUploadFormData({ ...uploadFormData, order: Number.isNaN(order) ? 0 : order });
                }}
              />
              <p className="text-xs text-gray-500">Lower numbers appear first</p>
            </div>
            <div className="space-y-2">
              <Label>Upload Image *</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e)}
              />
              {previewUrl && (
                <div className="relative w-full h-32 rounded overflow-hidden bg-gray-100 mt-2">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </div>
            <div className="text-center text-sm text-gray-500">- OR -</div>
            <div className="space-y-2">
              <Label>External Image URL</Label>
              <Input
                type="url"
                value={uploadFormData.image_url}
                onChange={(e) => setUploadFormData({ ...uploadFormData, image_url: e.target.value, image: null })}
                placeholder="https://images.unsplash.com/..."
                disabled={!!uploadFormData.image}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={uploadFormData.is_active}
                onChange={(e) => setUploadFormData({ ...uploadFormData, is_active: e.target.checked })}
              />
              <Label htmlFor="is_active">Active (visible on website)</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsUploadModalOpen(false); resetUploadForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploadImage.isPending || (!uploadFormData.image && !uploadFormData.image_url)}>
                {uploadImage.isPending ? 'Uploading...' : 'Upload Image'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Image Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Image</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                type="text"
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                placeholder="e.g., Venice Canal View"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Alt Text *</Label>
              <Input
                type="text"
                value={editFormData.alt_text}
                onChange={(e) => setEditFormData({ ...editFormData, alt_text: e.target.value })}
                placeholder="Descriptive text for accessibility"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Image Type</Label>
              <select
                className="w-full px-3 py-2 border rounded-lg"
                value={editFormData.image_type}
                onChange={(e) => setEditFormData({ ...editFormData, image_type: e.target.value as any })}
              >
                <option value="hero">Hero Carousel Only</option>
                <option value="gallery">Gallery Only</option>
                <option value="both">Both Hero & Gallery</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input
                type="number"
                min="0"
                value={editFormData.order}
                onChange={(e) => {
                  const order = Number.parseInt(e.target.value, 10);
                  setEditFormData({ ...editFormData, order: Number.isNaN(order) ? 0 : order });
                }}
              />
            </div>
            {selectedImage && (
              <div className="space-y-2">
                <Label>Current Image</Label>
                <div className="relative w-full h-32 rounded overflow-hidden bg-gray-100">
                  <Image
                    src={selectedImage.url || selectedImage.image || selectedImage.image_url || '/placeholder.png'}
                    alt={selectedImage.alt_text}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Replace Image (optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, true)}
              />
            </div>
            <div className="space-y-2">
              <Label>Or External URL</Label>
              <Input
                type="url"
                value={editFormData.image_url}
                onChange={(e) => setEditFormData({ ...editFormData, image_url: e.target.value, image: null })}
                placeholder="https://images.unsplash.com/..."
                disabled={!!editFormData.image}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit_is_active"
                checked={editFormData.is_active}
                onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
              />
              <Label htmlFor="edit_is_active">Active (visible on website)</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateImage.isPending}>
                {updateImage.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
