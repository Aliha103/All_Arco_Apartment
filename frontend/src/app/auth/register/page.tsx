'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, ArrowRight, Eye, EyeOff, User as UserIcon, Phone, MapPin,
  ChevronLeft, Menu, X, User, ChevronDown, LogIn, Settings, LogOut,
  Sparkles, Calendar, UserPlus, Facebook, Instagram, Heart, CheckCircle2,
  Shield, Clock, CreditCard, Headphones
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

// Benefits data
const BENEFITS = [
  {
    icon: CheckCircle2,
    title: 'Instant Booking',
    description: 'Book your stay in seconds with our streamlined process'
  },
  {
    icon: Shield,
    title: 'Secure Payments',
    description: 'Your payment information is always safe and encrypted'
  },
  {
    icon: Clock,
    title: '24/7 Support',
    description: 'Our team is here to help you anytime you need assistance'
  },
  {
    icon: CreditCard,
    title: 'Best Price Guarantee',
    description: 'Get the best rates when you book directly with us'
  },
];

// Footer links
const FOOTER_LINKS = {
  Explore: [
    { label: 'About', href: '/#about' },
    { label: 'Features', href: '/#features' },
    { label: 'Gallery', href: '/' },
  ],
  Support: [
    { label: 'Contact', href: '/#contact' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Help', href: '/help' },
  ],
  Legal: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Cookies', href: '/cookies' },
  ],
  Connect: [
    { label: 'Facebook', href: '#' },
    { label: 'Instagram', href: '#' },
    { label: 'Email', href: 'mailto:info@allarcoapartment.com' },
  ],
};

const SOCIAL_LINKS = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Mail, href: 'mailto:info@allarcoapartment.com', label: 'Email' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { user, setUser, setIsAuthenticated, isAuthenticated, logout } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();

  // Form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

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
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navbar */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100"
      >
        <div className="px-6 md:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3 focus:outline-none">
              <Image
                src="/logos/logo-horizontal.svg"
                alt="All'Arco Apartment Logo"
                width={200}
                height={60}
                className="object-contain"
              />
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6 text-gray-600 text-sm">
              <Link href="/#about" className="hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 rounded px-2 py-1">About</Link>
              <Link href="/#features" className="hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 rounded px-2 py-1">Features</Link>

              {/* User Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full hover:bg-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  aria-label="Account menu"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                >
                  <User className="w-4 h-4" />
                  <span>{isAuthenticated ? user?.first_name || 'Account' : 'Account'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg overflow-hidden z-50 border border-gray-200"
                      role="menu"
                    >
                      <div className="py-1">
                        {isAuthenticated ? (
                          <>
                            <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">
                              <User className="w-4 h-4 text-gray-500" />
                              <span>Dashboard</span>
                            </Link>
                            <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">
                              <Settings className="w-4 h-4 text-gray-500" />
                              <span>Profile</span>
                            </Link>
                            <Link href="/bookings" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span>My Bookings</span>
                            </Link>
                            {(user?.role === 'admin' || user?.role === 'super_admin') && (
                              <Link href="/admin" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">
                                <Sparkles className="w-4 h-4 text-gray-500" />
                                <span>Admin Panel</span>
                              </Link>
                            )}
                            <div className="my-1 border-t border-gray-100" />
                            <button
                              onClick={() => { logout(); setDropdownOpen(false); }}
                              className="flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                              role="menuitem"
                            >
                              <LogOut className="w-4 h-4" />
                              <span>Sign Out</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <Link href="/auth/login" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">
                              <LogIn className="w-4 h-4 text-gray-500" />
                              <span>Login</span>
                            </Link>
                            <Link href="/auth/register" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">
                              <UserPlus className="w-4 h-4 text-gray-500" />
                              <span>Sign Up</span>
                            </Link>
                            <Link href="/bookings" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span>My Bookings</span>
                            </Link>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </nav>
          </div>
        </div>
      </motion.header>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white z-50 md:hidden overflow-y-auto"
              role="dialog"
              aria-label="Mobile navigation"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-xl font-semibold text-gray-900">Menu</span>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                    aria-label="Close menu"
                  >
                    <X className="w-6 h-6 text-gray-600" />
                  </button>
                </div>

                <div className="space-y-2">
                  <Link href="/#about" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    About
                  </Link>
                  <Link href="/#features" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    Features
                  </Link>

                  <div className="pt-4 border-t border-gray-100">
                    {isAuthenticated ? (
                      <>
                        <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                          <User className="w-4 h-4" />
                          Dashboard
                        </Link>
                        <Link href="/bookings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                          <Calendar className="w-4 h-4" />
                          My Bookings
                        </Link>
                        <button
                          onClick={() => { logout(); setMobileMenuOpen(false); }}
                          className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                          <LogIn className="w-4 h-4" />
                          Login
                        </Link>
                        <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                          <UserPlus className="w-4 h-4" />
                          Sign Up
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row pt-20">
        {/* Left Side - Benefits (Hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-900">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center p-8 lg:p-12 w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-12"
            >
              <h1 className="text-4xl xl:text-5xl font-light text-white mb-4">
                Join Our Community
                <span className="block font-semibold">Book Your Perfect Stay</span>
              </h1>
              <p className="text-white/70 max-w-md">
                Create an account to unlock exclusive benefits and streamline your booking experience
              </p>
            </motion.div>

            {/* Benefits List */}
            <div className="space-y-6">
              {BENEFITS.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                    <benefit.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">{benefit.title}</h3>
                    <p className="text-white/70 text-sm leading-relaxed">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Location Badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-12 flex items-center gap-2 text-white/80"
            >
              <MapPin className="w-4 h-4" />
              <span className="text-sm tracking-wide">Venice, Italy</span>
            </motion.div>
          </div>
        </div>

        {/* Right Side - Registration Form */}
        <div className="flex-1 lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-8 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            {/* Mobile Hero */}
            <div className="lg:hidden mb-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Create Your Account
              </h1>
              <p className="text-gray-500 text-sm">
                Join us for exclusive benefits
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Step {currentStep} of 2
                </span>
                <span className="text-sm text-gray-500">
                  {currentStep === 1 ? 'Personal Info' : 'Security'}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '50%' }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-800"
                />
              </div>
            </div>

            {/* Form Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">
                {currentStep === 1 ? 'Tell Us About You' : 'Secure Your Account'}
              </h2>
              <p className="text-gray-500 mt-2">
                {currentStep === 1
                  ? 'Enter your personal information to get started'
                  : 'Create a strong password for your account'
                }
              </p>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-100"
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
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                          First Name
                        </label>
                        <div className="relative">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            id="firstName"
                            name="firstName"
                            type="text"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            required
                            className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white"
                            placeholder="John"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                          Last Name
                        </label>
                        <div className="relative">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            id="lastName"
                            name="lastName"
                            type="text"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            required
                            className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white"
                            placeholder="Doe"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Email Field */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          autoComplete="email"
                          className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    {/* Phone Field */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number (Optional)
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white"
                          placeholder="+39 123 456 7890"
                        />
                      </div>
                    </div>

                    {/* Country Field */}
                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                        Country (Optional)
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          id="country"
                          name="country"
                          type="text"
                          value={formData.country}
                          onChange={handleInputChange}
                          className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white"
                          placeholder="Italy"
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
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={handleInputChange}
                          required
                          autoComplete="new-password"
                          className="w-full pl-12 pr-12 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5">
                        Must be at least 8 characters long
                      </p>
                    </div>

                    {/* Confirm Password Field */}
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          required
                          autoComplete="new-password"
                          className="w-full pl-12 pr-12 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Referral Code Field */}
                    <div>
                      <label htmlFor="referralCode" className="block text-sm font-medium text-gray-700 mb-2">
                        Referral Code (Optional)
                      </label>
                      <input
                        id="referralCode"
                        name="referralCode"
                        type="text"
                        value={formData.referralCode}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white"
                        placeholder="Enter code if you have one"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex gap-4">
                {currentStep === 2 && (
                  <motion.button
                    type="button"
                    onClick={handleBack}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center gap-2 px-6 py-4 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all"
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
                  className="flex-1 bg-gray-900 text-white py-4 rounded-xl font-medium hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-900/20"
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

              {/* Login Link */}
              <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="font-medium text-gray-900 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-auto">
        <div className="w-full px-6 md:px-8 lg:px-12 xl:px-16 py-12">
          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12">
            {/* Brand */}
            <div className="text-center lg:text-left">
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="inline-block"
              >
                <Image
                  src="/logos/logo-horizontal.svg"
                  alt="All'Arco Apartment Logo"
                  width={200}
                  height={60}
                  className="object-contain mx-auto lg:mx-0 mb-4"
                />
              </motion.div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-[300px] mx-auto lg:mx-0">
                Authentic Venetian hospitality in the heart of Italy&apos;s most romantic city
              </p>
            </div>

            {/* Navigation Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center lg:text-left">
              {Object.entries(FOOTER_LINKS).map(([title, links]) => (
                <div key={title}>
                  <h5 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-4">
                    {title}
                  </h5>
                  <div className="space-y-2">
                    {links.map((link, i) => (
                      <Link
                        key={i}
                        href={link.href}
                        className="block text-sm text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 mt-8 border-t border-gray-100">
            {/* Social Icons */}
            <div className="flex gap-3">
              {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-900 hover:text-white transition-all duration-200"
                  whileHover={{ y: -2 }}
                >
                  <Icon className="w-4 h-4" />
                </motion.a>
              ))}
            </div>

            {/* Copyright */}
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-sm text-gray-400">
              <span>© {currentYear} All&apos;Arco Apartment</span>
              <span className="flex items-center gap-1">
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                </motion.span>
                Made in Venice
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
