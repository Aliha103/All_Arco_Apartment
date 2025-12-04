'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAvailability, usePriceCalculation, useCreateBooking, useCreateCheckoutSession } from '@/hooks/useBooking';
import { formatCurrency, calculateNights } from '@/lib/utils';
import Link from 'next/link';

export default function BookingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [dates, setDates] = useState({
    checkIn: '',
    checkOut: '',
  });
  const [guests, setGuests] = useState(2);
  const [guestInfo, setGuestInfo] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    special_requests: '',
  });

  const { data: availability, isLoading: checkingAvailability } = useAvailability(
    dates.checkIn,
    dates.checkOut
  );

  const { data: pricing, isLoading: calculatingPrice } = usePriceCalculation(
    dates.checkIn,
    dates.checkOut,
    guests
  );

  const createBooking = useCreateBooking();
  const createCheckout = useCreateCheckoutSession();

  const handleDateChange = (field: 'checkIn' | 'checkOut', value: string) => {
    setDates({ ...dates, [field]: value });
  };

  const handleContinueToGuest = () => {
    if (!dates.checkIn || !dates.checkOut) {
      alert('Please select check-in and check-out dates');
      return;
    }
    if (!availability?.available) {
      alert('Selected dates are not available');
      return;
    }
    setStep(2);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const bookingData = {
        check_in_date: dates.checkIn,
        check_out_date: dates.checkOut,
        guests,
        ...guestInfo,
      };

      const booking = await createBooking.mutateAsync(bookingData);

      // Create Stripe checkout session
      const checkout = await createCheckout.mutateAsync(booking.id);

      // Redirect to Stripe Checkout
      if (checkout.session_url) {
        window.location.href = checkout.session_url;
      }
    } catch (error) {
      console.error('Booking failed:', error);
      alert('Failed to create booking. Please try again.');
    }
  };

  const nights = dates.checkIn && dates.checkOut
    ? calculateNights(new Date(dates.checkIn), new Date(dates.checkOut))
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            All'Arco Apartment
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Book Your Stay</h1>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="md:col-span-2">
              {step === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Select Dates & Guests</CardTitle>
                    <CardDescription>Choose your check-in and check-out dates</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="checkIn">Check-in</Label>
                        <Input
                          id="checkIn"
                          type="date"
                          value={dates.checkIn}
                          onChange={(e) => handleDateChange('checkIn', e.target.value)}
                          min={format(new Date(), 'yyyy-MM-dd')}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="checkOut">Check-out</Label>
                        <Input
                          id="checkOut"
                          type="date"
                          value={dates.checkOut}
                          onChange={(e) => handleDateChange('checkOut', e.target.value)}
                          min={dates.checkIn || format(new Date(), 'yyyy-MM-dd')}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="guests">Number of Guests</Label>
                      <Input
                        id="guests"
                        type="number"
                        min="1"
                        max="6"
                        value={guests}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const value = parseInt(e.target.value, 10);
                          // Validate: must be a number, >= 1, <= 6
                          if (!isNaN(value) && value >= 1 && value <= 6) {
                            setGuests(value);
                          }
                        }}
                      />
                      <p className="text-sm text-gray-600">Maximum 6 guests</p>
                    </div>

                    {dates.checkIn && dates.checkOut && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-900">
                          {nights} night{nights !== 1 ? 's' : ''} selected
                        </p>
                        {checkingAvailability && (
                          <p className="text-sm text-blue-700 mt-1">Checking availability...</p>
                        )}
                        {availability?.available === false && (
                          <p className="text-sm text-red-700 mt-1">
                            ❌ Not available for selected dates
                          </p>
                        )}
                        {availability?.available === true && (
                          <p className="text-sm text-green-700 mt-1">
                            ✓ Available for selected dates
                          </p>
                        )}
                      </div>
                    )}

                    <Button
                      onClick={handleContinueToGuest}
                      disabled={!availability?.available || checkingAvailability}
                      className="w-full"
                    >
                      Continue to Guest Information
                    </Button>
                  </CardContent>
                </Card>
              )}

              {step === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Guest Information</CardTitle>
                    <CardDescription>Please provide your contact details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmitBooking} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="guest_name">Full Name</Label>
                        <Input
                          id="guest_name"
                          placeholder="John Doe"
                          value={guestInfo.guest_name}
                          onChange={(e) =>
                            setGuestInfo({ ...guestInfo, guest_name: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="guest_email">Email</Label>
                        <Input
                          id="guest_email"
                          type="email"
                          placeholder="you@example.com"
                          value={guestInfo.guest_email}
                          onChange={(e) =>
                            setGuestInfo({ ...guestInfo, guest_email: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="guest_phone">Phone</Label>
                        <Input
                          id="guest_phone"
                          type="tel"
                          placeholder="+39 123 456 7890"
                          value={guestInfo.guest_phone}
                          onChange={(e) =>
                            setGuestInfo({ ...guestInfo, guest_phone: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="special_requests">Special Requests (optional)</Label>
                        <textarea
                          id="special_requests"
                          className="w-full min-h-[100px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          placeholder="Any special requirements or requests..."
                          value={guestInfo.special_requests}
                          onChange={(e) =>
                            setGuestInfo({ ...guestInfo, special_requests: e.target.value })
                          }
                        />
                      </div>

                      <div className="flex gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setStep(1)}
                          className="flex-1"
                        >
                          Back
                        </Button>
                        <Button
                          type="submit"
                          disabled={createBooking.isPending || createCheckout.isPending}
                          className="flex-1"
                        >
                          {createBooking.isPending || createCheckout.isPending
                            ? 'Processing...'
                            : 'Proceed to Payment'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Price Summary */}
            <div>
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Price Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pricing ? (
                    <>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            {formatCurrency(pricing.nightly_rate)} × {nights} nights
                          </span>
                          <span>{formatCurrency(pricing.accommodation_total)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cleaning fee</span>
                          <span>{formatCurrency(pricing.cleaning_fee)}</span>
                        </div>
                        {parseFloat(pricing.extra_guest_fee) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Extra guest fee</span>
                            <span>{formatCurrency(pricing.extra_guest_fee)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tourist tax</span>
                          <span>{formatCurrency(pricing.tourist_tax)}</span>
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total</span>
                          <span>{formatCurrency(pricing.total)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Select dates to see pricing
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
