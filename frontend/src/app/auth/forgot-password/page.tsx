'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, Star, Quote, ChevronLeft, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import SiteNav from '@/app/components/SiteNav';
import SiteFooter from '@/app/components/SiteFooter';

// Smooth easing
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

// Image type from gallery
interface GalleryImage {
  src: string;
  alt: string;
}

// Reviews data
const reviews = [
  {
    name: 'Sarah & Michael',
    location: 'New York, USA',
    rating: 5,
    text: 'An absolutely magical stay in Venice! The apartment exceeded all expectations.',
  },
  {
    name: 'Emma Laurent',
    location: 'Paris, France',
    rating: 5,
    text: 'Bellissimo! The attention to detail is remarkable. Unforgettable experience.',
  },
  {
    name: 'Hans & Greta',
    location: 'Munich, Germany',
    rating: 5,
    text: 'Perfect for our honeymoon. The hosts were incredibly helpful.',
  },
];

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [currentReview, setCurrentReview] = useState(0);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const emailRef = useRef<HTMLInputElement>(null);

  // Fetch gallery images from database
  useEffect(() => {
    const fetchGalleryImages = async () => {
      try {
        const response = await api.gallery.public('gallery');
        const images = response.data;
        if (images && images.length > 0) {
          setGalleryImages(images.map((img: any) => ({
            src: img.url || img.image || img.image_url || '',
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

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

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
    const timer = setInterval(() => {
      setCurrentReview((prev) => (prev + 1) % reviews.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Focus email on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.auth.passwordReset(email);
      setSuccess(true);
    } catch (err: any) {
      // Always show success message for security (don't reveal if email exists)
      setSuccess(true);
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
                transition={{ duration: 1.5, ease: smoothEase }}
                className="absolute inset-0"
              >
                <Image
                  src={galleryImages[currentImage]?.src}
                  alt={galleryImages[currentImage]?.alt || 'Gallery image'}
                  fill
                  className="object-cover"
                  priority
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

            {/* Middle - Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-4"
            >
              <h1 className="text-4xl xl:text-5xl font-light text-white leading-tight">
                Experience Authentic
                <span className="block text-[#C4A572] font-medium">Venetian Living</span>
              </h1>
              <p className="text-white/60 max-w-md text-lg">
                A stunning canal-view apartment in the heart of Venice&apos;s most romantic neighborhood
              </p>

              {/* Rating */}
              <div className="flex items-center gap-3 pt-4">
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
                    &ldquo;{reviews[currentReview].text}&rdquo;
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{reviews[currentReview].name}</p>
                      <p className="text-white/50 text-sm">{reviews[currentReview].location}</p>
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(reviews[currentReview].rating)].map((_, i) => (
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

        {/* Right Side - Forgot Password Form */}
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

            {!success ? (
              <>
                {/* Form Header */}
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-light text-white mb-2">
                    Forgot Password?
                  </h2>
                  <p className="text-gray-500">
                    Enter your email to receive reset instructions
                  </p>
                </div>

                {/* Forgot Password Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Error Message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm border border-red-500/20 flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        ref={emailRef}
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
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
                    className="w-full bg-[#C4A572] text-white py-4 rounded-xl font-semibold hover:bg-[#B39562] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#C4A572]/20"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        Send Reset Email
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>

                  {/* Back to Login */}
                  <div className="text-center pt-2">
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#C4A572] transition-colors"
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
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-light text-white mb-3">
                    Check Your Email
                  </h2>
                  <p className="text-gray-400 leading-relaxed">
                    If your email address is registered with us, you will receive an email with instructions to reset your password.
                  </p>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-200 text-left">
                      Don&apos;t forget to check your spam or junk folder if you don&apos;t see the email in your inbox.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setSuccess(false)}
                    className="w-full py-3 border border-gray-700 text-gray-300 rounded-xl font-medium hover:bg-white/5 transition-colors"
                  >
                    Try another email
                  </button>

                  <Link
                    href="/auth/login"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-[#C4A572] text-white rounded-xl font-medium hover:bg-[#B39562] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back to login
                  </Link>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
