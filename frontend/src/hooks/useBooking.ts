/**
 * Booking hooks for availability and booking creation
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { AvailabilityCheck, PriceCalculation } from '@/types';

export function useAvailability(checkIn?: string, checkOut?: string) {
  return useQuery<AvailabilityCheck>({
    queryKey: ['availability', checkIn, checkOut],
    queryFn: async () => {
      if (!checkIn || !checkOut) return { available: false };
      const response = await api.bookings.checkAvailability(checkIn, checkOut);
      return response.data;
    },
    enabled: !!checkIn && !!checkOut,
  });
}

export function usePriceCalculation(checkIn?: string, checkOut?: string, guests?: number) {
  return useQuery<PriceCalculation>({
    queryKey: ['price', checkIn, checkOut, guests],
    queryFn: async () => {
      if (!checkIn || !checkOut || !guests) throw new Error('Missing parameters');
      const response = await api.pricing.calculatePrice(checkIn, checkOut, guests);
      return response.data;
    },
    enabled: !!checkIn && !!checkOut && !!guests,
  });
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: async (bookingData: any) => {
      const response = await api.bookings.create(bookingData);
      return response.data;
    },
  });
}

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await api.payments.createCheckoutSession(bookingId);
      return response.data;
    },
  });
}
