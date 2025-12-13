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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, Building2, FileText, Users, Shield, Clock, Plus, Trash, Check, ChevronDown, ChevronUp, Info } from 'lucide-react';
const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia',
  'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia',
  'Cameroon', 'Canada', 'Cape Verde', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
  'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador',
  'Estonia', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece',
  'Guatemala', 'Guinea', 'Guyana', 'Haiti', 'Honduras', 'Hong Kong', 'Hungary', 'Iceland', 'India', 'Indonesia',
  'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait',
  'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania',
  'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Mauritania', 'Mauritius', 'Mexico',
  'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nepal',
  'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Macedonia', 'Norway', 'Oman', 'Pakistan',
  'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania',
  'Russia', 'Rwanda', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia',
  'Slovenia', 'Somalia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sudan', 'Sweden', 'Switzerland',
  'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
  'Turkmenistan', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay',
  'Uzbekistan', 'Venezuela', 'Vietnam', 'Zambia', 'Zimbabwe'
];
const RELATIONSHIP_OPTIONS = ['Spouse/Partner', 'Child', 'Sibling', 'Parent', 'Friend/Group', 'Colleague', 'Other'];

type Booking = {
  id: string;
  booking_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_address?: string;
  guest_tax_code?: string;
  guest_country?: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  number_of_guests: number;
  status: string;
  payment_status: string;
  tourist_tax: number;
  cancellation_policy?: string;
  city_tax_payment_status?: string;
  city_tax_paid_at?: string;
  eta_checkin_time?: string;
  eta_checkout_time?: string;
  checkin_draft?: boolean;
};

type GuestForm = {
  first_name: string;
  last_name: string;
  email?: string;
  relationship?: string;
  country_of_birth?: string;
  date_of_birth?: string;
  birth_province?: string;
  birth_city?: string;
  document_type?: string;
  document_number?: string;
  document_issue_country?: string;
  document_issue_date?: string;
  document_expire_date?: string;
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
    first_name: '',
    last_name: '',
    company_name: '',
    company_email: '',
    tax_id: '',
    tax_code: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    phone: '',
    notes: '',
  });

  // Guests
  const [guests, setGuests] = useState<GuestForm[]>([]);
  const [checkinDone, setCheckinDone] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [showFullPolicy, setShowFullPolicy] = useState(false);
  const [expandedGuests, setExpandedGuests] = useState<Set<number>>(new Set([0])); // Primary guest expanded by default
  const progress = useMemo(() => (step / 3) * 100, [step]);

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
          first_name: b.guest_name ? b.guest_name.split(' ')[0] : '',
          last_name: b.guest_name ? b.guest_name.split(' ').slice(1).join(' ') : '',
          address: b.guest_address || '',
          country: b.guest_country || '',
          phone: b.guest_phone || '',
          tax_id: b.guest_tax_code || '',
          tax_code: b.guest_tax_code || '',
        }));
        const numGuests = Math.max(b.number_of_guests || 1, 1);
        setGuests(
          Array.from({ length: numGuests }).map((_, i) => ({
            first_name: i === 0 ? b.guest_name.split(' ')[0] || '' : '',
            last_name: i === 0 ? b.guest_name.split(' ').slice(1).join(' ') : '',
            email: i === 0 ? b.guest_email : '',
            relationship: i === 0 ? 'primary' : '',
            country_of_birth: '',
            date_of_birth: '',
            birth_province: '',
            birth_city: '',
            document_type: 'passport',
            document_number: '',
            document_issue_country: '',
            document_issue_date: '',
            document_expire_date: '',
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
      const combinedAddress = [billing.address, billing.city, billing.state, billing.zip].filter(Boolean).join(', ');
      const updates: any = {
        guest_phone: billing.phone,
        guest_address: combinedAddress || billing.address,
        guest_country: billing.country,
        special_requests: billing.notes,
      };
      if (billingType === 'receipt') {
        if (!billing.first_name.trim() || !billing.last_name.trim()) {
          toast.error('First and last name are required for receipt.');
          setSaving(false);
          return;
        }
        const name = `${billing.first_name} ${billing.last_name}`.trim();
        updates.guest_name = name;
        updates.guest_tax_code = billing.tax_code || '';
      } else {
        updates.guest_name = billing.company_name || booking.guest_name;
        updates.guest_tax_code = billing.tax_id || billing.tax_code || '';
        if (billing.company_email) {
          updates.guest_email = billing.company_email;
        }
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

  const computeAge = useCallback((dob?: string) => {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }, []);

  const onGuestsSubmit = useCallback(async () => {
    if (!booking) return;

    // Basic validation
    if (!consentAccepted) {
      toast.error('Please accept the privacy policy to continue.');
      return;
    }

    for (let i = 0; i < guests.length; i++) {
      const g = guests[i];
      const isPrimary = i === 0;
      const needDocProvince = (g.country_of_birth === 'Italy') || (g.document_issue_country === 'Italy');

      if (!g.first_name?.trim() || !g.last_name?.trim()) {
        toast.error(`Guest ${i + 1}: first and last name are required.`);
        return;
      }
      if (!isPrimary && !g.relationship?.trim()) {
        toast.error(`Guest ${i + 1}: relationship to primary guest is required.`);
        return;
      }
      if (!g.country_of_birth?.trim()) {
        toast.error(`Guest ${i + 1}: country of birth is required.`);
        return;
      }
      if (!g.date_of_birth?.trim()) {
        toast.error(`Guest ${i + 1}: date of birth is required.`);
        return;
      }

      if (isPrimary) {
        // Debug log to see what values we have
        console.log('Primary guest document data:', {
          document_type: g.document_type,
          document_number: g.document_number,
          document_issue_country: g.document_issue_country,
          document_issue_date: g.document_issue_date,
          document_expire_date: g.document_expire_date,
        });

        // Check each field individually to provide specific error messages
        if (!g.document_type?.trim()) {
          toast.error(`Primary guest: document type is required. Current value: "${g.document_type || 'empty'}"`);
          return;
        }
        if (!g.document_number?.trim()) {
          toast.error(`Primary guest: document number is required. Current value: "${g.document_number || 'empty'}"`);
          return;
        }
        if (!g.document_issue_country?.trim()) {
          toast.error(`Primary guest: document issue country is required. Current value: "${g.document_issue_country || 'empty'}"`);
          return;
        }
        if (!g.document_issue_date?.trim()) {
          toast.error(`Primary guest: document issue date is required. Current value: "${g.document_issue_date || 'empty'}"`);
          return;
        }
        if (!g.document_expire_date?.trim()) {
          toast.error(`Primary guest: document expiry date is required. Current value: "${g.document_expire_date || 'empty'}"`);
          return;
        }
        if (needDocProvince) {
          if (!g.birth_province || !g.birth_city) {
            toast.error('Primary guest: birth province and city required for Italy.');
            return;
          }
          if (!g.document_issue_province || !g.document_issue_city) {
            toast.error('Primary guest: document issue province and city required for Italy.');
            return;
          }
        }
      } else {
        // non-primary: documents optional
      }
    }

    setSaving(true);
    try {
      // Strip file objects before sending; backend currently expects JSON
      const payloadGuests = guests.map((g, idx) => {
        const isPrimary = idx === 0;
        const cleaned: any = {
          ...g,
          email: isPrimary ? (g.email || booking.guest_email) : g.email,
          document_selfie: undefined,
          document_image: undefined,
        };

        // Drop optional fields if empty to avoid backend date parsing errors
        const optionalKeys = [
          'birth_province',
          'birth_city',
          'document_issue_country',
          'document_issue_date',
          'document_expire_date',
          'document_issue_province',
          'document_issue_city',
          'relationship',
        ];
        optionalKeys.forEach((key) => {
          if (cleaned[key] === '') cleaned[key] = undefined;
        });

        // Non-primary guests: document fields are optional, strip empties entirely
        if (!isPrimary) {
          const docKeys = [
            'document_type',
            'document_number',
            'document_issue_country',
            'document_issue_date',
            'document_expire_date',
            'document_issue_province',
            'document_issue_city',
          ];
          docKeys.forEach((key) => {
            if (!cleaned[key]) {
              delete cleaned[key];
            }
          });
        }

        return cleaned;
      });
      await api.bookings.lookupCheckin(booking.booking_id, booking.guest_email, payloadGuests);
      toast.success('Guest details saved');
      setStep(3);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to submit guest details');
    } finally {
      setSaving(false);
    }
  }, [booking, consentAccepted, guests]);

  const [etaCheckin, setEtaCheckin] = useState('');
  const [etaCheckout, setEtaCheckout] = useState('');
  const [cityTaxAck, setCityTaxAck] = useState(true);
  const [cityTaxPaying, setCityTaxPaying] = useState(false);

  const onPayCityTax = useCallback(async () => {
    if (!booking) return;
    setCityTaxPaying(true);
    try {
      const resp = await api.payments.createCityTaxSession(booking.id);
      const url = resp.data?.session_url;
      if (url) {
        window.location.href = url;
      } else {
        toast.error('Unable to start city tax payment.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to start city tax payment.');
    } finally {
      setCityTaxPaying(false);
    }
  }, [booking]);

  const onFinish = useCallback(async () => {
    if (!booking) return;
    if (booking.city_tax_payment_status !== 'paid') {
      toast.error('Please pay city tax online before finishing check-in.');
      return;
    }
    if (!etaCheckin || !etaCheckout) {
      toast.error('Please provide estimated check-in and check-out times.');
      return;
    }
    setSaving(true);
    try {
      await api.bookings.completeCheckin(booking.id, {
        eta_checkin: etaCheckin,
        eta_checkout: etaCheckout,
        city_tax_acknowledged: cityTaxAck,
        guest_email: booking.guest_email,
      });
      setCheckinDone(true);
      router.push(`/booking/confirmation?booking_id=${booking.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to finalize check-in');
    } finally {
      setSaving(false);
    }
  }, [booking, etaCheckin, etaCheckout, cityTaxAck, router]);

  const onSaveDraft = useCallback(async () => {
    if (!booking) return;
    setSaving(true);
    try {
      await api.bookings.completeCheckin(booking.id, {
        eta_checkin: etaCheckin,
        eta_checkout: etaCheckout,
        city_tax_acknowledged: cityTaxAck,
        guest_email: booking.guest_email,
        draft: true,
      });
      toast.success('Draft saved. You can return to finish later.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  }, [booking, etaCheckin, etaCheckout, cityTaxAck]);

  const heading = useMemo(() => {
    if (step === 1) return 'Billing details';
    if (step === 2) return 'Guest details';
    return 'City tax';
  }, [step]);

  // Prefill ETA and resume step if draft exists
  useEffect(() => {
    if (!booking) return;
    if (booking.eta_checkin_time) setEtaCheckin(booking.eta_checkin_time);
    if (booking.eta_checkout_time) setEtaCheckout(booking.eta_checkout_time);
    if (booking.city_tax_payment_status === 'paid') setCityTaxAck(true);
    if (booking.checkin_draft) setStep(3);
  }, [booking]);

  // Load saved guest details for draft resume
  useEffect(() => {
    const fetchSavedGuests = async () => {
      if (!booking) return;
      try {
        const resp = await api.bookings.resumeCheckin(booking.id, booking.guest_email);
        const savedGuests = resp.data?.guests;
        if (Array.isArray(savedGuests) && savedGuests.length > 0) {
          const mapped = savedGuests.map((g: any) => ({
            first_name: g.first_name || '',
            last_name: g.last_name || '',
            email: g.email || '',
            relationship: g.relationship || (g.is_primary ? 'primary' : ''),
            country_of_birth: g.country_of_birth || '',
            date_of_birth: g.date_of_birth || '',
            birth_province: g.birth_province || '',
            birth_city: g.birth_city || '',
            document_type: g.document_type || '',
            document_number: g.document_number || '',
            document_issue_country: g.document_issue_country || '',
            document_issue_date: g.document_issue_date || '',
            document_expire_date: g.document_expire_date || '',
            document_issue_province: g.document_issue_province || '',
            document_issue_city: g.document_issue_city || '',
            document_selfie: null,
            document_image: null,
          }));
          setGuests(mapped);
          setStep(3);
        }
      } catch (err) {
        // Ignore errors; fallback to defaults
      }
    };
    fetchSavedGuests();
  }, [booking]);

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
          {/* Header */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#C4A572] uppercase tracking-[0.3em]">Online Check-in</p>
                <h1 className="text-3xl font-bold mt-1">Booking {booking.booking_id}</h1>
                <p className="text-gray-600 mt-1">
                  {booking.check_in_date} → {booking.check_out_date} · {booking.nights} night{booking.nights === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            {/* Enhanced Step Navigation */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                {[
                  { num: 1, title: 'Billing', icon: FileText, desc: 'Billing details' },
                  { num: 2, title: 'Guests', icon: Users, desc: 'Guest information' },
                  { num: 3, title: 'Complete', icon: CheckCircle2, desc: 'City tax & finish' }
                ].map((s, idx) => (
                  <div key={s.num} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                        ${step > s.num ? 'bg-emerald-500 text-white' :
                          step === s.num ? 'bg-[#C4A572] text-white shadow-lg scale-110' :
                          'bg-gray-200 text-gray-500'}
                      `}>
                        {step > s.num ? <Check className="w-5 h-5" /> : s.num}
                      </div>
                      <div className={`mt-2 text-center hidden sm:block ${
                        step === s.num ? 'text-gray-900 font-semibold' : 'text-gray-500'
                      }`}>
                        <p className="text-xs">{s.title}</p>
                      </div>
                    </div>
                    {idx < 2 && (
                      <div className={`h-0.5 flex-1 -mt-5 transition-all ${
                        step > s.num ? 'bg-emerald-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                <motion.div
                  className="h-full bg-[#C4A572] transition-all"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                />
              </div>
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
                    <div className="space-y-6">
                      {/* Billing Type Selection */}
                      <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/80 to-amber-50/40 p-5">
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-[#C4A572]/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-[#C4A572]" />
                          </div>
                          <div>
                           <p className="font-semibold text-gray-900 text-base">Billing preference</p>
                            <p className="text-sm text-gray-600 mt-1">Use a receipt for personal stays or an invoice for business. A PDF copy will be emailed.</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button
                            variant={billingType === 'receipt' ? 'default' : 'outline'}
                            className={`h-11 px-6 text-sm font-medium transition-all ${
                              billingType === 'receipt'
                                ? 'bg-[#C4A572] hover:bg-[#B39562] text-white border-0 shadow-md'
                                : 'border-2 border-gray-300 hover:border-[#C4A572] hover:bg-amber-50'
                            }`}
                            onClick={() => setBillingType('receipt')}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Receipt
                          </Button>
                          <Button
                            variant={billingType === 'invoice' ? 'default' : 'outline'}
                            className={`h-11 px-6 text-sm font-medium transition-all ${
                              billingType === 'invoice'
                                ? 'bg-[#C4A572] hover:bg-[#B39562] text-white border-0 shadow-md'
                                : 'border-2 border-gray-300 hover:border-[#C4A572] hover:bg-amber-50'
                            }`}
                            onClick={() => setBillingType('invoice')}
                          >
                            <Building2 className="w-4 h-4 mr-2" />
                            Invoice
                          </Button>
                        </div>
                      </div>

                      {/* Form Fields with Sections */}
                      <div className="space-y-6">
                        {billingType === 'receipt' ? (
                          <>
                            {/* Personal Information */}
                            <div className="space-y-4">
                              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                <div className="w-1 h-4 bg-[#C4A572] rounded"></div>
                                Personal Information
                              </h3>
                              <div className="grid sm:grid-cols-2 gap-4 pl-3">
                                <div className="flex flex-col gap-2">
                                  <Label className="text-sm font-medium text-gray-700">First name <span className="text-red-500">*</span></Label>
                                  <Input
                                    placeholder="John"
                                    value={billing.first_name}
                                    onChange={(e) => setBilling({ ...billing, first_name: e.target.value })}
                                    className="h-11"
                                  />
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Label className="text-sm font-medium text-gray-700">Last name <span className="text-red-500">*</span></Label>
                                  <Input
                                    placeholder="Doe"
                                    value={billing.last_name}
                                    onChange={(e) => setBilling({ ...billing, last_name: e.target.value })}
                                    className="h-11"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Address Information */}
                            <div className="space-y-4">
                              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                <div className="w-1 h-4 bg-[#C4A572] rounded"></div>
                                Address
                              </h3>
                              <div className="grid gap-4 pl-3">
                                <div className="flex flex-col gap-2">
                                  <Label className="text-sm font-medium text-gray-700">Street address</Label>
                                  <Input
                                    placeholder="123 Main Street"
                                    value={billing.address}
                                    onChange={(e) => setBilling({ ...billing, address: e.target.value })}
                                    className="h-11"
                                  />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-medium text-gray-700">City</Label>
                                    <Input
                                      placeholder="Venice"
                                      value={billing.city}
                                      onChange={(e) => setBilling({ ...billing, city: e.target.value })}
                                      className="h-11"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-medium text-gray-700">State/Province</Label>
                                    <Input
                                      placeholder="VE"
                                      value={billing.state}
                                      onChange={(e) => setBilling({ ...billing, state: e.target.value })}
                                      className="h-11"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-medium text-gray-700">ZIP/Postal</Label>
                                    <Input
                                      placeholder="30100"
                                      value={billing.zip}
                                      onChange={(e) => setBilling({ ...billing, zip: e.target.value })}
                                      className="h-11"
                                    />
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Label className="text-sm font-medium text-gray-700">Country</Label>
                                  <select
                                    className="w-full h-11 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#C4A572] focus:border-[#C4A572] transition-all"
                                    value={billing.country}
                                    onChange={(e) => setBilling({ ...billing, country: e.target.value })}
                                  >
                                    <option value="">Select country</option>
                                    {COUNTRIES.map((c) => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Additional Information */}
                            <div className="space-y-4">
                              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                <div className="w-1 h-4 bg-[#C4A572] rounded"></div>
                                Additional Information
                              </h3>
                              <div className="grid sm:grid-cols-2 gap-4 pl-3">
                                <div className="flex flex-col gap-2">
                                  <Label className="text-sm font-medium text-gray-700">Tax code <span className="text-gray-400 text-xs">(optional)</span></Label>
                                  <Input
                                    placeholder="Codice fiscale"
                                    value={billing.tax_code}
                                    onChange={(e) => setBilling({ ...billing, tax_code: e.target.value })}
                                    className="h-11"
                                  />
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Label className="text-sm font-medium text-gray-700">Phone</Label>
                                  <Input
                                    placeholder="+39 123 456 7890"
                                    value={billing.phone}
                                    onChange={(e) => setBilling({ ...billing, phone: e.target.value })}
                                    className="h-11"
                                  />
                                </div>
                                <div className="sm:col-span-2 flex flex-col gap-2">
                                  <Label className="text-sm font-medium text-gray-700">Notes <span className="text-gray-400 text-xs">(optional)</span></Label>
                                  <Textarea
                                    placeholder="Arrival notes, billing reference, or special requests..."
                                    value={billing.notes}
                                    onChange={(e) => setBilling({ ...billing, notes: e.target.value })}
                                    className="min-h-[100px] resize-y"
                                  />
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Company Information */}
                            <div className="space-y-4">
                              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                <div className="w-1 h-4 bg-[#C4A572] rounded"></div>
                                Company Information
                              </h3>
                              <div className="grid gap-4 pl-3">
                                <div className="flex flex-col gap-2">
                                  <Label className="text-sm font-medium text-gray-700">Company name <span className="text-red-500">*</span></Label>
                                  <Input
                                    placeholder="Acme Corporation"
                                    value={billing.company_name}
                                    onChange={(e) => setBilling({ ...billing, company_name: e.target.value })}
                                    className="h-11"
                                  />
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Label className="text-sm font-medium text-gray-700">Company email <span className="text-gray-400 text-xs">(optional)</span></Label>
                                  <Input
                                    type="email"
                                    placeholder="billing@company.com"
                                    value={billing.company_email}
                                    onChange={(e) => setBilling({ ...billing, company_email: e.target.value })}
                                    className="h-11"
                                  />
                                </div>
                                <div className="grid sm:grid-cols-2 gap-4">
                                  <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-medium text-gray-700">VAT Code <span className="text-gray-400 text-xs">(optional)</span></Label>
                                    <Input
                                      placeholder="IT12345678901"
                                      value={billing.tax_id}
                                      onChange={(e) => setBilling({ ...billing, tax_id: e.target.value })}
                                      className="h-11"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-medium text-gray-700">Tax Code <span className="text-gray-400 text-xs">(optional)</span></Label>
                                    <Input
                                      placeholder="Codice fiscale"
                                      value={billing.tax_code}
                                      onChange={(e) => setBilling({ ...billing, tax_code: e.target.value })}
                                      className="h-11"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Billing Address */}
                            <div className="space-y-4">
                              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                <div className="w-1 h-4 bg-[#C4A572] rounded"></div>
                                Billing Address
                              </h3>
                              <div className="grid gap-4 pl-3">
                                <div className="flex flex-col gap-2">
                                  <Label className="text-sm font-medium text-gray-700">Street address</Label>
                                  <Input
                                    placeholder="123 Business Street"
                                    value={billing.address}
                                    onChange={(e) => setBilling({ ...billing, address: e.target.value })}
                                    className="h-11"
                                  />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-medium text-gray-700">City</Label>
                                    <Input
                                      placeholder="Milan"
                                      value={billing.city}
                                      onChange={(e) => setBilling({ ...billing, city: e.target.value })}
                                      className="h-11"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-medium text-gray-700">State/Province</Label>
                                    <Input
                                      placeholder="MI"
                                      value={billing.state}
                                      onChange={(e) => setBilling({ ...billing, state: e.target.value })}
                                      className="h-11"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-medium text-gray-700">ZIP/Postal</Label>
                                    <Input
                                      placeholder="20100"
                                      value={billing.zip}
                                      onChange={(e) => setBilling({ ...billing, zip: e.target.value })}
                                      className="h-11"
                                    />
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Label className="text-sm font-medium text-gray-700">Country</Label>
                                  <select
                                    className="w-full h-11 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#C4A572] focus:border-[#C4A572] transition-all"
                                    value={billing.country}
                                    onChange={(e) => setBilling({ ...billing, country: e.target.value })}
                                  >
                                    <option value="">Select country</option>
                                    {COUNTRIES.map((c) => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Contact Information */}
                            <div className="space-y-4">
                              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                <div className="w-1 h-4 bg-[#C4A572] rounded"></div>
                                Contact Information
                              </h3>
                              <div className="grid gap-4 pl-3">
                                <div className="flex flex-col gap-2">
                                  <Label className="text-sm font-medium text-gray-700">Phone</Label>
                                  <Input
                                    placeholder="+39 123 456 7890"
                                    value={billing.phone}
                                    onChange={(e) => setBilling({ ...billing, phone: e.target.value })}
                                    className="h-11"
                                  />
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Label className="text-sm font-medium text-gray-700">Notes <span className="text-gray-400 text-xs">(optional)</span></Label>
                                  <Textarea
                                    placeholder="Order reference, PO number, or special billing instructions..."
                                    value={billing.notes}
                                    onChange={(e) => setBilling({ ...billing, notes: e.target.value })}
                                    className="min-h-[100px] resize-y"
                                  />
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex justify-end pt-4 border-t border-gray-200">
                        <Button
                          onClick={onBillingSubmit}
                          disabled={saving}
                          className="h-12 px-8 bg-[#C4A572] hover:bg-[#B39562] text-white font-semibold shadow-lg transition-all"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin mr-2" />
                              Saving...
                            </>
                          ) : (
                            <>
                              Save & Continue
                              <Check className="w-5 h-5 ml-2" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-6">
                      {/* Privacy & Consent */}
                      <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-blue-50/40 p-5">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Shield className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-base">Privacy & consent</p>
                            <p className="text-sm text-gray-600 mt-1">
                              We process guest data for check-in, ID verification, and legal compliance. Document photos are not stored beyond your stay.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mb-3 transition-colors"
                          onClick={() => setShowFullPolicy((prev) => !prev)}
                        >
                          {showFullPolicy ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              Hide full policy
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              Read full policy
                            </>
                          )}
                        </button>
                        {showFullPolicy && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="max-h-64 overflow-y-auto mb-4 p-4 rounded-lg border border-blue-200 text-xs leading-relaxed text-gray-700 bg-white space-y-2 shadow-inner"
                          >
                            <p className="font-semibold text-gray-900">Privacy Policy - Online Check-in</p>
                            <p>Pursuant to Article 13 of EU Regulation 2016/679, we process personal data you provide for online check-in and related services.</p>
                            <p><strong>Data Controller:</strong> Ali Hassan Cheema - IT, Chirignago-Zelarino, email support@allarcoapartment.com.</p>
                            <p><strong>Data processed:</strong> main guest identity, contact, document details & selfie, stay dates; group member names, dates/places of birth, nationality.</p>
                            <p><strong>Purposes:</strong> check-in & ID verification; contract/tourist tax; legal obligations; optional newsletter; defense of rights.</p>
                            <p><strong>Legal bases:</strong> contract, legal obligation, consent (newsletter), legitimate interest.</p>
                            <p><strong>Retention:</strong> document photos/selfie 7 days; other booking data up to 2 years or as required by law; newsletter until consent withdrawn.</p>
                            <p><strong>Rights:</strong> access, rectify, erase, restrict, portability, object, withdraw consent; complaints to Italian Garante.</p>
                            <p><strong>Provision:</strong> mandatory for check-in/legal duties; optional for newsletter.</p>
                          </motion.div>
                        )}
                        <label className="inline-flex items-start gap-3 text-sm text-gray-800 cursor-pointer group">
                          <input
                            type="checkbox"
                            className="h-5 w-5 mt-0.5 rounded border-gray-300 text-[#C4A572] focus:ring-[#C4A572] cursor-pointer"
                            checked={consentAccepted}
                            onChange={(e) => setConsentAccepted(e.target.checked)}
                          />
                          <span className="group-hover:text-gray-900 transition-colors">I have read and accept the Privacy Policy for online check-in. <span className="text-red-500">*</span></span>
                        </label>
                      </div>

                      {/* Guest Cards */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-[#C4A572]" />
                            Guest Information
                          </h3>
                          <span className="text-sm text-gray-500">{guests.length} {guests.length === 1 ? 'guest' : 'guests'}</span>
                        </div>

                        {guests.map((guest, idx) => {
                          const isExpanded = expandedGuests.has(idx);
                          const isPrimary = idx === 0;
                          const isItalian = guest.country_of_birth === 'Italy';
                          const isItalianDoc = guest.document_issue_country === 'Italy';
                          const age = computeAge(guest.date_of_birth);

                          return (
                            <Card key={idx} className="border-2 border-gray-200 hover:border-[#C4A572]/50 transition-all">
                              <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-white">
                                <div className="flex items-center justify-between">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedGuests((prev) => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(idx)) {
                                        newSet.delete(idx);
                                      } else {
                                        newSet.add(idx);
                                      }
                                      return newSet;
                                    })}
                                    className="flex items-center gap-3 flex-1 text-left group"
                                  >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                                      isPrimary ? 'bg-[#C4A572] text-white' : 'bg-gray-200 text-gray-700'
                                    }`}>
                                      {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                      <CardTitle className="text-base font-semibold text-gray-900 group-hover:text-[#C4A572] transition-colors">
                                        Guest {idx + 1} {isPrimary && '(Primary)'}
                                      </CardTitle>
                                      {!isExpanded && (
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                          {guest.first_name && guest.last_name && (
                                            <span>{guest.first_name} {guest.last_name}</span>
                                          )}
                                          {age !== null && <Badge variant="outline" className="text-xs">{age} yrs</Badge>}
                                        </div>
                                      )}
                                      {!isExpanded && guest.first_name && guest.last_name && (
                                        <p className="text-sm text-gray-600 mt-0.5">{guest.first_name} {guest.last_name}</p>
                                      )}
                                    </div>
                                    <div className="text-gray-400 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                      <ChevronDown className="w-5 h-5" />
                                    </div>
                                  </button>
                                  {idx > 0 && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => setGuests((prev) => {
                                        setExpandedGuests((expPrev) => {
                                          const newSet = new Set(expPrev);
                                          newSet.delete(idx);
                                          return newSet;
                                        });
                                        return prev.filter((_, i) => i !== idx);
                                      })}
                                      className="ml-2 hover:bg-red-50 hover:text-red-600"
                                    >
                                      <Trash className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </CardHeader>
                              {isExpanded && (
                                <CardContent className="pt-4 space-y-5">
                                  {/* Basic Information */}
                                  <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                      <div className="w-1 h-3 bg-[#C4A572] rounded"></div>
                                      Basic Information
                                    </h4>
                                    <div className="grid sm:grid-cols-2 gap-4 pl-3">
                                      <div className="flex flex-col gap-2">
                                        <Label className="text-sm font-medium text-gray-700">First name <span className="text-red-500">*</span></Label>
                                        <Input
                                          placeholder="John"
                                          value={guest.first_name}
                                          onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, first_name: e.target.value } : g))}
                                          className="h-11"
                                        />
                                      </div>
                                      <div className="flex flex-col gap-2">
                                        <Label className="text-sm font-medium text-gray-700">Last name <span className="text-red-500">*</span></Label>
                                        <Input
                                          placeholder="Doe"
                                          value={guest.last_name}
                                          onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, last_name: e.target.value } : g))}
                                          className="h-11"
                                        />
                                      </div>
                                      {!isPrimary && (
                                        <div className="flex flex-col gap-2 sm:col-span-2">
                                          <Label className="text-sm font-medium text-gray-700">Relationship to primary <span className="text-red-500">*</span></Label>
                                          <select
                                            className="w-full h-11 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#C4A572] focus:border-[#C4A572] transition-all"
                                            value={guest.relationship || ''}
                                            onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, relationship: e.target.value } : g))}
                                          >
                                            <option value="">Select relationship</option>
                                            {RELATIONSHIP_OPTIONS.map((opt) => (
                                              <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                          </select>
                                        </div>
                                      )}
                                      {isPrimary && (
                                        <div className="sm:col-span-2 flex flex-col gap-2">
                                          <Label className="text-sm font-medium text-gray-700">Email</Label>
                                          <Input
                                            type="email"
                                            placeholder="john@example.com"
                                            value={guest.email || ''}
                                            onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, email: e.target.value } : g))}
                                            className="h-11"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Birth Information */}
                                  <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                      <div className="w-1 h-3 bg-[#C4A572] rounded"></div>
                                      Birth Information
                                    </h4>
                                    <div className="grid gap-4 pl-3">
                                      <div className="flex flex-col gap-2">
                                        <Label className="text-sm font-medium text-gray-700">Country of birth</Label>
                                        <select
                                          className="w-full h-11 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#C4A572] focus:border-[#C4A572] transition-all"
                                          value={guest.country_of_birth || ''}
                                          onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, country_of_birth: e.target.value } : g))}
                                        >
                                          <option value="">Select country</option>
                                          {COUNTRIES.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="flex flex-col gap-2">
                                        <Label className="text-sm font-medium text-gray-700">Date of birth</Label>
                                        <Input
                                          type="date"
                                          value={guest.date_of_birth || ''}
                                          onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, date_of_birth: e.target.value } : g))}
                                          className="h-11"
                                        />
                                      </div>
                                      {isItalian && (
                                        <div className="grid sm:grid-cols-2 gap-4">
                                          <div className="flex flex-col gap-2">
                                            <Label className="text-sm font-medium text-gray-700">Birth province <span className="text-xs text-gray-500">(Italy only)</span></Label>
                                            <Input
                                              placeholder="VE"
                                              value={guest.birth_province || ''}
                                              onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, birth_province: e.target.value } : g))}
                                              className="h-11"
                                            />
                                          </div>
                                          <div className="flex flex-col gap-2">
                                            <Label className="text-sm font-medium text-gray-700">Birth city <span className="text-xs text-gray-500">(Italy only)</span></Label>
                                            <Input
                                              placeholder="Venice"
                                              value={guest.birth_city || ''}
                                              onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, birth_city: e.target.value } : g))}
                                              className="h-11"
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Document Information */}
                                  <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                      <div className="w-1 h-3 bg-[#C4A572] rounded"></div>
                                      Document Information
                                    </h4>
                                    <div className="grid gap-4 pl-3">
                                      <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-2">
                                          <Label className="text-sm font-medium text-gray-700">Document type</Label>
                                          <select
                                            className="w-full h-11 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#C4A572] focus:border-[#C4A572] transition-all"
                                            value={guest.document_type || 'passport'}
                                            onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, document_type: e.target.value } : g))}
                                          >
                                            <option value="passport">Passport</option>
                                            <option value="id_card">ID Card</option>
                                            <option value="driving_license">Driving License</option>
                                            <option value="other">Other</option>
                                          </select>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                          <Label className="text-sm font-medium text-gray-700">Document number</Label>
                                          <Input
                                            placeholder="AB1234567"
                                            value={guest.document_number || ''}
                                            onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, document_number: e.target.value } : g))}
                                            className="h-11"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex flex-col gap-2">
                                        <Label className="text-sm font-medium text-gray-700">Issue country</Label>
                                        <select
                                          className="w-full h-11 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#C4A572] focus:border-[#C4A572] transition-all"
                                          value={guest.document_issue_country || ''}
                                          onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, document_issue_country: e.target.value } : g))}
                                        >
                                          <option value="">Select country</option>
                                          {COUNTRIES.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-2">
                                          <Label className="text-sm font-medium text-gray-700">Issue date</Label>
                                          <Input
                                            type="date"
                                            value={guest.document_issue_date || ''}
                                            onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, document_issue_date: e.target.value } : g))}
                                            className="h-11"
                                          />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                          <Label className="text-sm font-medium text-gray-700">Expiry date</Label>
                                          <Input
                                            type="date"
                                            value={guest.document_expire_date || ''}
                                            onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, document_expire_date: e.target.value } : g))}
                                            className="h-11"
                                          />
                                        </div>
                                      </div>
                                      {isItalianDoc && (
                                        <div className="grid sm:grid-cols-2 gap-4">
                                          <div className="flex flex-col gap-2">
                                            <Label className="text-sm font-medium text-gray-700">Issue province <span className="text-xs text-gray-500">(Italy only)</span></Label>
                                            <Input
                                              placeholder="MI"
                                              value={guest.document_issue_province || ''}
                                              onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, document_issue_province: e.target.value } : g))}
                                              className="h-11"
                                            />
                                          </div>
                                          <div className="flex flex-col gap-2">
                                            <Label className="text-sm font-medium text-gray-700">Issue city <span className="text-xs text-gray-500">(Italy only)</span></Label>
                                            <Input
                                              placeholder="Milan"
                                              value={guest.document_issue_city || ''}
                                              onChange={(e) => setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, document_issue_city: e.target.value } : g))}
                                              className="h-11"
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* File Uploads (Primary Guest Only) */}
                                  {isPrimary && (
                                    <div className="space-y-3">
                                      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <div className="w-1 h-3 bg-[#C4A572] rounded"></div>
                                        Document Uploads
                                      </h4>
                                      <div className="grid sm:grid-cols-2 gap-4 pl-3">
                                        <div className="flex flex-col gap-2">
                                          <Label className="text-sm font-medium text-gray-700">Upload selfie <span className="text-xs text-gray-500">(Primary guest)</span></Label>
                                          <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0] || null;
                                              setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, document_selfie: file } : g));
                                            }}
                                            className="h-11 cursor-pointer"
                                          />
                                          <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <Info className="w-3 h-3" />
                                            Clear photo of your face
                                          </p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                          <Label className="text-sm font-medium text-gray-700">Upload document photo</Label>
                                          <Input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0] || null;
                                              setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, document_image: file } : g));
                                            }}
                                            className="h-11 cursor-pointer"
                                          />
                                          <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <Info className="w-3 h-3" />
                                            Photo of ID/passport
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              )}
                            </Card>
                          );
                        })}

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const newIndex = guests.length;
                            setGuests((prev) => [...prev, {
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
                            }]);
                            setExpandedGuests((prev) => new Set(prev).add(newIndex));
                          }}
                          className="w-full h-12 border-2 border-dashed border-gray-300 hover:border-[#C4A572] hover:bg-amber-50 transition-all"
                        >
                          <Plus className="w-5 h-5 mr-2" />
                          Add another guest
                        </Button>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                        <Button
                          variant="outline"
                          onClick={() => setStep(1)}
                          className="h-12 px-6 border-2"
                        >
                          <ChevronDown className="w-5 h-5 mr-2 rotate-90" />
                          Back
                        </Button>
                        <Button
                          onClick={onGuestsSubmit}
                          disabled={saving || !consentAccepted}
                          className="h-12 px-8 bg-[#C4A572] hover:bg-[#B39562] text-white font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin mr-2" />
                              Saving...
                            </>
                          ) : (
                            <>
                              Save guest details
                              <Check className="w-5 h-5 ml-2" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-6">
                      {/* Success Message */}
                      {checkinDone && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-50/50 p-6 text-center"
                        >
                          <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-10 h-10 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">Check-in Complete!</h3>
                          <p className="text-gray-600">Thank you for completing your online check-in. We look forward to welcoming you.</p>
                        </motion.div>
                      )}

                      {/* City Tax Information */}
                      <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/80 to-amber-50/40 p-6 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                            <Shield className="w-6 h-6 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900 mb-1">City tax</h4>
                            <p className="text-gray-700">
                              <span className="text-2xl font-bold text-[#C4A572]">€{booking.tourist_tax}</span> total for your party.
                            </p>
                            <p className="text-sm text-gray-600">
                              {booking.city_tax_payment_status === 'paid'
                                ? 'Paid online.'
                                : 'You can pay online now or on arrival.'}
                            </p>
                          </div>
                        </div>
                        <div className="rounded-lg border border-white/50 bg-white/70 p-4 space-y-3">
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <Label className="text-xs text-gray-600">Estimated check-in time</Label>
                              <Input
                                type="time"
                                value={etaCheckin}
                                onChange={(e) => setEtaCheckin(e.target.value)}
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <Label className="text-xs text-gray-600">Estimated check-out time</Label>
                              <Input
                                type="time"
                                value={etaCheckout}
                                onChange={(e) => setEtaCheckout(e.target.value)}
                              />
                            </div>
                          </div>
                          {booking.city_tax_payment_status !== 'paid' && (
                            <Button
                              onClick={onPayCityTax}
                              disabled={cityTaxPaying}
                              className="w-full sm:w-auto bg-[#C4A572] hover:bg-[#B39562] text-white shadow"
                            >
                              {cityTaxPaying ? 'Opening Stripe…' : 'Pay city tax online'}
                            </Button>
                          )}
                          {booking.city_tax_payment_status === 'paid' && (
                            <div className="inline-flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg">
                              <CheckCircle2 className="w-4 h-4" />
                              City tax paid online.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Check-in / Check-out Times */}
                      <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-blue-50/40 p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">Check-in / Check-out</h4>
                            <div className="grid sm:grid-cols-2 gap-4 mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-white border border-blue-200 flex items-center justify-center">
                                  <span className="text-lg font-bold text-blue-600">→</span>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 uppercase tracking-wide">Check-in</p>
                                  <p className="text-base font-semibold text-gray-900">From 15:00</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-white border border-blue-200 flex items-center justify-center">
                                  <span className="text-lg font-bold text-blue-600">←</span>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 uppercase tracking-wide">Check-out</p>
                                  <p className="text-base font-semibold text-gray-900">By 10:00</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 text-sm text-gray-600 bg-white/60 rounded-lg p-3">
                              <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                              <p>Arrival instructions and access details will be emailed to you 48 hours before check-in.</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setStep(2)}
                          className="h-12 px-6 border-2"
                        >
                          <ChevronDown className="w-5 h-5 mr-2 rotate-90" />
                          Edit guest details
                        </Button>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            variant="outline"
                            onClick={onSaveDraft}
                            disabled={saving}
                            className="h-12 px-6 border-gray-300"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Save as draft
                          </Button>
                          <Button
                            onClick={onFinish}
                            disabled={saving}
                            className="h-12 px-10 bg-[#C4A572] hover:bg-[#B39562] text-white text-base font-semibold shadow-xl transition-all disabled:opacity-60"
                          >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                            Finish check-in
                          </Button>
                        </div>
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
