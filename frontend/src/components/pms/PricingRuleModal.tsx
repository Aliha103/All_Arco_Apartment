'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PricingRule } from '@/types';

interface PricingRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule?: PricingRule | null;
  onSuccess?: () => void;
}

export default function PricingRuleModal({
  isOpen,
  onClose,
  rule,
  onSuccess,
}: PricingRuleModalProps) {
  const queryClient = useQueryClient();
  const isEditMode = !!rule;

  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    nightly_rate: '',
    is_active: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Initialize form with rule data when editing
  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        start_date: rule.start_date,
        end_date: rule.end_date,
        nightly_rate: rule.nightly_rate,
        is_active: rule.is_active,
      });
    } else {
      setFormData({
        name: '',
        start_date: '',
        end_date: '',
        nightly_rate: '',
        is_active: true,
      });
    }
    setFormErrors({});
  }, [rule, isOpen]);

  // Create rule mutation
  const createRule = useMutation({
    mutationFn: (data: any) => api.pricing.createRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
      handleClose();
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      if (errorData && typeof errorData === 'object') {
        setFormErrors(errorData);
      } else {
        alert(errorData?.message || 'Failed to create pricing rule');
      }
    },
  });

  // Update rule mutation
  const updateRule = useMutation({
    mutationFn: (data: any) => api.pricing.updateRule(rule!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
      handleClose();
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      if (errorData && typeof errorData === 'object') {
        setFormErrors(errorData);
      } else {
        alert(errorData?.message || 'Failed to update pricing rule');
      }
    },
  });

  const handleClose = () => {
    setFormData({
      name: '',
      start_date: '',
      end_date: '',
      nightly_rate: '',
      is_active: true,
    });
    setFormErrors({});
    onClose();
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    if (!formData.start_date) {
      errors.start_date = 'Start date is required';
    }
    if (!formData.end_date) {
      errors.end_date = 'End date is required';
    }
    if (formData.start_date && formData.end_date) {
      if (new Date(formData.end_date) < new Date(formData.start_date)) {
        errors.end_date = 'End date must be after start date';
      }
    }
    if (!formData.nightly_rate || parseFloat(formData.nightly_rate) <= 0) {
      errors.nightly_rate = 'Nightly rate must be greater than 0';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (isEditMode) {
      updateRule.mutate(formData);
    } else {
      createRule.mutate(formData);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const isPending = createRule.isPending || updateRule.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Pricing Rule' : 'Create Pricing Rule'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Rule Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Summer High Season, Christmas Period"
            />
            {formErrors.name && (
              <p className="text-sm text-red-600">{formErrors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
              />
              {formErrors.start_date && (
                <p className="text-sm text-red-600">{formErrors.start_date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>End Date *</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
                min={formData.start_date}
              />
              {formErrors.end_date && (
                <p className="text-sm text-red-600">{formErrors.end_date}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nightly Rate (EUR) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.nightly_rate}
              onChange={(e) => handleChange('nightly_rate', e.target.value)}
              placeholder="150.00"
            />
            {formErrors.nightly_rate && (
              <p className="text-sm text-red-600">{formErrors.nightly_rate}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleChange('is_active', e.target.checked)}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              When multiple rules overlap, the highest rate will be applied.
              If no seasonal rules match, the default nightly rate will be used.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditMode ? 'Updating...' : 'Creating...'
                : isEditMode ? 'Update Rule' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
