'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform, useInView, AnimatePresence, useMotionValue, useSpring, animate } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Wifi,
  Wind,
  Utensils,
  Tv,
  Bath,
  MapPin,
  Star,
  ArrowRight,
  Mail,
  Users,
  Maximize,
  BedDouble,
  Coffee,
  Waves,
  Building,
  Quote,
  ChevronLeft,
  ChevronRight,
  Shield,
  Award,
  ThumbsUp,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import SiteNav from './components/SiteNav';
import SiteFooter from './components/SiteFooter';
import BookingWidget from '@/components/booking/BookingWidget';
import api from '@/lib/api';
import { HeroImagePublic } from '@/types';

// Premium easing curves for luxury hospitality feel
const smoothEase = [0.25, 0.1, 0.25, 1] as const;
const luxuryEase = [0.43, 0.13, 0.23, 0.96] as const; // Cinematic easing
const springConfig = { stiffness: 100, damping: 30, mass: 1 };

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

// Fallback hero images (used when no images from API)
const defaultHeroImages = [
  {
    src: 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?q=80&w=2940&auto=format&fit=crop',
    alt: 'Venice Canal View'
  },
  {
    src: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?q=80&w=2940&auto=format&fit=crop',
    alt: 'Venice Grand Canal'
  },
  {
    src: 'https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?q=80&w=2940&auto=format&fit=crop',
    alt: 'Venice Architecture'
  },
  {
    src: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=2940&auto=format&fit=crop',
    alt: 'Italian Scenery'
  },
];

// Fallback gallery images
const defaultGalleryImages = [
  'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?q=80&w=2000',
  'https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?q=80&w=2000',
  'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?q=80&w=2000',
  'https://images.unsplash.com/photo-1518560299355-d7c6bb1e6d48?q=80&w=2000',
  'https://images.unsplash.com/photo-1549918864-48ac978761a4?q=80&w=2000',
  'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=2000',
  'https://images.unsplash.com/photo-1498307833015-e7b400441eb8?q=80&w=2000',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2000',
];

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

// Enhanced reviews with hospitality-grade data
const reviews = [
  {
    name: 'Sarah & Michael',
    location: 'New York, USA',
    rating: 5,
    text: 'An absolutely magical stay in Venice! The apartment exceeded all expectations. The location is perfect - quiet yet close to everything. We felt like true Venetians.',
    date: 'October 2024',
    avatar: 'SM',
    verified: true,
    stayType: 'Romantic Getaway',
    helpful: 24,
  },
  {
    name: 'Emma Laurent',
    location: 'Paris, France',
    rating: 5,
    text: 'Bellissimo! The attention to detail is remarkable. Waking up to canal views with my morning espresso was an unforgettable experience. Ali was an exceptional host.',
    date: 'September 2024',
    avatar: 'EL',
    verified: true,
    stayType: 'Solo Adventure',
    helpful: 18,
  },
  {
    name: 'Hans & Greta',
    location: 'Munich, Germany',
    rating: 5,
    text: 'Perfect for our honeymoon. The hosts were incredibly helpful and the apartment is beautifully designed. Every detail shows care and thought.',
    date: 'August 2024',
    avatar: 'HG',
    verified: true,
    stayType: 'Honeymoon',
    helpful: 31,
  },
];

// Rating categories for hospitality standard
const ratingCategories = [
  { label: 'Cleanliness', score: 9.9, icon: Sparkles },
  { label: 'Accuracy', score: 9.8, icon: CheckCircle },
  { label: 'Communication', score: 10, icon: ThumbsUp },
  { label: 'Location', score: 9.7, icon: MapPin },
  { label: 'Check-in', score: 9.9, icon: Award },
  { label: 'Value', score: 9.6, icon: Star },
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

// Animated counter hook for statistics
function useAnimatedCounter(endValue: number, duration: number = 2000, startOnView: boolean = true) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!startOnView || !isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Easing function for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * endValue));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [endValue, duration, isInView, startOnView]);

  return { count, ref };
}

// Premium Rating Score Component with animated circular progress
function RatingScoreDisplay({ score, totalReviews }: { score: number; totalReviews: number }) {
  const progressRef = useRef(null);
  const isInView = useInView(progressRef, { once: true });
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, score, {
      duration: 1.5,
      ease: luxuryEase,
      onUpdate: (value) => setDisplayScore(value),
    });
    return () => controls.stop();
  }, [isInView, score]);

  const circumference = 2 * Math.PI * 54; // radius = 54
  const strokeDashoffset = circumference - (displayScore / 10) * circumference;

  return (
    <div ref={progressRef} className="flex flex-col items-center">
      <div className="relative w-32 h-32 sm:w-40 sm:h-40">
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="8"
          />
          <motion.circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="#C4A572"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: isInView ? strokeDashoffset : circumference }}
            transition={{ duration: 1.5, ease: luxuryEase }}
          />
        </svg>
        {/* Score display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl sm:text-5xl font-bold text-gray-900">
            {displayScore.toFixed(1)}
          </span>
          <span className="text-xs sm:text-sm text-gray-500 font-medium">out of 10</span>
        </div>
      </div>
      <div className="mt-4 text-center">
        <p className="text-lg sm:text-xl font-semibold text-gray-900">Exceptional</p>
        <p className="text-sm text-gray-500">{totalReviews} verified reviews</p>
      </div>
    </div>
  );
}

// Premium Hero Carousel with Ken Burns effect
function HeroCarousel({
  images,
  currentIndex,
  onIndexChange
}: {
  images: { src: string; alt: string }[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}) {
  const [isPaused, setIsPaused] = useState(false);
  const progressRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);
  const progressMotion = useMotionValue(0);
  const progressSpring = useSpring(progressMotion, { stiffness: 50, damping: 20 });

  // Ken Burns animation directions
  const kenBurnsVariants = useMemo(() => [
    { scale: [1, 1.08], x: [0, 15], y: [0, 10] },     // Zoom in + pan right-down
    { scale: [1.08, 1], x: [15, -10], y: [10, 0] },   // Zoom out + pan left-up
    { scale: [1, 1.06], x: [0, -12], y: [0, 8] },     // Zoom in + pan left-down
    { scale: [1.06, 1], x: [-12, 8], y: [8, -5] },    // Zoom out + pan right-up
  ], []);

  // Smooth progress animation
  useEffect(() => {
    if (isPaused) return;

    const duration = 6000; // 6 seconds per slide
    let startTime: number | null = null;

    const animateProgress = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      progressMotion.set(progress * 100);
      progressRef.current = progress;

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateProgress);
      } else {
        // Move to next slide
        onIndexChange((currentIndex + 1) % images.length);
        progressMotion.set(0);
        progressRef.current = 0;
        startTime = null;
        animationRef.current = requestAnimationFrame(animateProgress);
      }
    };

    animationRef.current = requestAnimationFrame(animateProgress);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentIndex, images.length, isPaused, onIndexChange, progressMotion]);

  const goToSlide = (index: number) => {
    progressMotion.set(0);
    progressRef.current = 0;
    onIndexChange(index);
  };

  const goNext = () => goToSlide((currentIndex + 1) % images.length);
  const goPrev = () => goToSlide((currentIndex - 1 + images.length) % images.length);

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Images with Ken Burns effect */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            scale: kenBurnsVariants[currentIndex % kenBurnsVariants.length].scale,
            x: kenBurnsVariants[currentIndex % kenBurnsVariants.length].x,
            y: kenBurnsVariants[currentIndex % kenBurnsVariants.length].y,
          }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 1.2, ease: luxuryEase },
            scale: { duration: 6, ease: 'linear' },
            x: { duration: 6, ease: 'linear' },
            y: { duration: 6, ease: 'linear' },
          }}
          className="absolute inset-0 will-change-transform"
        >
          <Image
            src={images[currentIndex].src}
            alt={images[currentIndex].alt}
            fill
            className="object-cover"
            priority={currentIndex === 0}
            sizes="100vw"
            unoptimized
          />
        </motion.div>
      </AnimatePresence>

      {/* Premium gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/60 z-10" />

      {/* Navigation arrows */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-30 flex justify-between px-4 sm:px-6 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <motion.button
          onClick={goPrev}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </motion.button>
        <motion.button
          onClick={goNext}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          aria-label="Next image"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </motion.button>
      </div>

      {/* Premium progress indicators */}
      <div className="absolute bottom-28 sm:bottom-24 left-1/2 -translate-x-1/2 z-30 flex gap-3">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className="group relative h-1 rounded-full overflow-hidden transition-all duration-300"
            style={{ width: index === currentIndex ? '48px' : '24px' }}
            aria-label={`Go to image ${index + 1}`}
          >
            {/* Background */}
            <div className="absolute inset-0 bg-white/30 group-hover:bg-white/40 transition-colors" />
            {/* Progress fill */}
            {index === currentIndex && (
              <motion.div
                className="absolute inset-y-0 left-0 bg-white rounded-full"
                style={{ width: progressSpring.get() + '%' }}
              />
            )}
            {index < currentIndex && (
              <div className="absolute inset-0 bg-white rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const heroRef = useRef(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Fetch hero images from API (type: hero or both)
  const { data: heroImagesData } = useQuery({
    queryKey: ['public-hero-images'],
    queryFn: async () => {
      try {
        const response = await api.gallery.public('hero');
        return response.data;
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch gallery images from API (type: gallery or both)
  const { data: galleryImagesData } = useQuery({
    queryKey: ['public-gallery-images'],
    queryFn: async () => {
      try {
        const response = await api.gallery.public('gallery');
        return response.data;
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use API images or fallback to defaults
  const heroImages = heroImagesData && heroImagesData.length > 0
    ? heroImagesData.map((img: HeroImagePublic) => ({ src: img.url, alt: img.alt_text }))
    : defaultHeroImages;

  const galleryImages = galleryImagesData && galleryImagesData.length > 0
    ? galleryImagesData.map((img: HeroImagePublic) => ({ src: img.url, alt: img.alt_text }))
    : defaultGalleryImages.map((src, i) => ({ src, alt: `Gallery image ${i + 1}` }));

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.02]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 30]);

  // Memoized callback for carousel
  const handleIndexChange = useCallback((index: number) => {
    setCurrentImageIndex(index);
  }, []);

  return (
    <div className="min-h-screen bg-white antialiased">
      <SiteNav />

      {/* Hero Section with Premium Ken Burns Carousel */}
      <section ref={heroRef} className="relative h-[100svh] min-h-[600px] overflow-hidden">
        {/* Premium Background Images Carousel with Ken Burns Effect */}
        <motion.div
          style={{ scale: heroScale, y: heroY }}
          className="absolute inset-0 will-change-transform"
        >
          <HeroCarousel
            images={heroImages}
            currentIndex={currentImageIndex}
            onIndexChange={handleIndexChange}
          />
        </motion.div>

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

      {/* About Section - Premium Hospitality Design */}
      <AnimatedSection className="py-12 sm:py-20 lg:py-28 relative overflow-hidden" id="about">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23C4A572\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-start">
            {/* Text Content */}
            <motion.div variants={fadeInUp} className="order-2 lg:order-1">
              {/* Premium badge */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#C4A572]/10 rounded-full mb-4 sm:mb-6"
              >
                <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C4A572]" />
                <span className="text-[#C4A572] font-medium tracking-wider uppercase text-[10px] sm:text-xs">Superhost Property</span>
              </motion.div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light text-gray-900 mb-4 sm:mb-6 leading-tight">
                Your Private
                <span className="block text-[#C4A572] italic font-serif">Sanctuary</span>
                in Venice
              </h2>

              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                  Nestled in the historic <strong className="text-gray-900">Castello district</strong>, All&apos;Arco Apartment
                  offers an authentic Venetian experience with modern luxury.
                </p>
                <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
                  This spacious 85m² apartment features two elegantly appointed bedrooms, comfortably
                  accommodating up to 5 guests while combining traditional Venetian architecture with
                  contemporary design. Wake up to enchanting canal views, enjoy your morning espresso
                  on the terrace, and experience Venice like a true local.
                </p>
              </div>

              {/* Premium Host Card - Responsive */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-[#C4A572]/5 to-transparent rounded-xl sm:rounded-2xl border border-[#C4A572]/20 mb-6 sm:mb-8 touch-manipulation"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#C4A572] to-[#B39562] flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-base sm:text-lg">AH</span>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                    <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">Ali Hassan Cheema</p>
                    <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C4A572] flex-shrink-0" />
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500">Superhost · Identity verified</p>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-[#C4A572] text-[#C4A572]" />
                    ))}
                    <span className="text-[10px] sm:text-xs text-gray-500 ml-1">5.0 · 59 reviews</span>
                  </div>
                </div>
              </motion.div>

              {/* Premium Highlights Grid - Responsive 2x2 on mobile, 4x1 on larger */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {highlights.map(({ icon: Icon, value, unit, label }, index) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    className="relative group"
                  >
                    <div className="text-center p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-[#C4A572]/30 transition-all duration-300 touch-manipulation">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#C4A572]/10 to-[#C4A572]/5 flex items-center justify-center group-hover:from-[#C4A572]/20 group-hover:to-[#C4A572]/10 transition-colors">
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-[#C4A572]" />
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">
                        {value}<span className="text-xs sm:text-sm font-normal text-gray-400">{unit}</span>
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 font-medium">{label}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Premium Image Grid - Simplified responsive layout */}
            <motion.div variants={fadeInUp} className="order-1 lg:order-2">
              {/* Mobile: 2x2 simple grid, Desktop: Complex grid */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:hidden">
                {galleryImages.slice(0, 4).map((image: { src: string; alt: string }, i: number) => (
                  <motion.div
                    key={i}
                    className="relative aspect-[4/3] rounded-xl overflow-hidden shadow-lg"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      className="object-cover"
                      sizes="50vw"
                      unoptimized
                    />
                  </motion.div>
                ))}
              </div>

              {/* Desktop: Original complex grid */}
              <div className="hidden lg:grid grid-cols-6 gap-3">
                {galleryImages[0] && (
                  <motion.div
                    className="col-span-4 row-span-2 relative h-[320px] rounded-2xl overflow-hidden shadow-xl"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.4, ease: luxuryEase }}
                  >
                    <Image
                      src={galleryImages[0].src}
                      alt={galleryImages[0].alt}
                      fill
                      className="object-cover"
                      sizes="40vw"
                      unoptimized
                    />
                  </motion.div>
                )}
                {galleryImages[1] && (
                  <motion.div
                    className="col-span-2 relative h-[152px] rounded-xl overflow-hidden shadow-lg"
                    whileHover={{ scale: 1.03 }}
                  >
                    <Image
                      src={galleryImages[1].src}
                      alt={galleryImages[1].alt}
                      fill
                      className="object-cover"
                      sizes="15vw"
                      unoptimized
                    />
                  </motion.div>
                )}
                {galleryImages[2] && (
                  <motion.div
                    className="col-span-2 relative h-[152px] rounded-xl overflow-hidden shadow-lg"
                    whileHover={{ scale: 1.03 }}
                  >
                    <Image
                      src={galleryImages[2].src}
                      alt={galleryImages[2].alt}
                      fill
                      className="object-cover"
                      sizes="15vw"
                      unoptimized
                    />
                  </motion.div>
                )}
                {galleryImages[3] && (
                  <motion.div
                    className="col-span-3 relative h-[140px] rounded-xl overflow-hidden shadow-lg"
                    whileHover={{ scale: 1.02 }}
                  >
                    <Image
                      src={galleryImages[3].src}
                      alt={galleryImages[3].alt}
                      fill
                      className="object-cover"
                      sizes="25vw"
                      unoptimized
                    />
                  </motion.div>
                )}
                {galleryImages[4] && (
                  <motion.div
                    className="col-span-3 relative h-[140px] rounded-xl overflow-hidden shadow-lg"
                    whileHover={{ scale: 1.02 }}
                  >
                    <Image
                      src={galleryImages[4].src}
                      alt={galleryImages[4].alt}
                      fill
                      className="object-cover"
                      sizes="25vw"
                      unoptimized
                    />
                  </motion.div>
                )}
              </div>

              {/* Trust badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex items-center justify-center gap-1.5 sm:gap-2 mt-4 sm:mt-6 text-xs sm:text-sm text-gray-500"
              >
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                <span>Verified property · 17 min to Rialto Bridge</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* Amenities Section */}
      <AnimatedSection className="py-12 sm:py-16 lg:py-24 bg-gray-50" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeInUp} className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
            <span className="text-[#C4A572] font-medium tracking-wider uppercase text-[10px] sm:text-xs">Amenities</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-light text-gray-900 mt-2 sm:mt-3 mb-2 sm:mb-3">
              Everything You Need
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              Thoughtfully curated amenities for an exceptional stay
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 lg:gap-4"
          >
            {amenities.map(({ icon: Icon, label, description }) => (
              <motion.div
                key={label}
                variants={fadeInUp}
                className="bg-white p-3 sm:p-4 lg:p-5 rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-300 group cursor-pointer border border-gray-100 focus-within:ring-2 focus-within:ring-[#C4A572] focus:outline-none touch-manipulation"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                tabIndex={0}
                role="article"
                aria-label={`${label}: ${description}`}
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 bg-[#C4A572]/10 rounded-lg flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-[#C4A572] transition-colors duration-300">
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-[#C4A572] group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-0.5 leading-tight">{label}</h3>
                <p className="text-[10px] sm:text-xs text-gray-500 leading-snug">{description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Book Your Stay Section */}
      <AnimatedSection className="py-12 sm:py-16 lg:py-24" id="book">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeInUp} className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
            <span className="text-[#C4A572] font-medium tracking-wider uppercase text-[10px] sm:text-xs">Book Your Stay</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-light text-gray-900 mt-2 sm:mt-3 mb-2 sm:mb-3">
              Reserve Your Venetian Escape
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              Select your dates and guests to check availability and pricing
            </p>
          </motion.div>
          <motion.div variants={fadeInUp}>
            <BookingWidget />
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Gallery Section */}
      <AnimatedSection className="py-12 sm:py-16 lg:py-24" id="gallery">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeInUp} className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
            <span className="text-[#C4A572] font-medium tracking-wider uppercase text-[10px] sm:text-xs">Gallery</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-light text-gray-900 mt-2 sm:mt-3 mb-2">
              A Visual Journey
            </h2>
          </motion.div>

          <motion.div variants={fadeInUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {galleryImages.slice(0, 8).map((image: { src: string; alt: string }, i: number) => (
              <motion.div
                key={i}
                className={`relative overflow-hidden rounded-lg sm:rounded-xl cursor-pointer touch-manipulation ${
                  i === 0 ? 'col-span-2 row-span-2 aspect-square sm:aspect-[4/3]' : 'aspect-[4/3]'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                tabIndex={0}
                role="button"
                aria-label={`View ${image.alt}`}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  unoptimized
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Location Section */}
      <AnimatedSection className="py-12 sm:py-16 lg:py-24 bg-gray-900 text-white" id="location">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <motion.div variants={fadeInUp}>
              <span className="text-[#C4A572] font-medium tracking-wider uppercase text-[10px] sm:text-xs">Location</span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-light mt-2 sm:mt-3 mb-3 sm:mb-4">
                In the Heart of Venice
              </h2>
              <p className="text-sm sm:text-base text-gray-400 leading-relaxed mb-5 sm:mb-6">
                Located in the prestigious Castello district, All&apos;Arco Apartment offers the perfect base for
                exploring Venice. Away from the tourist crowds yet minutes from major attractions.
              </p>

              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-5 sm:mb-6">
                {nearbyAttractions.map(({ name, distance }) => (
                  <div key={name} className="flex items-center gap-2 py-2 touch-manipulation">
                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C4A572] flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm text-white block truncate">{name}</span>
                      <span className="text-[10px] sm:text-xs text-gray-500">{distance}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-400">
                <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>Castello 2739/A, Venice, Italy</span>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="relative h-[240px] sm:h-[320px] lg:h-[380px] rounded-xl sm:rounded-2xl overflow-hidden">
              <Image
                src={heroImages[0]?.src || defaultHeroImages[0].src}
                alt="Venice Location"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
              <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4">
                <a
                  href="https://maps.google.com/?q=Castello+2739/A+Venice+Italy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-white text-gray-900 font-medium text-sm rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white touch-manipulation"
                >
                  <MapPin className="w-4 h-4" />
                  View on Google Maps
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* Reviews Section - Premium Hospitality Standard */}
      <AnimatedSection className="py-12 sm:py-16 lg:py-24 bg-gradient-to-b from-white via-gray-50/50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <motion.div variants={fadeInUp} className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#C4A572]/10 rounded-full mb-4 sm:mb-6"
            >
              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C4A572]" />
              <span className="text-[#C4A572] font-medium tracking-wider uppercase text-[10px] sm:text-xs">Guest Favorite</span>
            </motion.div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-light text-gray-900 mb-2 sm:mb-3">
              Loved by <span className="text-[#C4A572] italic font-serif">Travelers</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              One of the most loved homes on the platform, according to guests
            </p>
          </motion.div>

          {/* Rating Overview - Premium Layout */}
          <motion.div
            variants={fadeInUp}
            className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 p-4 sm:p-6 lg:p-10 mb-8 sm:mb-12"
          >
            <div className="grid lg:grid-cols-12 gap-6 lg:gap-10 items-center">
              {/* Main Score */}
              <div className="lg:col-span-4 flex justify-center">
                <RatingScoreDisplay score={9.8} totalReviews={59} />
              </div>

              {/* Category Breakdown */}
              <div className="lg:col-span-8">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-4">Rating Breakdown</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {ratingCategories.map((category, index) => {
                    const Icon = category.icon;
                    return (
                      <motion.div
                        key={category.label}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors touch-manipulation"
                      >
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#C4A572]/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-[#C4A572]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                            <span className="text-[10px] sm:text-xs font-medium text-gray-700 truncate">{category.label}</span>
                            <span className="text-[10px] sm:text-xs font-bold text-gray-900 ml-1">{category.score}</span>
                          </div>
                          <div className="h-1.5 sm:h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-[#C4A572] to-[#D4B582] rounded-full"
                              initial={{ width: 0 }}
                              whileInView={{ width: `${(category.score / 10) * 100}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 1, delay: index * 0.05, ease: luxuryEase }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Review Cards - Premium Design */}
          <motion.div variants={staggerContainer} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {reviews.map((review, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.99 }}
                className="group bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden touch-manipulation"
              >
                {/* Decorative gradient */}
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-[#C4A572]/5 to-transparent rounded-bl-full" />

                {/* Quote icon */}
                <Quote className="w-8 h-8 sm:w-10 sm:h-10 text-[#C4A572]/10 absolute top-4 right-4 sm:top-6 sm:right-6" />

                {/* Header with avatar */}
                <div className="flex items-start gap-3 mb-4 relative z-10">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#C4A572] to-[#B39562] flex items-center justify-center shadow-md">
                      <span className="text-white font-bold text-sm sm:text-base">{review.avatar}</span>
                    </div>
                    {review.verified && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                        <CheckCircle className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm truncate">{review.name}</p>
                      {review.verified && (
                        <span className="text-[10px] text-blue-500 font-medium">Verified</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{review.location}</p>
                    <p className="text-[10px] text-[#C4A572] font-medium mt-0.5">{review.stayType}</p>
                  </div>
                </div>

                {/* Rating stars */}
                <div className="flex items-center gap-0.5 mb-3">
                  {[...Array(review.rating)].map((_, j) => (
                    <Star key={j} className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-[#C4A572] text-[#C4A572]" />
                  ))}
                  <span className="text-[10px] sm:text-xs text-gray-500 ml-2">{review.date}</span>
                </div>

                {/* Review text */}
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4 line-clamp-4">
                  &ldquo;{review.text}&rdquo;
                </p>

                {/* Helpful indicator */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <button className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-500 hover:text-[#C4A572] transition-colors touch-manipulation">
                    <ThumbsUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span>Helpful ({review.helpful})</span>
                  </button>
                  <span className="text-[10px] text-gray-400 hidden sm:inline">Stayed {review.date}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-gray-100"
          >
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-500">
              <Shield className="w-4 h-4 text-green-500" />
              <span>All reviews verified</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-500">
              <Award className="w-4 h-4 text-[#C4A572]" />
              <span>Guest Favorite 2024</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-500">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              <span>Superhost since 2023</span>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
