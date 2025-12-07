'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import {
  Wifi,
  Wind,
  Utensils,
  Tv,
  Bath,
  Star,
  ArrowRight,
  Users,
  Maximize,
  BedDouble,
  Coffee,
  Waves,
  Award,
  Pencil,
} from 'lucide-react';
import SiteNav from './components/SiteNav';
import SiteFooter from './components/SiteFooter';
import BookingWidget from '@/components/booking/BookingWidget';
import ReviewsSection from '@/components/reviews/ReviewsSection';
import LocationSection from '@/components/location/LocationSection';
import { api } from '@/lib/api';

// Smooth easing for all animations
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

// Animation variants with improved smoothness
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: smoothEase }
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

interface GalleryImage {
  id: number;
  title: string;
  alt_text: string;
  url: string;
  image_type: 'hero' | 'gallery' | 'both';
  order: number;
}

// Normalize media URLs to absolute to avoid _next/image proxy errors
const normalizeImageUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `https://www.allarcoapartment.com${url}`;
};

// Property data
const amenities = [
  { icon: Wifi, label: 'High-Speed WiFi', description: 'Work or stream seamlessly' },
  { icon: Wind, label: 'Air Conditioning', description: 'Climate control throughout' },
  { icon: Utensils, label: 'Fully Equipped Kitchen', description: 'Cook like a local' },
  { icon: Tv, label: 'Smart TV', description: 'Netflix & streaming ready' },
  { icon: Bath, label: 'Luxury Bathroom', description: 'Rain shower & premium amenities' },
  { icon: Coffee, label: 'Coffee Machine', description: 'Italian espresso at home' },
  { icon: BedDouble, label: 'Premium Bedding', description: 'Hypoallergenic down pillows' },
  { icon: Waves, label: 'Canal Views', description: 'Authentic Venice scenery' },
];

const highlights = [
  { icon: Maximize, value: '85', unit: 'm²', label: 'Living Space' },
  { icon: BedDouble, value: '2', unit: '', label: 'Bedrooms' },
  { icon: Users, value: '5', unit: '', label: 'Guests' },
  { icon: Bath, value: '1', unit: '', label: 'Bathroom' },
];

interface HostProfile {
  id?: string | number;
  display_name: string;
  role_title?: string;
  bio?: string;
  languages?: string[];
  avatar?: string;
}

interface PublicReview {
  id: string;
  guest_name: string;
  location?: string;
  rating: number;
  title?: string;
  text: string;
  stay_date?: string;
}


// Animated section with scroll reveal
const AnimatedSection = ({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.section>
  );
};

// Reusable button component with proper accessibility
const Button = ({
  href,
  variant = 'primary',
  children,
  className = '',
  onClick,
  external = false
}: {
  href?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  external?: boolean;
}) => {
  const baseStyles = `
    inline-flex items-center justify-center gap-2
    min-h-[48px] px-6 sm:px-8
    font-medium rounded-full
    transition-all duration-300 ease-out
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    active:scale-[0.98] touch-manipulation
  `;

  const variants = {
    primary: 'bg-[#C4A572] text-white hover:bg-[#B39562] focus-visible:ring-[#C4A572] hover:shadow-lg',
    secondary: 'bg-white text-gray-900 hover:bg-gray-50 focus-visible:ring-gray-400 hover:shadow-lg',
    outline: 'bg-white/10 backdrop-blur-sm text-white border border-white/30 hover:bg-white/20 focus-visible:ring-white',
  };

  const combinedStyles = `${baseStyles} ${variants[variant]} ${className}`;

  if (href) {
    const linkProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
    return (
      <Link href={href} className={combinedStyles} {...linkProps}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={combinedStyles}>
      {children}
    </button>
  );
};

export default function Home() {
  const heroRef = useRef(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [heroImages, setHeroImages] = useState<{ src: string; alt: string }[]>([]);
  const [galleryImages, setGalleryImages] = useState<{ src: string; alt: string }[]>([]);
  const [hostProfile, setHostProfile] = useState<HostProfile | null>(null);
  const [publicReviews, setPublicReviews] = useState<PublicReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const [isLoadingGallery, setIsLoadingGallery] = useState(true);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.05]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 50]);

  // Fetch hero images from database
  useEffect(() => {
    const fetchHeroImages = async () => {
      try {
        const response = await api.gallery.public('hero');
        const images = response.data;
        if (images && images.length > 0) {
          setHeroImages(images.map((img: GalleryImage) => ({
            src: normalizeImageUrl(img.url || ''),
            alt: img.alt_text || img.title || 'Hero image'
          })).filter((img: { src: string; alt: string }) => img.src)); // Filter out empty URLs
        }
      } catch (error) {
        console.error('Failed to fetch hero images:', error);
      } finally {
        setIsLoadingImages(false);
      }
    };
    fetchHeroImages();
  }, []);

  // Fetch gallery images from database
  useEffect(() => {
    const fetchGalleryImages = async () => {
      try {
        const response = await api.gallery.public('gallery');
        const images = response.data;
        if (images && images.length > 0) {
          setGalleryImages(images.map((img: GalleryImage) => ({
            src: normalizeImageUrl(img.url || ''),
            alt: img.alt_text || img.title || 'Gallery image'
          })).filter((img: { src: string; alt: string }) => img.src)); // Filter out empty URLs
        }
      } catch (error) {
        console.error('Failed to fetch gallery images:', error);
      } finally {
        setIsLoadingGallery(false);
      }
    };
    fetchGalleryImages();
  }, []);

  // Fetch host profile & public reviews
  useEffect(() => {
    const loadHostAndReviews = async () => {
      try {
        const [hostRes, reviewsRes] = await Promise.all([
          api.host.get(),
          api.reviews.list(),
        ]);
        const hostData = hostRes.data || null;
        const reviewsData = reviewsRes.data;
        const normalizedReviews = Array.isArray(reviewsData?.results)
          ? reviewsData.results
          : Array.isArray(reviewsData)
            ? reviewsData
            : [];
        setHostProfile(
          hostData
            ? {
                ...hostData,
                languages: Array.isArray(hostData.languages) ? hostData.languages : [],
              }
            : null
        );
        setPublicReviews(normalizedReviews);
      } catch (error) {
        console.error('Failed to load host/reviews', error);
      } finally {
        setReviewsLoading(false);
      }
    };
    loadHostAndReviews();
  }, []);

  // Check auth to show edit shortcut for super admins (skip if no session cookie)
  useEffect(() => {
    const hasSession = typeof document !== 'undefined' && document.cookie.includes('sessionid=');
    if (!hasSession) return;
    const loadMe = async () => {
      try {
        const res = await api.auth.me();
        setIsSuperAdmin(Boolean(res.data?.is_super_admin));
      } catch (error) {
        setIsSuperAdmin(false);
      }
    };
    loadMe();
  }, []);

  // Auto-scroll hero images every 5 seconds
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  return (
    <div className="min-h-screen bg-white antialiased">
      <SiteNav />

      {/* Hero Section with Auto-Scrolling Images */}
      <section ref={heroRef} className="relative h-[100svh] min-h-[600px] overflow-hidden">
        {/* Background Images Carousel */}
        <motion.div
          style={{ scale: heroScale, y: heroY }}
          className="absolute inset-0 will-change-transform"
        >
          {/* Gradient background - shown when loading or no images */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#2d2d44] to-[#16213e]" />

          {/* Images carousel - overlays the gradient when images available */}
          {!isLoadingImages && heroImages.length > 0 && (
            <AnimatePresence>
              <motion.div
                key={currentImageIndex}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0.4, scale: 1.02 }}
                transition={{ duration: 1.1, ease: smoothEase }}
                className="absolute inset-0 overflow-hidden will-change-transform"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50 z-10" />
                <Image
                  src={heroImages[currentImageIndex].src}
                  alt={heroImages[currentImageIndex].alt}
                  fill
                  className="object-cover will-change-transform"
                  priority={currentImageIndex === 0}
                  sizes="100vw"
                  unoptimized
                />
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>

        {/* Image Indicators - only show if more than 1 image */}
        {heroImages.length > 1 && (
          <div className="absolute bottom-32 sm:bottom-28 left-1/2 -translate-x-1/2 z-30 flex gap-2">
            {heroImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentImageIndex
                    ? 'bg-white w-6'
                    : 'bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Hero Content */}
        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative z-20 h-full flex flex-col justify-center items-center text-center px-4 sm:px-6"
        >
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: smoothEase }}
            className="inline-block px-4 py-2 mb-4 sm:mb-6 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-xs sm:text-sm font-medium tracking-wider uppercase"
          >
            Luxury Apartment in Venice
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: smoothEase }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light text-white mb-4 sm:mb-6 tracking-tight"
          >
            All&apos;Arco Apartment
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7, ease: smoothEase }}
            className="text-base sm:text-lg md:text-xl text-white/80 font-light max-w-xl mb-6 sm:mb-8 px-4"
          >
            An exquisite canal-view apartment in the heart of Castello, Venice
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9, ease: smoothEase }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto px-4 sm:px-0"
          >
            <Button href="/#about" variant="primary" className="group w-full sm:w-auto">
              Discover More
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button href="/#gallery" variant="outline" className="w-full sm:w-auto">
              View Gallery
            </Button>
          </motion.div>

          {/* Rating Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="absolute bottom-20 sm:bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-3 bg-white/10 backdrop-blur-md px-4 sm:px-6 py-2 sm:py-3 rounded-full"
          >
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 sm:w-4 sm:h-4 fill-[#C4A572] text-[#C4A572]" />
              ))}
            </div>
            <span className="text-white font-semibold text-sm sm:text-base">9.8</span>
            <span className="text-white/70 text-xs sm:text-sm hidden sm:inline">Exceptional</span>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 hidden sm:block"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              className="w-5 h-8 border-2 border-white/30 rounded-full flex justify-center"
            >
              <motion.div className="w-1 h-1.5 bg-white/60 rounded-full mt-1.5" />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* About Section - Clean & Simple */}
      <AnimatedSection className="py-16 sm:py-20 lg:py-28" id="about">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left - Content */}
            <motion.div variants={fadeInUp} className="space-y-8">
              {/* Title */}
              <div>
                <span className="text-[#C4A572] font-medium tracking-wider uppercase text-xs sm:text-sm">The Apartment</span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 mt-3 mb-6 leading-tight">
                  Your Private Sanctuary in Venice
                </h2>

                {/* Description */}
                <div className="space-y-4 text-gray-600 text-base sm:text-lg leading-relaxed">
                  <p>
                    Nestled in the historic Castello district, All&apos;Arco Apartment offers an authentic
                    Venetian experience with modern luxury. This beautifully appointed apartment combines
                    traditional Venetian architecture with contemporary design.
                  </p>
                  <p>
                    Wake up to enchanting canal views, enjoy your morning espresso on the terrace,
                    and experience Venice like a true local. Just 17 minutes from the iconic Rialto Bridge.
                  </p>
                </div>
              </div>

              {/* Property Stats */}
              <div className="grid grid-cols-4 gap-4">
                {highlights.map(({ icon: Icon, value, unit, label }) => (
                  <div key={label} className="text-center">
                    <Icon className="w-6 h-6 text-[#C4A572] mx-auto mb-2" />
                    <div className="text-2xl sm:text-3xl font-semibold text-gray-900">
                      {value}<span className="text-sm font-normal text-gray-400">{unit}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{label}</div>
                  </div>
                ))}
              </div>

              {/* Host Info - live data */}
              <div className="flex items-center gap-4 pt-6 border-t border-gray-100 relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C4A572] to-[#8B7355] flex items-center justify-center text-white font-semibold overflow-hidden">
                  {hostProfile?.avatar ? (
                    <Image src={hostProfile.avatar || '/allarco-logo.png'} alt={hostProfile.display_name} fill className="object-cover" unoptimized />
                  ) : (
                    (hostProfile?.display_name || 'Host')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Hosted by {hostProfile?.display_name || 'Your Host'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {publicReviews.length > 0 ? `${publicReviews.length} reviews` : 'Reviews updating'} ·{' '}
                    {(hostProfile?.languages || ['Languages updating']).slice(0, 3).join(', ')}
                  </p>
                </div>
                <span className="ml-auto inline-flex items-center gap-1 px-3 py-1 bg-[#C4A572]/10 text-[#C4A572] text-xs font-medium rounded-full">
                  <Award className="w-3.5 h-3.5" />
                  Superhost
                </span>
                {isSuperAdmin && (
                  <a
                    href="/pms"
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white shadow border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:shadow-md transition"
                    title="Edit host profile"
                  >
                    <Pencil className="w-4 h-4" />
                  </a>
                )}
              </div>
            </motion.div>

            {/* Right - Images */}
            <motion.div variants={fadeInUp}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-3">
                  <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-gray-100">
                    {galleryImages[0] ? (
                      <Image
                        src={galleryImages[0].src}
                        alt={galleryImages[0].alt || 'Apartment'}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 50vw, 25vw"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                        <Maximize className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100">
                    {galleryImages[1] ? (
                      <Image
                        src={galleryImages[1].src}
                        alt={galleryImages[1].alt || 'Apartment'}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 50vw, 25vw"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                        <Maximize className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-3 pt-6">
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100">
                    {galleryImages[2] ? (
                      <Image
                        src={galleryImages[2].src}
                        alt={galleryImages[2].alt || 'Apartment'}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 50vw, 25vw"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                        <Maximize className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-gray-100">
                    {galleryImages[3] ? (
                      <Image
                        src={galleryImages[3].src}
                        alt={galleryImages[3].alt || 'Apartment'}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 50vw, 25vw"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                        <Maximize className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* Book Your Stay Section */}
      <AnimatedSection className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-[#F9F6F1] to-white" id="book">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div variants={fadeInUp} className="text-center mb-8">
            <span className="text-[#C4A572] font-medium tracking-wider uppercase text-xs sm:text-sm">Reservations</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 mt-3 mb-4">
              Book Your Stay
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-xl mx-auto">
              Experience the magic of Venice from our beautifully appointed apartment in the heart of Castello.
            </p>
          </motion.div>

          {/* Booking Widget - Full Width */}
          <motion.div variants={fadeInUp}>
            <BookingWidget />
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Amenities Section */}
      <AnimatedSection className="py-16 sm:py-20 lg:py-28 bg-gray-50" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeInUp} className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <span className="text-[#C4A572] font-medium tracking-wider uppercase text-xs sm:text-sm">Amenities</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 mt-3 mb-4">
              Everything You Need
            </h2>
            <p className="text-base sm:text-lg text-gray-600">
              Thoughtfully curated amenities for an exceptional stay
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6"
          >
            {amenities.map(({ icon: Icon, label, description }) => (
              <motion.div
                key={label}
                variants={fadeInUp}
                className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl hover:shadow-lg transition-all duration-300 group cursor-pointer border border-gray-100 focus-within:ring-2 focus-within:ring-[#C4A572]"
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                tabIndex={0}
                role="article"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#C4A572]/10 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-[#C4A572] transition-colors duration-300">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-[#C4A572] group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-0.5 sm:mb-1">{label}</h3>
                <p className="text-xs sm:text-sm text-gray-500">{description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Gallery Section */}
      <AnimatedSection className="py-16 sm:py-20 lg:py-28" id="gallery">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeInUp} className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <span className="text-[#C4A572] font-medium tracking-wider uppercase text-xs sm:text-sm">Gallery</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 mt-3 mb-4">
              A Visual Journey
            </h2>
          </motion.div>

          <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            {/* Show 8 gallery slots - use DB images if available, else placeholder */}
            {Array.from({ length: 8 }).map((_, i) => {
              const image = galleryImages[i];
              return (
                <motion.div
                  key={i}
                  className={`relative overflow-hidden rounded-lg sm:rounded-xl lg:rounded-2xl cursor-pointer bg-gray-100 ${
                    i === 0 || i === 5 ? 'md:col-span-2 md:row-span-2 h-48 sm:h-64 md:h-full min-h-[200px]' : 'h-32 sm:h-40 lg:h-48'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  tabIndex={0}
                  role="button"
                  aria-label={`View gallery image ${i + 1}`}
                >
                  {image ? (
                    <Image
                      src={image.src}
                      alt={image.alt || `Gallery image ${i + 1}`}
                      fill
                      className="object-cover hover:scale-110 transition-transform duration-500"
                      sizes="(max-width: 768px) 50vw, 25vw"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                      {isLoadingGallery ? 'Loading...' : `Image ${i + 1}`}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Reviews Section */}
      <ReviewsSection initialReviews={publicReviews} loading={reviewsLoading} />

      {/* Location Section */}
      <LocationSection />

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
