'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, ArrowRight, Eye, EyeOff, User as UserIcon, Phone,
  ChevronLeft, CheckCircle2, Shield, Clock, CreditCard, MapPin, Globe
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import SiteNav from '@/app/components/SiteNav';
import SiteFooter from '@/app/components/SiteFooter';

// Smooth easing
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

// Benefits data
const benefits = [
  {
    icon: CheckCircle2,
    title: 'Instant Booking',
    description: 'Book your stay in seconds'
  },
  {
    icon: Shield,
    title: 'Secure Payments',
    description: 'Your data is always protected'
  },
  {
    icon: Clock,
    title: '24/7 Support',
    description: 'We\'re here to help anytime'
  },
  {
    icon: CreditCard,
    title: 'Best Price Guarantee',
    description: 'Book direct for best rates'
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setIsAuthenticated, isAuthenticated } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    password: '',
    confirmPassword: '',
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

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
      const response = await api.auth.register({
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        country: formData.country,
      });

      if (response.data?.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const progressPercentage = (currentStep / 2) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <SiteNav />

      {/* Main Content */}
      <main className="flex-1 flex pt-20">
        {/* Left Side - Benefits (Hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
          {/* Background Image */}
          <Image
            src="https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?q=80&w=2940&auto=format&fit=crop"
            alt="Venice"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/80" />

          {/* Content Overlay */}
          <div className="relative z-10 flex flex-col justify-center p-10 xl:p-14 w-full">
            {/* Top - Location */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 text-white/70 mb-12"
            >
              <MapPin className="w-4 h-4 text-[#C4A572]" />
              <span className="text-sm tracking-wider uppercase">Venice, Italy</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-12"
            >
              <h1 className="text-4xl xl:text-5xl font-light text-white mb-4 leading-tight">
                Join Our Community
                <span className="block text-[#C4A572] font-medium">Book Your Perfect Stay</span>
              </h1>
              <p className="text-white/60 max-w-md text-lg">
                Create an account to unlock exclusive benefits and streamline your booking experience
              </p>
            </motion.div>

            {/* Benefits List */}
            <div className="space-y-5">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-[#C4A572]/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-[#C4A572]/20">
                    <benefit.icon className="w-6 h-6 text-[#C4A572]" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-0.5">{benefit.title}</h3>
                    <p className="text-white/50 text-sm">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Registration Form */}
        <div className="flex-1 lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-[#0a0a0a]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: smoothEase }}
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

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-400">
                  Step {currentStep} of 2
                </span>
                <span className="text-sm text-gray-600">
                  {currentStep === 1 ? 'Personal Info' : 'Security'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '50%' }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-[#C4A572]"
                />
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
                  : 'Create a strong password'
                }
              </p>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
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
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-400 mb-2">
                          First Name
                        </label>
                        <div className="relative">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                          <input
                            id="firstName"
                            name="firstName"
                            type="text"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            required
                            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
                            placeholder="John"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-400 mb-2">
                          Last Name
                        </label>
                        <div className="relative">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                          <input
                            id="lastName"
                            name="lastName"
                            type="text"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            required
                            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
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
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          autoComplete="email"
                          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    {/* Country Field */}
                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-400 mb-2">
                        Country
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <select
                          id="country"
                          name="country"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          required
                          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-gray-800 rounded-xl text-white focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
                        >
                          <option value="" className="bg-[#1a1a1a] text-gray-400">Select your country</option>
                          <option value="Italy" className="bg-[#1a1a1a]">Italy</option>
                          <option value="United States" className="bg-[#1a1a1a]">United States</option>
                          <option value="United Kingdom" className="bg-[#1a1a1a]">United Kingdom</option>
                          <option value="Germany" className="bg-[#1a1a1a]">Germany</option>
                          <option value="France" className="bg-[#1a1a1a]">France</option>
                          <option value="Spain" className="bg-[#1a1a1a]">Spain</option>
                          <option value="Netherlands" className="bg-[#1a1a1a]">Netherlands</option>
                          <option value="Belgium" className="bg-[#1a1a1a]">Belgium</option>
                          <option value="Austria" className="bg-[#1a1a1a]">Austria</option>
                          <option value="Switzerland" className="bg-[#1a1a1a]">Switzerland</option>
                          <option value="Portugal" className="bg-[#1a1a1a]">Portugal</option>
                          <option value="Poland" className="bg-[#1a1a1a]">Poland</option>
                          <option value="Sweden" className="bg-[#1a1a1a]">Sweden</option>
                          <option value="Norway" className="bg-[#1a1a1a]">Norway</option>
                          <option value="Denmark" className="bg-[#1a1a1a]">Denmark</option>
                          <option value="Finland" className="bg-[#1a1a1a]">Finland</option>
                          <option value="Ireland" className="bg-[#1a1a1a]">Ireland</option>
                          <option value="Greece" className="bg-[#1a1a1a]">Greece</option>
                          <option value="Czech Republic" className="bg-[#1a1a1a]">Czech Republic</option>
                          <option value="Hungary" className="bg-[#1a1a1a]">Hungary</option>
                          <option value="Romania" className="bg-[#1a1a1a]">Romania</option>
                          <option value="Croatia" className="bg-[#1a1a1a]">Croatia</option>
                          <option value="Slovenia" className="bg-[#1a1a1a]">Slovenia</option>
                          <option value="Canada" className="bg-[#1a1a1a]">Canada</option>
                          <option value="Australia" className="bg-[#1a1a1a]">Australia</option>
                          <option value="New Zealand" className="bg-[#1a1a1a]">New Zealand</option>
                          <option value="Japan" className="bg-[#1a1a1a]">Japan</option>
                          <option value="China" className="bg-[#1a1a1a]">China</option>
                          <option value="South Korea" className="bg-[#1a1a1a]">South Korea</option>
                          <option value="India" className="bg-[#1a1a1a]">India</option>
                          <option value="Brazil" className="bg-[#1a1a1a]">Brazil</option>
                          <option value="Mexico" className="bg-[#1a1a1a]">Mexico</option>
                          <option value="Argentina" className="bg-[#1a1a1a]">Argentina</option>
                          <option value="Russia" className="bg-[#1a1a1a]">Russia</option>
                          <option value="Turkey" className="bg-[#1a1a1a]">Turkey</option>
                          <option value="South Africa" className="bg-[#1a1a1a]">South Africa</option>
                          <option value="UAE" className="bg-[#1a1a1a]">United Arab Emirates</option>
                          <option value="Saudi Arabia" className="bg-[#1a1a1a]">Saudi Arabia</option>
                          <option value="Israel" className="bg-[#1a1a1a]">Israel</option>
                          <option value="Singapore" className="bg-[#1a1a1a]">Singapore</option>
                          <option value="Malaysia" className="bg-[#1a1a1a]">Malaysia</option>
                          <option value="Thailand" className="bg-[#1a1a1a]">Thailand</option>
                          <option value="Indonesia" className="bg-[#1a1a1a]">Indonesia</option>
                          <option value="Philippines" className="bg-[#1a1a1a]">Philippines</option>
                          <option value="Vietnam" className="bg-[#1a1a1a]">Vietnam</option>
                          <option value="Other" className="bg-[#1a1a1a]">Other</option>
                        </select>
                      </div>
                    </div>

                    {/* Phone Field */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-400 mb-2">
                        Phone Number <span className="text-gray-600">(Optional)</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
                          placeholder="+39 123 456 7890"
                        />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  /* Step 2: Security */
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    {/* Password Field */}
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={handleInputChange}
                          required
                          autoComplete="new-password"
                          className="w-full pl-12 pr-12 py-4 bg-white/5 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
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
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          required
                          autoComplete="new-password"
                          className="w-full pl-12 pr-12 py-4 bg-white/5 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
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
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-2">
                {currentStep === 2 && (
                  <motion.button
                    type="button"
                    onClick={handleBack}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center gap-2 px-6 py-4 border border-gray-800 rounded-xl font-medium text-gray-400 hover:bg-white/5 transition-all"
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
                  className="flex-1 bg-[#C4A572] text-white py-4 rounded-xl font-semibold hover:bg-[#B39562] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#C4A572]/20"
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
