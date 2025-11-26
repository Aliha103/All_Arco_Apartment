'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, ArrowRight, Star, Quote, ChevronLeft, Menu, X,
  MapPin, Users, Bed, User, ChevronDown, LogIn, Settings,
  LogOut, Sparkles, Calendar, UserPlus, Facebook, Instagram, Heart, CheckCircle
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

// Reviews data
const REVIEWS = [
  {
    id: 1,
    name: 'Sarah Mitchell',
    location: 'New York, USA',
    rating: 5,
    text: 'An absolute dream stay! The canal views were breathtaking and the apartment exceeded all expectations. Every detail was perfect.',
    date: 'October 2024',
  },
  {
    id: 2,
    name: 'Marco Rossi',
    location: 'Milan, Italy',
    rating: 5,
    text: 'Stunning location in the heart of Venice. The hosts were incredibly responsive and the apartment was immaculately clean.',
    date: 'September 2024',
  },
  {
    id: 3,
    name: 'Emma Thompson',
    location: 'London, UK',
    rating: 5,
    text: 'We celebrated our anniversary here and it was magical. The attention to detail and the gorgeous views made it unforgettable.',
    date: 'August 2024',
  },
];

// Stats
const STATS = [
  { value: '4.9', label: 'Rating', icon: Star },
  { value: '500+', label: 'Reviews', icon: Users },
  { value: '2', label: 'Bedrooms', icon: Bed },
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

export default function ForgotPasswordPage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [currentReview, setCurrentReview] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();

  // Auto-rotate reviews
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentReview((prev) => (prev + 1) % REVIEWS.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  // Focus email on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // TODO: Replace with actual API call
      // await api.auth.forgotPassword({ email });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

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
                src="/logos/logo-icon.svg"
                alt="All'Arco Apartment Logo"
                width={56}
                height={56}
                className="object-contain"
              />
              <span className="text-gray-900 text-xl font-semibold hidden sm:block">All&apos;Arco Apartment</span>
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
        {/* Left Side - Hero with Reviews (Hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-900">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between p-8 lg:p-12 w-full">
            {/* Top - Location */}
            <div className="flex items-center gap-2 text-white/80">
              <MapPin className="w-4 h-4" />
              <span className="text-sm tracking-wide">Venice, Italy</span>
            </div>

            {/* Middle - Title & Stats */}
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h1 className="text-4xl xl:text-5xl font-light text-white mb-4">
                  Experience Authentic
                  <span className="block font-semibold">Venetian Living</span>
                </h1>
                <p className="text-white/70 max-w-md">
                  A stunning canal-view apartment in the heart of Venice&apos;s most romantic neighborhood
                </p>
              </motion.div>

              {/* Stats */}
              <div className="flex gap-8">
                {STATS.map(({ value, label, icon: Icon }) => (
                  <div key={label} className="text-center">
                    <div className="flex items-center justify-center gap-1 text-white">
                      <Icon className="w-4 h-4 text-yellow-400" />
                      <span className="text-2xl font-semibold">{value}</span>
                    </div>
                    <span className="text-xs text-white/60">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom - Reviews */}
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentReview}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.5 }}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
                >
                  <Quote className="w-6 h-6 text-white/40 mb-3" />
                  <p className="text-white/90 text-sm leading-relaxed mb-4">
                    {REVIEWS[currentReview].text}
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium text-sm">
                        {REVIEWS[currentReview].name}
                      </p>
                      <p className="text-white/60 text-xs">
                        {REVIEWS[currentReview].location}
                      </p>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: REVIEWS[currentReview].rating }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {REVIEWS.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentReview(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentReview ? 'bg-white w-6' : 'bg-white/40'
                      }`}
                      aria-label={`Go to review ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Password Reset Form */}
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
                All&apos;Arco Apartment
              </h1>
              <p className="text-gray-500 text-sm">
                Your Venetian escape awaits
              </p>
            </div>

            {!success ? (
              <>
                {/* Form Header */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">
                    Forgot Password?
                  </h2>
                  <p className="text-gray-500 mt-2">
                    Enter your email and we&apos;ll send you a reset link
                  </p>
                </div>

                {/* Reset Form */}
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

                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        ref={emailRef}
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    className="w-full bg-gray-900 text-white py-4 rounded-xl font-medium hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-900/20"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        Send Reset Link
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>

                  {/* Back to Login */}
                  <div className="text-center">
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back to login
                    </Link>
                  </div>
                </form>
              </>
            ) : (
              /* Success State */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="mb-6">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                    Check Your Email
                  </h2>
                  <p className="text-gray-500">
                    We&apos;ve sent a password reset link to
                  </p>
                  <p className="text-gray-900 font-medium mt-1">
                    {email}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                  <p className="text-sm text-blue-900">
                    Click the link in the email to reset your password. If you don&apos;t see it, check your spam folder.
                  </p>
                </div>

                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to login
                </Link>
              </motion.div>
            )}
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
                  src="/logos/logo-icon.svg"
                  alt="All'Arco Apartment Logo"
                  width={96}
                  height={96}
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
