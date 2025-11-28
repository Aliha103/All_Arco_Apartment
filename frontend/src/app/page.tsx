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
  MapPin,
  Star,
  ArrowRight,
  Users,
  Maximize,
  BedDouble,
  Coffee,
  Waves,
  Building,
  Quote,
} from 'lucide-react';
import SiteNav from './components/SiteNav';
import SiteFooter from './components/SiteFooter';
import BookingWidget from '@/components/booking/BookingWidget';
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

interface HeroImage {
  id: number;
  title: string;
  alt_text: string;
  image: string | null;
  image_url: string | null;
  url: string;
}

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

const reviews = [
  {
    name: 'Sarah & Michael',
    location: 'New York, USA',
    rating: 5,
    text: 'An absolutely magical stay in Venice! The apartment exceeded all expectations. The location is perfect - quiet yet close to everything.',
    date: 'October 2024',
  },
  {
    name: 'Emma Laurent',
    location: 'Paris, France',
    rating: 5,
    text: 'Bellissimo! The attention to detail is remarkable. Waking up to canal views with my morning espresso was unforgettable.',
    date: 'September 2024',
  },
  {
    name: 'Hans & Greta',
    location: 'Munich, Germany',
    rating: 5,
    text: 'Perfect for our honeymoon. The hosts were incredibly helpful and the apartment is beautifully designed.',
    date: 'August 2024',
  },
];

const nearbyAttractions = [
  { name: 'Rialto Bridge', distance: '17 min' },
  { name: 'St. Mark\'s Square', distance: '20 min' },
  { name: 'Teatro La Fenice', distance: '15 min' },
  { name: 'Doge\'s Palace', distance: '22 min' },
];

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
          setHeroImages(images.map((img: HeroImage) => ({
            src: img.url || img.image || img.image_url || '',
            alt: img.alt_text || img.title
          })));
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
          setGalleryImages(images.map((img: HeroImage) => ({
            src: img.url || img.image || img.image_url || '',
            alt: img.alt_text || img.title
          })));
        }
      } catch (error) {
        console.error('Failed to fetch gallery images:', error);
      } finally {
        setIsLoadingGallery(false);
      }
    };
    fetchGalleryImages();
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
            <AnimatePresence mode="wait">
              <motion.div
                key={currentImageIndex}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: smoothEase }}
                className="absolute inset-0"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50 z-10" />
                <Image
                  src={heroImages[currentImageIndex].src}
                  alt={heroImages[currentImageIndex].alt}
                  fill
                  className="object-cover"
                  priority={currentImageIndex === 0}
                  sizes="100vw"
                  unoptimized={heroImages[currentImageIndex].src.startsWith('http')}
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

      {/* About Section */}
      <AnimatedSection className="py-16 sm:py-20 lg:py-28" id="about">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <motion.div variants={fadeInUp}>
              <span className="text-[#C4A572] font-medium tracking-wider uppercase text-xs sm:text-sm">The Apartment</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 mt-3 mb-5 leading-tight">
                Your Private Sanctuary in Venice
              </h2>
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-4 sm:mb-6">
                Nestled in the historic Castello district, All&apos;Arco Apartment offers an authentic Venetian experience
                with modern luxury. This beautifully appointed 85m² apartment with 2 bedrooms combines traditional Venetian
                architecture with contemporary design, accommodating up to 5 guests.
              </p>
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-4 sm:mb-6">
                Wake up to enchanting canal views, enjoy your morning espresso on the terrace, and experience
                Venice like a true local. Just 17 minutes from the iconic Rialto Bridge.
              </p>
              <p className="text-sm text-gray-500 mb-6 sm:mb-8">
                Hosted by <span className="font-semibold text-gray-700">Ali Hassan Cheema</span>
              </p>

              {/* Highlights Grid */}
              <div className="grid grid-cols-4 gap-2 sm:gap-4">
                {highlights.map(({ icon: Icon, value, unit, label }) => (
                  <motion.div
                    key={label}
                    className="text-center p-3 sm:p-4 bg-gray-50 rounded-xl sm:rounded-2xl hover:bg-gray-100 transition-colors"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-[#C4A572] mx-auto mb-1 sm:mb-2" />
                    <div className="text-xl sm:text-2xl font-semibold text-gray-900">
                      {value}<span className="text-xs sm:text-sm">{unit}</span>
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Image Grid */}
            <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-3 sm:space-y-4">
                <div className="relative h-48 sm:h-64 rounded-xl sm:rounded-2xl overflow-hidden bg-gray-100">
                  {galleryImages[0] ? (
                    <Image
                      src={galleryImages[0].src}
                      alt={galleryImages[0].alt || 'Apartment image 1'}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 50vw, 25vw"
                      unoptimized={galleryImages[0].src.startsWith('http')}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                      {isLoadingGallery ? 'Loading...' : 'Image 1'}
                    </div>
                  )}
                </div>
                <div className="relative h-36 sm:h-48 rounded-xl sm:rounded-2xl overflow-hidden bg-gray-100">
                  {galleryImages[1] ? (
                    <Image
                      src={galleryImages[1].src}
                      alt={galleryImages[1].alt || 'Apartment image 2'}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 50vw, 25vw"
                      unoptimized={galleryImages[1].src.startsWith('http')}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                      {isLoadingGallery ? 'Loading...' : 'Image 2'}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4 pt-6 sm:pt-8">
                <div className="relative h-36 sm:h-48 rounded-xl sm:rounded-2xl overflow-hidden bg-gray-100">
                  {galleryImages[2] ? (
                    <Image
                      src={galleryImages[2].src}
                      alt={galleryImages[2].alt || 'Apartment image 3'}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 50vw, 25vw"
                      unoptimized={galleryImages[2].src.startsWith('http')}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                      {isLoadingGallery ? 'Loading...' : 'Image 3'}
                    </div>
                  )}
                </div>
                <div className="relative h-48 sm:h-64 rounded-xl sm:rounded-2xl overflow-hidden bg-gray-100">
                  {galleryImages[3] ? (
                    <Image
                      src={galleryImages[3].src}
                      alt={galleryImages[3].alt || 'Apartment image 4'}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 50vw, 25vw"
                      unoptimized={galleryImages[3].src.startsWith('http')}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                      {isLoadingGallery ? 'Loading...' : 'Image 4'}
                    </div>
                  )}
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
                      unoptimized={image.src.startsWith('http')}
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

      {/* Location Section */}
      <AnimatedSection className="py-16 sm:py-20 lg:py-28 bg-gray-900 text-white" id="location">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <motion.div variants={fadeInUp}>
              <span className="text-[#C4A572] font-medium tracking-wider uppercase text-xs sm:text-sm">Location</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light mt-3 mb-5">
                In the Heart of Venice
              </h2>
              <p className="text-base sm:text-lg text-gray-400 leading-relaxed mb-6 sm:mb-8">
                Located in the prestigious Castello district, All&apos;Arco Apartment offers the perfect base for
                exploring Venice. Away from the tourist crowds yet minutes from major attractions.
              </p>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                {nearbyAttractions.map(({ name, distance }) => (
                  <div key={name} className="flex items-center gap-2 sm:gap-3 py-2 sm:py-3">
                    <MapPin className="w-4 h-4 text-[#C4A572] flex-shrink-0" />
                    <div>
                      <span className="text-sm sm:text-base text-white">{name}</span>
                      <span className="text-xs sm:text-sm text-gray-500 ml-2">{distance}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  <span>Castello 2739/A, Venice, Italy</span>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="relative h-[300px] sm:h-[400px] lg:h-[450px] rounded-xl sm:rounded-2xl overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?q=80&w=2000&auto=format&fit=crop"
                alt="Venice Map Area"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
              <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6">
                <a
                  href="https://maps.google.com/?q=Castello+2739/A+Venice+Italy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 sm:py-4 bg-white text-gray-900 font-medium rounded-lg sm:rounded-xl hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                  View on Google Maps
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* Reviews Section */}
      <AnimatedSection className="py-16 sm:py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeInUp} className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <span className="text-[#C4A572] font-medium tracking-wider uppercase text-xs sm:text-sm">Reviews</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 mt-3 mb-4">
              What Our Guests Say
            </h2>
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <div className="flex items-center gap-0.5 sm:gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 fill-[#C4A572] text-[#C4A572]" />
                ))}
              </div>
              <span className="text-xl sm:text-2xl font-semibold text-gray-900">9.8</span>
              <span className="text-sm sm:text-base text-gray-500">from 59 reviews</span>
            </div>
          </motion.div>

          <motion.div variants={staggerContainer} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {reviews.map((review, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="bg-gray-50 p-5 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl relative"
                whileHover={{ y: -4 }}
              >
                <Quote className="w-8 h-8 sm:w-10 sm:h-10 text-[#C4A572]/20 absolute top-4 sm:top-6 right-4 sm:right-6" />
                <div className="flex items-center gap-0.5 mb-3 sm:mb-4">
                  {[...Array(review.rating)].map((_, j) => (
                    <Star key={j} className="w-3 h-3 sm:w-4 sm:h-4 fill-[#C4A572] text-[#C4A572]" />
                  ))}
                </div>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-4 sm:mb-6">&ldquo;{review.text}&rdquo;</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm sm:text-base font-semibold text-gray-900">{review.name}</p>
                    <p className="text-xs sm:text-sm text-gray-500">{review.location}</p>
                  </div>
                  <span className="text-[10px] sm:text-xs text-gray-400">{review.date}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
