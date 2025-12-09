/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import SiteNav from '@/app/components/SiteNav';
import SiteFooter from '@/app/components/SiteFooter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, Building2, FileText, Users, Shield, Clock, Plus, Trash } from 'lucide-react';

type Booking = {
  id: string;
  booking_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_address?: string;
  guest_tax_code?: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  number_of_guests: number;
  status: string;
  payment_status: string;
  tourist_tax: number;
  cancellation_policy?: string;
};

type GuestForm = {
  first_name: string;
  last_name: string;
  email?: string;
  country_of_birth?: string;
  birth_province?: string;
  birth_city?: string;
  document_type?: string;
  document_number?: string;
  document_issue_country?: string;
  document_issue_province?: string;
  document_issue_city?: string;
  document_selfie?: File | null;
  document_image?: File | null;
};

export const dynamic = 'force-dynamic';

export default function BookingCheckInPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);

  // Billing form
  const [billingType, setBillingType] = useState<'receipt' | 'invoice'>('receipt');
  const [billing, setBilling] = useState({
    full_name: '',
    company_name: '',
    tax_id: '',
    address: '',
    phone: '',
    notes: '',
  });

  // Guests
  const [guests, setGuests] = useState<GuestForm[]>([]);
  const [checkinDone, setCheckinDone] = useState(false);

  // Fetch booking
  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const res = await api.bookings.get(bookingId);
        const b = res.data as Booking;
        setBooking(b);
        setBilling((prev) => ({
          ...prev,
          full_name: b.guest_name || '',
          address: b.guest_address || '',
          phone: b.guest_phone || '',
          tax_id: b.guest_tax_code || '',
        }));
        const numGuests = Math.max(b.number_of_guests || 1, 1);
        setGuests(
          Array.from({ length: numGuests }).map((_, i) => ({
            first_name: i === 0 ? b.guest_name.split(' ')[0] || '' : '',
            last_name: i === 0 ? b.guest_name.split(' ').slice(1).join(' ') : '',
            email: i === 0 ? b.guest_email : '',
            country_of_birth: '',
            birth_province: '',
            birth_city: '',
            document_type: 'passport',
            document_number: '',
            document_issue_country: '',
            document_issue_province: '',
            document_issue_city: '',
            document_selfie: null,
            document_image: null,
          }))
        );
      } catch (err: any) {
        toast.error('Booking not found');
        router.push('/');
      } finally {
        setLoading(false);
      }
    };
    if (bookingId) fetchBooking();
  }, [bookingId, router]);

  const onBillingSubmit = useCallback(async () => {
    if (!booking) return;
    setSaving(true);
    try {
      const updates: any = {
        guest_phone: billing.phone,
        guest_address: billing.address,
        special_requests: billing.notes,
      };
      if (billingType === 'receipt') {
        updates.guest_name = billing.full_name || booking.guest_name;
        updates.guest_tax_code = '';
      } else {
        updates.guest_name = billing.company_name || booking.guest_name;
        updates.guest_tax_code = billing.tax_id || '';
      }
      await api.bookings.lookupUpdate(booking.booking_id, booking.guest_email, updates);
      toast.success('Billing details saved');
      setStep(2);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save billing');
    } finally {
      setSaving(false);
    }
  }, [billing, billingType, booking]);

  const onGuestsSubmit = useCallback(async () => {
    if (!booking) return;
    setSaving(true);
    try {
      // Strip file objects before sending; backend currently expects JSON
      const payloadGuests = guests.map((g, idx) => ({
        ...g,
        email: idx === 0 ? (g.email || booking.guest_email) : g.email,
        document_selfie: undefined,
        document_image: undefined,
      }));
      await api.bookings.lookupCheckin(booking.booking_id, booking.guest_email, payloadGuests);
      toast.success('Guest details saved');
      setStep(3);
      setCheckinDone(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to submit guest details');
    } finally {
      setSaving(false);
    }
  }, [booking, guests]);

  const onFinish = useCallback(() => {
    if (booking) {
      router.push(`/booking/confirmation?booking_id=${booking.id}`);
    } else {
      router.push('/');
    }
  }, [booking, router]);

  const heading = useMemo(() => {
    if (step === 1) return 'Billing details';
    if (step === 2) return 'Guest details';
    return 'City tax';
  }, [step]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <p className="text-gray-700">Booking not found.</p>
          <Link href="/" className="mt-3 inline-block">
            <Button>Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#F8F7F4] to-white text-gray-900">
      <SiteNav solid />

      <main className="pt-28 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#C4A572] uppercase tracking-[0.3em]">Online Check-in</p>
              <h1 className="text-2xl font-semibold mt-1">Booking {booking.booking_id}</h1>
              <p className="text-gray-600">
                {booking.check_in_date} → {booking.check_out_date} · {booking.nights} night{booking.nights === 1 ? '' : 's'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <Badge
                  key={s}
                  variant={step === s ? 'default' : 'outline'}
                  className={step === s ? 'bg-[#C4A572] text-white' : 'border-gray-200 text-gray-700'}
                >
                  Step {s}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-[2fr,1fr] gap-6">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <Card className="border border-amber-50 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {step === 1 && <FileText className="w-5 h-5 text-[#C4A572]" />}
                    {step === 2 && <Users className="w-5 h-5 text-[#C4A572]" />}
                    {step === 3 && <Shield className="w-5 h-5 text-[#C4A572]" />}
                    {heading}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {step === 1 && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">We’ll use these details for your receipt or invoice.</p>
                      <div className="flex gap-3">
                        <Button variant={billingType === 'receipt' ? 'default' : 'outline'} onClick={() => setBillingType('receipt')}>
                          Receipt
                        </Button>
                        <Button variant={billingType === 'invoice' ? 'default' : 'outline'} onClick={() => setBillingType('invoice')}>
                          Invoice
                        </Button>
                      </div>
                      {billingType === 'receipt' ? (
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2 flex flex-col gap-1">
                            <Label className="text-xs text-gray-600">Full name</Label>
                            <Input
                              placeholder="Full name"
                              value={billing.full_name}
                              onChange={(e) => setBilling({ ...billing, full_name: e.target.value })}
                            />
                          </div>
                          <div className="sm:col-span-2 flex flex-col gap-1">
                            <Label className="text-xs text-gray-600">Address</Label>
                            <Input
                              placeholder="Address"
                              value={billing.address}
                              onChange={(e) => setBilling({ ...billing, address: e.target.value })}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-600">Phone</Label>
                            <Input
                              placeholder="+39 ..."
                              value={billing.phone}
                              onChange={(e) => setBilling({ ...billing, phone: e.target.value })}
                            />
                          </div>
                          <div className="sm:col-span-2 flex flex-col gap-1">
                            <Label className="text-xs text-gray-600">Notes (optional)</Label>
                            <Textarea
                              placeholder="Arrival notes, billing reference…"
                              value={billing.notes}
                              onChange={(e) => setBilling({ ...billing, notes: e.target.value })}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2 flex flex-col gap-1">
                            <Label className="text-xs text-gray-600">Company name</Label>
                            <Input
                              placeholder="Company name"
                              value={billing.company_name}
                              onChange={(e) => setBilling({ ...billing, company_name: e.target.value })}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-600">VAT / Tax ID</Label>
                            <Input
                              placeholder="IT123456789"
                              value={billing.tax_id}
                              onChange={(e) => setBilling({ ...billing, tax_id: e.target.value })}
                            />
                          </div>
                          <div className="sm:col-span-2 flex flex-col gap-1">
                            <Label className="text-xs text-gray-600">Billing address</Label>
                            <Input
                              placeholder="Street, City, Country"
                              value={billing.address}
                              onChange={(e) => setBilling({ ...billing, address: e.target.value })}
                            />
                          </div>
                          <div className="sm:col-span-2 flex flex-col gap-1">
                            <Label className="text-xs text-gray-600">Notes (optional)</Label>
                            <Textarea
                              placeholder="Order reference or PO…"
                              value={billing.notes}
                              onChange={(e) => setBilling({ ...billing, notes: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex justify-end">
                        <Button onClick={onBillingSubmit} disabled={saving}>
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Continue'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-4">
                      {guests.map((guest, idx) => (
                        <Card key={idx} className="border border-gray-100">
                          <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm text-gray-700">Guest {idx + 1} {idx === 0 && '(Primary)'}</CardTitle>
                            {idx > 0 && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setGuests((prev) => prev.filter((_, i) => i !== idx))}
                              >
                                <Trash className="w-4 h-4 text-gray-500" />
                              </Button>
                            )}
                          </CardHeader>
                          <CardContent className="grid sm:grid-cols-2 gap-3">
                            <Input
                              placeholder="First name"
                              value={guest.first_name}
                              onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, first_name: e.target.value } : g))}
                            />
                            <Input
                              placeholder="Last name"
                              value={guest.last_name}
                              onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, last_name: e.target.value } : g))}
                            />
                            <Input
                              placeholder="Email (primary)"
                              value={guest.email || ''}
                              onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, email: e.target.value } : g))}
                            />
                            <Input
                              placeholder="Country of birth"
                              value={guest.country_of_birth || ''}
                              onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, country_of_birth: e.target.value } : g))}
                            />
                            <Input
                              placeholder="Birth province (Italy only)"
                              value={guest.birth_province || ''}
                              onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, birth_province: e.target.value } : g))}
                            />
                            <Input
                              placeholder="Birth city (Italy only)"
                              value={guest.birth_city || ''}
                              onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, birth_city: e.target.value } : g))}
                            />
                            <Input
                              placeholder="Document type (passport, ID)"
                              value={guest.document_type || ''}
                              onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, document_type: e.target.value } : g))}
                            />
                            <Input
                              placeholder="Document number"
                              value={guest.document_number || ''}
                              onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, document_number: e.target.value } : g))}
                            />
                            <Input
                              placeholder="Issue country"
                              value={guest.document_issue_country || ''}
                              onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, document_issue_country: e.target.value } : g))}
                            />
                            <Input
                              placeholder="Issue province (Italy documents)"
                              value={guest.document_issue_province || ''}
                              onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, document_issue_province: e.target.value } : g))}
                            />
                            <Input
                              placeholder="Issue city (Italy documents)"
                              value={guest.document_issue_city || ''}
                              onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, document_issue_city: e.target.value } : g))}
                            />
                            {idx === 0 && (
                              <div className="sm:col-span-2 grid sm:grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                  <label className="text-xs text-gray-500">Upload selfie (primary guest)</label>
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0] || null;
                                      setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, document_selfie: file } : g));
                                    }}
                                  />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-xs text-gray-500">Upload document photo</label>
                                  <Input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0] || null;
                                      setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, document_image: file } : g));
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setGuests((prev) => [...prev, {
                          first_name: '',
                          last_name: '',
                          email: '',
                          country_of_birth: '',
                          birth_province: '',
                          birth_city: '',
                          document_type: 'passport',
                          document_number: '',
                          document_issue_country: '',
                          document_issue_province: '',
                          document_issue_city: '',
                          document_selfie: null,
                          document_image: null,
                        }])}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Add guest
                      </Button>
                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                        <Button onClick={onGuestsSubmit} disabled={saving}>
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save guests'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-4 text-sm text-gray-700">
                      <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 flex gap-3">
                        <Shield className="w-5 h-5 text-emerald-600 mt-0.5" />
                        <div>
                          <p className="font-semibold text-gray-900">City tax payable at property</p>
                          <p>€{booking.tourist_tax} will be settled upon arrival. No online payment needed.</p>
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-gray-50 border border-gray-100 flex gap-3">
                        <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="font-semibold text-gray-900">Check-in / Check-out</p>
                          <p>Check-in from 15:00 · Check-out by 10:00. Arrival instructions are emailed 48h before check-in.</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        {checkinDone && (
                          <div className="flex items-center gap-2 text-emerald-700 text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Thanks! Your online check-in is complete.</span>
                          </div>
                        )}
                        <Button onClick={onFinish}>
                          Finish
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <div className="space-y-4">
              <Card className="border border-amber-50 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Stay summary</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-700 space-y-2">
                  <div className="flex justify-between">
                    <span>Guest</span>
                    <span className="font-semibold">{booking.guest_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Guests</span>
                    <span className="font-semibold">{booking.number_of_guests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dates</span>
                    <span className="font-semibold">{booking.check_in_date} → {booking.check_out_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cancellation</span>
                    <span className="font-semibold">
                      {booking.cancellation_policy === 'non_refundable'
                        ? 'Non-refundable · 10% discount'
                        : 'Flexible · Free until 24h before check-in'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
