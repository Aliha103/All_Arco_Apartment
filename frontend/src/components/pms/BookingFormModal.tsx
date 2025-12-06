'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, calculateNights } from '@/lib/utils';
import { PriceCalculation } from '@/types';
import { toast } from 'sonner';

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BookingFormModal({ isOpen, onClose, onSuccess }: BookingFormModalProps) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    check_in_date: '',
    check_out_date: '',
    guests: 2,
    special_requests: '',
    send_payment_link: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Calculate price when dates and guests change
  const { data: priceCalculation } = useQuery({
    queryKey: ['price-calculation', formData.check_in_date, formData.check_out_date, formData.guests],
    queryFn: async () => {
      if (!formData.check_in_date || !formData.check_out_date) return null;
      const response = await api.pricing.calculatePrice(
        formData.check_in_date,
        formData.check_out_date,
        formData.guests
      );
      return response.data as PriceCalculation;
    },
    enabled: !!formData.check_in_date && !!formData.check_out_date && formData.guests > 0,
  });

  // Check availability
  const { data: availability } = useQuery({
    queryKey: ['availability-check', formData.check_in_date, formData.check_out_date],
    queryFn: async () => {
      if (!formData.check_in_date || !formData.check_out_date) return null;
      const response = await api.bookings.checkAvailability(
        formData.check_in_date,
        formData.check_out_date
      );
      return response.data;
    },
    enabled: !!formData.check_in_date && !!formData.check_out_date,
  });

  // Create booking mutation
  const createBooking = useMutation({
    mutationFn: (data: any) => api.bookings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['recent-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking-stats'] });
      onClose();
      resetForm();
      if (onSuccess) onSuccess();
      toast.success('Booking created successfully!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      if (errorData && typeof errorData === 'object') {
        setFormErrors(errorData);
      } else {
        toast.error(errorData?.message || 'Failed to create booking');
      }
    },
  });

  const resetForm = () => {
    setFormData({
      guest_name: '',
      guest_email: '',
      guest_phone: '',
      check_in_date: '',
      check_out_date: '',
      guests: 2,
      special_requests: '',
      send_payment_link: true,
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.guest_name.trim()) {
      errors.guest_name = 'Guest name is required';
    }
    if (!formData.guest_email.trim()) {
      errors.guest_email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guest_email)) {
      errors.guest_email = 'Invalid email format';
    }
    if (!formData.guest_phone.trim()) {
      errors.guest_phone = 'Phone is required';
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (checkIn < today) {
        errors.check_in_date = 'Check-in date cannot be in the past';
      }
      if (checkOut <= checkIn) {
        errors.check_out_date = 'Check-out must be after check-in';
      }
    }
    if (formData.guests < 1) {
      errors.guests = 'At least 1 guest required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (availability && !availability.available) {
      toast.error('Selected dates are not available');
      return;
    }

    createBooking.mutate({
      ...formData,
      status: 'pending',
      payment_status: 'pending',
    });
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const nights = formData.check_in_date && formData.check_out_date
    ? calculateNights(new Date(formData.check_in_date), new Date(formData.check_out_date))
    : 0;

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Manual Booking</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Guest Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Guest Information</h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Guest Name *</Label>
                <Input
                  value={formData.guest_name}
                  onChange={(e) => handleChange('guest_name', e.target.value)}
                  placeholder="John Doe"
                />
                {formErrors.guest_name && (
                  <p className="text-sm text-red-600">{formErrors.guest_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.guest_email}
                  onChange={(e) => handleChange('guest_email', e.target.value)}
                  placeholder="john@example.com"
                />
                {formErrors.guest_email && (
                  <p className="text-sm text-red-600">{formErrors.guest_email}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                type="tel"
                value={formData.guest_phone}
                onChange={(e) => handleChange('guest_phone', e.target.value)}
                placeholder="+1 234 567 8900"
              />
              {formErrors.guest_phone && (
                <p className="text-sm text-red-600">{formErrors.guest_phone}</p>
              )}
            </div>
          </div>

          {/* Booking Dates */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Booking Details</h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check-in Date *</Label>
                <Input
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
                <Label>Check-out Date *</Label>
                <Input
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

            <div className="space-y-2">
              <Label>Number of Guests *</Label>
              <Input
                type="number"
                min={1}
                max={6}
                value={formData.guests}
                onChange={(e) => handleChange('guests', parseInt(e.target.value) || 1)}
              />
              {formErrors.guests && (
                <p className="text-sm text-red-600">{formErrors.guests}</p>
              )}
            </div>

            {/* Availability Check */}
            {formData.check_in_date && formData.check_out_date && (
              <div className={`p-3 rounded-lg ${
                availability?.available
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                {availability?.available ? (
                  <p className="text-green-800">
                    ✓ Dates are available ({nights} night{nights !== 1 ? 's' : ''})
                  </p>
                ) : (
                  <p className="text-red-800">
                    ✗ Selected dates are not available
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Pricing Summary */}
          {priceCalculation && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Pricing Summary</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {nights} night{nights !== 1 ? 's' : ''} × {formatCurrency(priceCalculation.nightly_rate)}
                  </span>
                  <span>{formatCurrency(priceCalculation.accommodation_total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cleaning fee</span>
                  <span>{formatCurrency(priceCalculation.cleaning_fee)}</span>
                </div>
                {parseFloat(priceCalculation.extra_guest_fee) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Extra guest fee</span>
                    <span>{formatCurrency(priceCalculation.extra_guest_fee)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Tourist tax</span>
                  <span>{formatCurrency(priceCalculation.tourist_tax)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(priceCalculation.total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Special Requests */}
          <div className="space-y-2">
            <Label>Special Requests (Optional)</Label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg min-h-20"
              value={formData.special_requests}
              onChange={(e) => handleChange('special_requests', e.target.value)}
              placeholder="Any special requirements or notes from the guest..."
            />
          </div>

          {/* Payment Option */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="send_payment_link"
              checked={formData.send_payment_link}
              onChange={(e) => handleChange('send_payment_link', e.target.checked)}
            />
            <Label htmlFor="send_payment_link">
              Send payment link to guest via email
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createBooking.isPending ||
                (availability && !availability.available)
              }
            >
              {createBooking.isPending ? 'Creating...' : 'Create Booking'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
