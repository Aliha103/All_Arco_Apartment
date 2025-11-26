'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  Wifi,
  Wind,
  Utensils,
  Tv,
  Bath,
  MapPin,
  Star,
  ChevronRight,
  Play,
  ArrowRight,
  Check,
  Phone,
  Mail,
  Clock,
  Users,
  Maximize,
  BedDouble,
  Coffee,
  Waves,
  Building,
  Heart,
  Quote,
} from 'lucide-react';
import SiteNav from './components/SiteNav';
import SiteFooter from './components/SiteFooter';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 1 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
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
  { icon: Maximize, value: '70', unit: 'm²', label: 'Living Space' },
  { icon: BedDouble, value: '1', unit: '', label: 'Bedroom' },
  { icon: Users, value: '4', unit: '', label: 'Guests' },
  { icon: Bath, value: '1', unit: '', label: 'Bathroom' },
];

const reviews = [
  {
    name: 'Sarah & Michael',
    location: 'New York, USA',
    rating: 5,
    text: 'An absolutely magical stay in Venice! The apartment exceeded all expectations. The location is perfect - quiet yet close to everything. We\'ll definitely be back.',
    date: 'October 2024',
  },
  {
    name: 'Emma Laurent',
    location: 'Paris, France',
    rating: 5,
    text: 'Bellissimo! The attention to detail is remarkable. Waking up to canal views with my morning espresso was unforgettable. A true Venetian experience.',
    date: 'September 2024',
  },
  {
    name: 'Hans & Greta',
    location: 'Munich, Germany',
    rating: 5,
    text: 'Perfect for our honeymoon. The hosts were incredibly helpful and the apartment is beautifully designed. We felt at home from the moment we arrived.',
    date: 'August 2024',
  },
];

const nearbyAttractions = [
  { name: 'Rialto Bridge', distance: '17 min walk' },
  { name: 'St. Mark\'s Square', distance: '20 min walk' },
  { name: 'Teatro La Fenice', distance: '15 min walk' },
  { name: 'Doge\'s Palace', distance: '22 min walk' },
];

// Section component with scroll animation
const AnimatedSection = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.section>
  );
};

export default function Home() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <div className="min-h-screen bg-white">
      <SiteNav />

      {/* Hero Section */}
      <section ref={heroRef} className="relative h-screen overflow-hidden">
        {/* Background Image with Parallax */}
        <motion.div
          style={{ scale: heroScale, y: heroY }}
          className="absolute inset-0"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60 z-10" />
          <Image
            src="https://images.unsplash.com/photo-1514890547357-a9ee288728e0?q=80&w=2940&auto=format&fit=crop"
            alt="Venice Canal View"
            fill
            className="object-cover"
            priority
          />
        </motion.div>

        {/* Hero Content */}
        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative z-20 h-full flex flex-col justify-center items-center text-center px-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="mb-6"
          >
            <span className="inline-block px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium tracking-wider uppercase">
              Luxury Apartment in Venice
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7 }}
            className="text-5xl md:text-7xl lg:text-8xl font-light text-white mb-6 tracking-tight"
          >
            Ca' All'Arco
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.9 }}
            className="text-xl md:text-2xl text-white/80 font-light max-w-2xl mb-8"
          >
            An exquisite canal-view apartment in the heart of Castello, Venice
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.1 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link
              href="/book"
              className="px-8 py-4 bg-[#C4A572] text-white font-medium rounded-full hover:bg-[#B39562] transition-all duration-300 hover:shadow-2xl hover:shadow-[#C4A572]/30 flex items-center gap-2 group"
            >
              Check Availability
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-medium rounded-full hover:bg-white/20 transition-all duration-300 border border-white/20 flex items-center gap-2">
              <Play className="w-4 h-4" />
              Virtual Tour
            </button>
          </motion.div>

          {/* Rating Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.5 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full"
          >
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-[#C4A572] text-[#C4A572]" />
              ))}
            </div>
            <span className="text-white font-semibold">9.8</span>
            <span className="text-white/70">Exceptional · 59 reviews</span>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center"
          >
            <motion.div className="w-1 h-2 bg-white/60 rounded-full mt-2" />
          </motion.div>
        </motion.div>
      </section>

      {/* About Section */}
      <AnimatedSection className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Content */}
            <motion.div variants={fadeInUp}>
              <span className="text-[#C4A572] font-medium tracking-wider uppercase text-sm">The Apartment</span>
              <h2 className="text-4xl lg:text-5xl font-light text-gray-900 mt-4 mb-6 leading-tight">
                Your Private Sanctuary in Venice
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                Nestled in the historic Castello district, Ca' All'Arco offers an authentic Venetian experience
                with modern luxury. This beautifully appointed 70m² apartment combines traditional Venetian
                architecture with contemporary design, creating the perfect retreat after a day exploring the city.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed mb-8">
                Wake up to enchanting canal views, enjoy your morning espresso on the terrace, and experience
                Venice like a true local. Just a 17-minute walk from the iconic Rialto Bridge, you're perfectly
                positioned to discover all that Venice has to offer.
              </p>

              {/* Highlights */}
              <div className="grid grid-cols-4 gap-4">
                {highlights.map(({ icon: Icon, value, unit, label }) => (
                  <div key={label} className="text-center p-4 bg-gray-50 rounded-2xl">
                    <Icon className="w-5 h-5 text-[#C4A572] mx-auto mb-2" />
                    <div className="text-2xl font-semibold text-gray-900">
                      {value}<span className="text-sm">{unit}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Image Grid */}
            <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="relative h-64 rounded-2xl overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=2000&auto=format&fit=crop"
                    alt="Living Room"
                    fill
                    className="object-cover hover:scale-110 transition-transform duration-700"
                  />
                </div>
                <div className="relative h-48 rounded-2xl overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2000&auto=format&fit=crop"
                    alt="Kitchen"
                    fill
                    className="object-cover hover:scale-110 transition-transform duration-700"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="relative h-48 rounded-2xl overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1540518614846-7eded433c457?q=80&w=2000&auto=format&fit=crop"
                    alt="Bedroom"
                    fill
                    className="object-cover hover:scale-110 transition-transform duration-700"
                  />
                </div>
                <div className="relative h-64 rounded-2xl overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?q=80&w=2000&auto=format&fit=crop"
                    alt="Venice View"
                    fill
                    className="object-cover hover:scale-110 transition-transform duration-700"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* Amenities Section */}
      <AnimatedSection className="py-24 lg:py-32 bg-gray-50" id="features">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div variants={fadeInUp} className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#C4A572] font-medium tracking-wider uppercase text-sm">Amenities</span>
            <h2 className="text-4xl lg:text-5xl font-light text-gray-900 mt-4 mb-6">
              Everything You Need
            </h2>
            <p className="text-lg text-gray-600">
              Thoughtfully curated amenities for an exceptional stay
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {amenities.map(({ icon: Icon, label, description }) => (
              <motion.div
                key={label}
                variants={fadeInUp}
                className="bg-white p-6 rounded-2xl hover:shadow-xl transition-all duration-500 group cursor-pointer border border-gray-100"
              >
                <div className="w-12 h-12 bg-[#C4A572]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#C4A572] transition-colors duration-300">
                  <Icon className="w-6 h-6 text-[#C4A572] group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{label}</h3>
                <p className="text-sm text-gray-500">{description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Gallery Section */}
      <AnimatedSection className="py-24 lg:py-32" id="gallery">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div variants={fadeInUp} className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#C4A572] font-medium tracking-wider uppercase text-sm">Gallery</span>
            <h2 className="text-4xl lg:text-5xl font-light text-gray-900 mt-4 mb-6">
              A Visual Journey
            </h2>
          </motion.div>

          <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?q=80&w=2000',
              'https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?q=80&w=2000',
              'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?q=80&w=2000',
              'https://images.unsplash.com/photo-1518560299355-d7c6bb1e6d48?q=80&w=2000',
              'https://images.unsplash.com/photo-1549918864-48ac978761a4?q=80&w=2000',
              'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=2000',
              'https://images.unsplash.com/photo-1498307833015-e7b400441eb8?q=80&w=2000',
              'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2000',
            ].map((src, i) => (
              <div
                key={i}
                className={`relative overflow-hidden rounded-2xl ${
                  i === 0 || i === 5 ? 'md:col-span-2 md:row-span-2 h-64 md:h-full' : 'h-48'
                }`}
              >
                <Image
                  src={src}
                  alt={`Gallery image ${i + 1}`}
                  fill
                  className="object-cover hover:scale-110 transition-transform duration-700 cursor-pointer"
                />
              </div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Location Section */}
      <AnimatedSection className="py-24 lg:py-32 bg-gray-900 text-white" id="location">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div variants={fadeInUp}>
              <span className="text-[#C4A572] font-medium tracking-wider uppercase text-sm">Location</span>
              <h2 className="text-4xl lg:text-5xl font-light mt-4 mb-6">
                In the Heart of Venice
              </h2>
              <p className="text-lg text-gray-400 leading-relaxed mb-8">
                Located in the prestigious Castello district, Ca' All'Arco offers the perfect base for
                exploring Venice. Away from the tourist crowds yet minutes from major attractions,
                you'll experience the authentic side of this magical city.
              </p>

              <div className="space-y-4 mb-8">
                {nearbyAttractions.map(({ name, distance }) => (
                  <div key={name} className="flex items-center justify-between py-3 border-b border-gray-800">
                    <span className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-[#C4A572]" />
                      {name}
                    </span>
                    <span className="text-gray-500">{distance}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  <span>Castello 2739/A</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Venice, Italy</span>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="relative h-[500px] rounded-2xl overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?q=80&w=2000&auto=format&fit=crop"
                alt="Venice Map Area"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <a
                  href="https://maps.google.com/?q=Castello+2739/A+Venice+Italy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-4 bg-white text-gray-900 font-medium rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <MapPin className="w-5 h-5" />
                  View on Google Maps
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* Reviews Section */}
      <AnimatedSection className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div variants={fadeInUp} className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#C4A572] font-medium tracking-wider uppercase text-sm">Reviews</span>
            <h2 className="text-4xl lg:text-5xl font-light text-gray-900 mt-4 mb-6">
              What Our Guests Say
            </h2>
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-[#C4A572] text-[#C4A572]" />
                ))}
              </div>
              <span className="text-2xl font-semibold text-gray-900">9.8</span>
              <span className="text-gray-500">from 59 reviews</span>
            </div>
          </motion.div>

          <motion.div variants={staggerContainer} className="grid md:grid-cols-3 gap-8">
            {reviews.map((review, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="bg-gray-50 p-8 rounded-2xl relative"
              >
                <Quote className="w-10 h-10 text-[#C4A572]/20 absolute top-6 right-6" />
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(review.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-[#C4A572] text-[#C4A572]" />
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed mb-6">"{review.text}"</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{review.name}</p>
                    <p className="text-sm text-gray-500">{review.location}</p>
                  </div>
                  <span className="text-xs text-gray-400">{review.date}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* CTA Section */}
      <AnimatedSection className="py-24 lg:py-32 bg-[#C4A572]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div variants={fadeInUp}>
            <h2 className="text-4xl lg:text-5xl font-light text-white mb-6">
              Ready to Experience Venice?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Book directly for the best rates and a complimentary welcome basket with local Venetian treats.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/book"
                className="px-8 py-4 bg-white text-gray-900 font-semibold rounded-full hover:bg-gray-100 transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                Book Your Stay
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="mailto:support@allarcoapartment.com"
                className="px-8 py-4 bg-transparent text-white font-medium rounded-full border-2 border-white/30 hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Contact Us
              </a>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
