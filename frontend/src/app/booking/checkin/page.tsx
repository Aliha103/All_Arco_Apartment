'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  User,
  Calendar,
  Home,
  Mail,
  Phone,
  MapPin,
  Users,
  Plus,
  Trash2,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatDate, formatCurrency } from '@/lib/utils';

// Types
interface GuestInfo {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  nationality?: string;
  passport_number?: string;
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
}

interface Booking {
  id: string;
  confirmation_code: string;
  check_in: string;
  check_out: string;
  total_amount: string;
  status: string;
  guests_count: number;
  main_guest: GuestInfo;
}

function CheckInPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState<'lookup' | 'details' | 'success'>('lookup');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [mainGuest, setMainGuest] = useState<GuestInfo>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });
  const [lookupData, setLookupData] = useState({
    confirmation: searchParams.get('confirmation') || '',
    email: searchParams.get('email') || '',
  });
  const [familyMembers, setFamilyMembers] = useState<GuestInfo[]>([]);

  // Auto-lookup if params are provided
  useEffect(() => {
    if (lookupData.confirmation && lookupData.email && step === 'lookup') {
      handleLookup();
    }
  }, []);

  // Lookup mutation
  const lookupMutation = useMutation({
    mutationFn: () => api.bookings.lookup(lookupData.confirmation, lookupData.email),
    onSuccess: (response) => {
      const data = response.data;
      // Ensure main_guest shape exists using booking fields as fallback
      const fallbackMain = {
        first_name: data?.guest_name?.split(' ')?.[0] || '',
        last_name: data?.guest_name?.split(' ')?.slice(1).join(' ') || '',
        email: data?.guest_email || lookupData.email,
        phone: data?.guest_phone || '',
      };
      const hydrated = {
        ...data,
        main_guest: data?.main_guest || fallbackMain,
      };
      setBooking(hydrated);
      setMainGuest(hydrated.main_guest);
      // Initialize family members array based on guests_count
      const guestsCount = response.data.guests_count || 1;
      const initialMembers = Array(Math.max(0, guestsCount - 1)).fill(null).map(() => ({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        nationality: '',
        passport_number: '',
        address: '',
        city: '',
        country: '',
        postal_code: '',
      }));
      setFamilyMembers(initialMembers);
      setStep('details');
      toast.success('Booking found! Please complete the check-in details.');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Booking not found. Please check your confirmation code and email.';
      toast.error(errorMessage);
    },
  });

  // Check-in submission mutation
  const checkinMutation = useMutation({
    mutationFn: (guests: GuestInfo[]) =>
      api.bookings.lookupCheckin(lookupData.confirmation, lookupData.email, guests),
    onSuccess: () => {
      setStep('success');
      toast.success('Check-in completed successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to complete check-in. Please try again.';
      toast.error(errorMessage);
    },
  });

  const handleLookup = () => {
    if (!lookupData.confirmation || !lookupData.email) {
      toast.error('Please enter both confirmation code and email');
      return;
    }
    lookupMutation.mutate();
  };

  const handleAddFamilyMember = () => {
    setFamilyMembers([
      ...familyMembers,
      {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        nationality: '',
        passport_number: '',
        address: '',
        city: '',
        country: '',
        postal_code: '',
      },
    ]);
  };

  const handleRemoveFamilyMember = (index: number) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  };

  const handleFamilyMemberChange = (index: number, field: keyof GuestInfo, value: string) => {
    const updated = [...familyMembers];
    updated[index] = { ...updated[index], [field]: value };
    setFamilyMembers(updated);
  };

  const handleSubmitCheckin = () => {
    // Validate that at least main guest info is complete
    if (!mainGuest.first_name || !mainGuest.last_name || !mainGuest.email) {
      toast.error('Please complete main guest first name, last name, and email');
      return;
    }

    // Filter out empty family members
    const validFamilyMembers = familyMembers.filter(
      (member) => member.first_name && member.last_name
    );

    // Combine main guest with family members
    const allGuests = [mainGuest, ...validFamilyMembers];

    checkinMutation.mutate(allGuests);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Online Check-In</h1>
          <p className="text-gray-600">Complete your check-in before arrival</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Step 1: Lookup */}
          {step === 'lookup' && (
            <motion.div
              key="lookup"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Find Your Booking</CardTitle>
                  <CardDescription>
                    Enter your confirmation code and email to begin check-in
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="confirmation" className="text-gray-900">
                      Confirmation Code *
                    </Label>
                    <Input
                      id="confirmation"
                      value={lookupData.confirmation}
                      onChange={(e) =>
                        setLookupData({ ...lookupData, confirmation: e.target.value })
                      }
                      placeholder="ARK-20251130-0001"
                      className="text-gray-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-900">
                      Email Address *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={lookupData.email}
                      onChange={(e) => setLookupData({ ...lookupData, email: e.target.value })}
                      placeholder="your.email@example.com"
                      className="text-gray-900"
                    />
                  </div>

                  <Button
                    onClick={handleLookup}
                    disabled={lookupMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    {lookupMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Looking up booking...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Continue
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Guest Details */}
          {step === 'details' && booking && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Booking Summary */}
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-gray-900">Booking Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Confirmation</p>
                      <p className="font-semibold text-gray-900">{booking.confirmation_code}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Check-in</p>
                      <p className="font-semibold text-gray-900">{formatDate(booking.check_in)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Check-out</p>
                      <p className="font-semibold text-gray-900">{formatDate(booking.check_out)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Main Guest (Editable) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <User className="w-5 h-5 text-blue-600" />
                    Main Guest (You)
                  </CardTitle>
                  <CardDescription>Review or update your information from the booking</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-700">First Name *</Label>
                      <Input
                        value={mainGuest.first_name}
                        onChange={(e) => setMainGuest({ ...mainGuest, first_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-700">Last Name *</Label>
                      <Input
                        value={mainGuest.last_name}
                        onChange={(e) => setMainGuest({ ...mainGuest, last_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-700">Email *</Label>
                      <Input
                        type="email"
                        value={mainGuest.email}
                        onChange={(e) => setMainGuest({ ...mainGuest, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-700">Phone</Label>
                      <Input
                        value={mainGuest.phone || ''}
                        onChange={(e) => setMainGuest({ ...mainGuest, phone: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Family Members */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-gray-900">
                        <Users className="w-5 h-5 text-purple-600" />
                        Additional Guests
                      </CardTitle>
                      <CardDescription>
                        Add information for other guests in your party ({familyMembers.length} added)
                      </CardDescription>
                    </div>
                    <Button
                      onClick={handleAddFamilyMember}
                      variant="outline"
                      size="sm"
                      className="text-gray-900"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Guest
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {familyMembers.length === 0 ? (
                    <div className="text-center py-8 text-gray-600">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No additional guests added yet</p>
                      <p className="text-sm mt-1">
                        Click "Add Guest" to register family members or travel companions
                      </p>
                    </div>
                  ) : (
                    familyMembers.map((member, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border border-gray-200 rounded-lg p-4 space-y-4"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-gray-900">Guest #{index + 2}</h3>
                          <Button
                            onClick={() => handleRemoveFamilyMember(index)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-gray-900">First Name *</Label>
                            <Input
                              value={member.first_name}
                              onChange={(e) =>
                                handleFamilyMemberChange(index, 'first_name', e.target.value)
                              }
                              placeholder="John"
                              className="text-gray-900"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-gray-900">Last Name *</Label>
                            <Input
                              value={member.last_name}
                              onChange={(e) =>
                                handleFamilyMemberChange(index, 'last_name', e.target.value)
                              }
                              placeholder="Doe"
                              className="text-gray-900"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-gray-900">Date of Birth</Label>
                            <Input
                              type="date"
                              value={member.date_of_birth}
                              onChange={(e) =>
                                handleFamilyMemberChange(index, 'date_of_birth', e.target.value)
                              }
                              className="text-gray-900"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-gray-900">Nationality</Label>
                            <Input
                              value={member.nationality}
                              onChange={(e) =>
                                handleFamilyMemberChange(index, 'nationality', e.target.value)
                              }
                              placeholder="Italian"
                              className="text-gray-900"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-gray-900">Passport Number</Label>
                            <Input
                              value={member.passport_number}
                              onChange={(e) =>
                                handleFamilyMemberChange(index, 'passport_number', e.target.value)
                              }
                              placeholder="AB123456"
                              className="text-gray-900"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-gray-900">Email</Label>
                            <Input
                              type="email"
                              value={member.email}
                              onChange={(e) =>
                                handleFamilyMemberChange(index, 'email', e.target.value)
                              }
                              placeholder="guest@example.com"
                              className="text-gray-900"
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}

                  <div className="flex items-center gap-3 pt-4 border-t">
                    <Button
                      onClick={handleSubmitCheckin}
                      disabled={checkinMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      {checkinMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Completing check-in...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Complete Check-In
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Success */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6 text-center">
                  <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Check-In Complete!
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Your online check-in has been successfully completed. We look forward to
                    welcoming you!
                  </p>
                  <div className="bg-white p-4 rounded-lg border border-green-200 mb-6">
                    <p className="text-sm text-gray-600 mb-2">Confirmation Code</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {lookupData.confirmation}
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push('/')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Return to Homepage
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <CheckInPageContent />
    </Suspense>
  );
}
