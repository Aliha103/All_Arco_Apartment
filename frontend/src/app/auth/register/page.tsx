'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, ArrowRight, Eye, EyeOff, User as UserIcon, Phone,
  ChevronLeft, CheckCircle2, Shield, Clock, CreditCard, MapPin, Globe, Star, Quote, ChevronDown, Gift
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import SiteNav from '@/app/components/SiteNav';
import SiteFooter from '@/app/components/SiteFooter';

// Image type from gallery
interface GalleryImage {
  src: string;
  alt: string;
}

const normalizeImageUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `https://www.allarcoapartment.com${url}`;
};

interface PublicReview {
  id: string;
  guest_name: string;
  location?: string;
  rating: number;
  text: string;
}

const fallbackReviews: PublicReview[] = [
  {
    id: '1',
    guest_name: 'Sarah & Michael',
    location: 'New York, USA',
    rating: 10,
    text: 'An absolutely magical stay in Venice! The apartment exceeded all expectations.',
  },
  {
    id: '2',
    guest_name: 'Emma Laurent',
    location: 'Paris, France',
    rating: 10,
    text: 'Bellissimo! The attention to detail is remarkable. Unforgettable experience.',
  },
  {
    id: '3',
    guest_name: 'Hans & Greta',
    location: 'Munich, Germany',
    rating: 10,
    text: 'Perfect for our honeymoon. The hosts were incredibly helpful.',
  },
];

// Benefits data
const benefits = [
  { icon: CheckCircle2, text: 'Instant booking confirmation' },
  { icon: Shield, text: 'Secure payment processing' },
  { icon: Clock, text: '24/7 customer support' },
  { icon: CreditCard, text: 'Best price guarantee' },
];

// Country list
const countries = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia',
  'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium',
  'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
  'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic', 'Chad',
  'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
  'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea',
  'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia',
  'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras',
  'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Ivory Coast',
  'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos',
  'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar',
  'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
  'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia',
  'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia',
  'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru',
  'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis',
  'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia',
  'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands',
  'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden',
  'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga',
  'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates',
  'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
  'Yemen', 'Zambia', 'Zimbabwe'
];

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setIsAuthenticated, isAuthenticated, user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [currentReview, setCurrentReview] = useState(0);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [reviews, setReviews] = useState<PublicReview[]>(fallbackReviews);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    invitationCode: '',
    password: '',
    confirmPassword: '',
  });

  // Fetch gallery images from database
  useEffect(() => {
    const fetchGalleryImages = async () => {
      try {
        const response = await api.gallery.public('gallery');
        const images = response.data;
        if (images && images.length > 0) {
          setGalleryImages(images.map((img: any) => ({
            src: normalizeImageUrl(img.url || img.image || img.image_url || ''),
            alt: img.alt_text || img.title || 'Gallery image'
          })));
        }
      } catch (error) {
        console.error('Failed to fetch gallery images:', error);
      } finally {
        setImagesLoading(false);
      }
    };
    fetchGalleryImages();
  }, []);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        const res = await api.reviews.list();
        const incoming = res.data?.results || res.data;
        if (Array.isArray(incoming) && incoming.length) {
          setReviews(incoming);
        }
      } catch (error) {
        console.error('Failed to load reviews', error);
        setReviews(fallbackReviews);
      } finally {
        setReviewsLoading(false);
      }
    };
    loadReviews();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const isTeam = user.is_super_admin || user.is_team_member;
      router.replace(isTeam ? '/pms' : '/dashboard');
    }
  }, [isAuthenticated, user, router]);

  // Auto-rotate images
  useEffect(() => {
    if (galleryImages.length === 0) return;
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % galleryImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [galleryImages.length]);

  // Auto-rotate reviews
  useEffect(() => {
    if (reviews.length === 0) return;
    const timer = setInterval(() => {
      setCurrentReview((prev) => (prev + 1) % reviews.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [reviews.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.country.trim()) {
      setError('Country is required');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
      setError('');
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStep === 1) {
      handleNext();
      return;
    }

    if (!validateStep2()) {
      return;
    }

    setError('');
    setLoading(true);

    try {
      const registrationData: any = {
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        country: formData.country,
      };

      // Add invitation code if provided
      if (formData.invitationCode.trim()) {
        registrationData.invitation_code = formData.invitationCode;
      }

      const response = await api.auth.register(registrationData);

      if (response.data) {
        const nextUser = response.data;
        setUser(nextUser);
        setIsAuthenticated(true);
        const isTeam = nextUser.is_super_admin || nextUser.is_team_member;
        router.replace(isTeam ? '/pms' : '/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <SiteNav />

      {/* Main Content */}
      <main className="flex-1 flex pt-20">
        {/* Left Side - Hero Image & Reviews (Hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
          {/* Background Image Carousel */}
          {imagesLoading ? (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800 animate-pulse flex items-center justify-center">
              <div className="w-12 h-12 border-2 border-[#C4A572]/30 border-t-[#C4A572] rounded-full animate-spin" />
            </div>
          ) : galleryImages.length > 0 ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentImage}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="absolute inset-0"
              >
                <Image
                  src={galleryImages[currentImage]?.src}
                  alt={galleryImages[currentImage]?.alt || 'Gallery image'}
                  fill
                  className="object-cover"
                  priority
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/80" />
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800" />
          )}

          {/* Content Overlay */}
          <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full">
            {/* Top - Location */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 text-white/70"
            >
              <MapPin className="w-4 h-4 text-[#C4A572]" />
              <span className="text-sm tracking-wider uppercase">Venice, Italy</span>
            </motion.div>

            {/* Middle - Title & Benefits */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-6"
            >
              <h1 className="text-4xl xl:text-5xl font-light text-white leading-tight">
                Join Our Community
                <span className="block text-[#C4A572] font-medium">Book Your Perfect Stay</span>
              </h1>
              <p className="text-white/60 max-w-md text-lg">
                Create an account to unlock exclusive benefits and streamline your booking experience
              </p>

              {/* Benefits Grid */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-8 h-8 bg-[#C4A572]/10 rounded-lg flex items-center justify-center">
                      <benefit.icon className="w-4 h-4 text-[#C4A572]" />
                    </div>
                    <span className="text-white/70 text-sm">{benefit.text}</span>
                  </motion.div>
                ))}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3 pt-2">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#C4A572] text-[#C4A572]" />
                  ))}
                </div>
                <span className="text-white font-semibold">9.8</span>
                <span className="text-white/50 text-sm">Exceptional</span>
              </div>
            </motion.div>

            {/* Bottom - Reviews */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="space-y-4"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentReview}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.5 }}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10"
                >
                  <Quote className="w-6 h-6 text-[#C4A572]/50 mb-3" />
                  <p className="text-white/90 leading-relaxed mb-4">
                    &ldquo;{reviews[currentReview]?.text || 'Loading real guest feedback...'}&rdquo;
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{reviews[currentReview]?.guest_name || 'Guest'}</p>
                      <p className="text-white/50 text-sm">{reviews[currentReview]?.location || 'Venice, Italy'}</p>
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(Math.max(1, Math.round((reviews[currentReview]?.rating || 0) / 2)))].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-[#C4A572] text-[#C4A572]" />
                      ))}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Review Indicators */}
              <div className="flex gap-2">
                {reviews.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentReview(index)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === currentReview ? 'bg-[#C4A572] w-8' : 'bg-white/30 w-1.5 hover:bg-white/50'
                    }`}
                    aria-label={`View review ${index + 1}`}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Side - Registration Form */}
        <div className="flex-1 lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-[#0a0a0a]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-md"
          >
            {/* Mobile Logo */}
            <div className="lg:hidden flex justify-center mb-8">
              <Image
                src="/allarco-logo.png"
                alt="All'Arco Apartment"
                width={150}
                height={55}
                className="object-contain"
              />
            </div>

            {/* Progress Steps */}
            <div className="mb-8">
              <div className="relative flex items-center justify-between mb-4">
                {/* Background line (gray) */}
                <div className="absolute left-5 right-5 top-1/2 h-1 -translate-y-1/2 bg-gray-800 rounded-full" />
                {/* Progress line (gold) */}
                <div
                  className="absolute left-5 top-1/2 h-1 -translate-y-1/2 bg-[#C4A572] rounded-full transition-all duration-500"
                  style={{ width: currentStep > 1 ? 'calc(100% - 40px)' : '0%' }}
                />

                {/* Step 1 Circle */}
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-all duration-300 ${
                  currentStep >= 1 ? 'bg-[#C4A572] text-white' : 'bg-gray-800 text-gray-500'
                }`}>
                  {currentStep > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
                </div>

                {/* Step 2 Circle */}
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-all duration-300 ${
                  currentStep >= 2 ? 'bg-[#C4A572] text-white' : 'bg-gray-800 text-gray-500'
                }`}>
                  2
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className={currentStep >= 1 ? 'text-[#C4A572]' : 'text-gray-600'}>Personal Info</span>
                <span className={currentStep >= 2 ? 'text-[#C4A572]' : 'text-gray-600'}>Security</span>
              </div>
            </div>

            {/* Form Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-light text-white mb-2">
                {currentStep === 1 ? 'Create Account' : 'Secure Your Account'}
              </h2>
              <p className="text-gray-500">
                {currentStep === 1
                  ? 'Enter your details to get started'
                  : 'Create a strong password to protect your account'
                }
              </p>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm border border-red-500/20"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {currentStep === 1 ? (
                  /* Step 1: Personal Information */
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="space-y-4"
                  >
                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-400 mb-2">
                          First Name
                        </label>
                        <div className="relative group">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#C4A572] transition-colors" />
                          <input
                            id="firstName"
                            name="firstName"
                            type="text"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            required
                            className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
                            placeholder="John"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-400 mb-2">
                          Last Name
                        </label>
                        <div className="relative group">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#C4A572] transition-colors" />
                          <input
                            id="lastName"
                            name="lastName"
                            type="text"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            required
                            className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
                            placeholder="Doe"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Email Field */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">
                        Email Address
                      </label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#C4A572] transition-colors" />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          autoComplete="email"
                          className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    {/* Country Field */}
                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-400 mb-2">
                        Country
                      </label>
                      <div className="relative group">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#C4A572] transition-colors z-10" />
                        <select
                          id="country"
                          name="country"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          required
                          className="w-full pl-12 pr-10 py-3.5 bg-white/5 border border-gray-800 rounded-xl text-white focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
                        >
                          <option value="" className="bg-[#1a1a1a] text-gray-400">Select your country</option>
                          {countries.map((country) => (
                            <option key={country} value={country} className="bg-[#1a1a1a]">
                              {country}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                      </div>
                    </div>

                    {/* Phone Field */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-400 mb-2">
                        Phone Number <span className="text-gray-600">(Optional)</span>
                      </label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#C4A572] transition-colors" />
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
                          placeholder="+39 123 456 7890"
                        />
                      </div>
                    </div>

                    {/* Invitation Code Field */}
                    <div>
                      <label htmlFor="invitationCode" className="block text-sm font-medium text-gray-400 mb-2">
                        Invitation Code <span className="text-gray-600">(Optional)</span>
                      </label>
                      <div className="relative group">
                        <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#C4A572] transition-colors" />
                        <input
                          id="invitationCode"
                          name="invitationCode"
                          type="text"
                          value={formData.invitationCode}
                          onChange={handleInputChange}
                          className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all uppercase"
                          placeholder="ARCO-XXXXXXXX"
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1.5">
                        If a friend invited you, enter their code to earn rewards
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  /* Step 2: Security */
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="space-y-4"
                  >
                    {/* Password Field */}
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">
                        Password
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#C4A572] transition-colors" />
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={handleInputChange}
                          required
                          autoComplete="new-password"
                          className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mt-1.5">
                        Must be at least 8 characters long
                      </p>
                    </div>

                    {/* Confirm Password Field */}
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-400 mb-2">
                        Confirm Password
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#C4A572] transition-colors" />
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          required
                          autoComplete="new-password"
                          className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Password Match Indicator */}
                    {formData.confirmPassword && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center gap-2 text-sm ${
                          formData.password === formData.confirmPassword
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {formData.password === formData.confirmPassword ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Passwords match
                          </>
                        ) : (
                          <>
                            <div className="w-4 h-4 rounded-full border-2 border-current" />
                            Passwords do not match
                          </>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-2">
                {currentStep === 2 && (
                  <motion.button
                    type="button"
                    onClick={handleBack}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center gap-2 px-6 py-3.5 border border-gray-800 rounded-xl font-medium text-gray-400 hover:bg-white/5 hover:border-gray-700 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </motion.button>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="flex-1 bg-[#C4A572] text-white py-3.5 rounded-xl font-semibold hover:bg-[#B39562] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#C4A572]/20"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      {currentStep === 1 ? 'Continue' : 'Create Account'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-800"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-[#0a0a0a] text-gray-600">or</span>
                </div>
              </div>

              {/* Login Link */}
              <p className="text-center text-gray-500">
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="font-medium text-[#C4A572] hover:text-[#D4B582] transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </motion.div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
