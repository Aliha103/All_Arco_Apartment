'use client';

import { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Navigation,
  Clock,
  Train,
  Ship,
  Plane,
  Coffee,
  ShoppingBag,
  Utensils,
  Camera,
  ChevronRight,
  ExternalLink,
  Footprints,
  Building2,
  Star,
} from 'lucide-react';

// ============================================================================
// DYNAMIC MAP IMPORT (SSR disabled for Leaflet)
// ============================================================================
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
      <MapPin className="w-8 h-8 text-gray-300" />
    </div>
  ),
});

// ============================================================================
// TYPES
// ============================================================================
interface Attraction {
  id: string;
  name: string;
  walkTime: number;
  distance: string;
  category: 'landmark' | 'culture' | 'dining' | 'shopping' | 'transport';
  icon: React.ElementType;
  highlight?: boolean;
}

interface TransportOption {
  id: string;
  name: string;
  type: 'water' | 'train' | 'air';
  time: string;
  icon: React.ElementType;
}

interface NeighborhoodHighlight {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

// ============================================================================
// DATA
// ============================================================================
const PROPERTY_LOCATION = {
  lat: 45.4371,
  lng: 12.3476,
  address: 'Castello 2739/A',
  city: 'Venice',
  country: 'Italy',
  postalCode: '30122',
  district: 'Castello',
};

const ATTRACTIONS: Attraction[] = [
  { id: '1', name: 'Rialto Bridge', walkTime: 17, distance: '1.3 km', category: 'landmark', icon: Camera, highlight: true },
  { id: '2', name: "St. Mark's Square", walkTime: 20, distance: '1.5 km', category: 'landmark', icon: Camera, highlight: true },
  { id: '3', name: 'Teatro La Fenice', walkTime: 15, distance: '1.1 km', category: 'culture', icon: Building2 },
  { id: '4', name: "Doge's Palace", walkTime: 22, distance: '1.7 km', category: 'landmark', icon: Camera, highlight: true },
  { id: '5', name: 'Peggy Guggenheim', walkTime: 25, distance: '1.9 km', category: 'culture', icon: Building2 },
  { id: '6', name: 'Local Restaurants', walkTime: 3, distance: '200 m', category: 'dining', icon: Utensils },
  { id: '7', name: 'Artisan Shops', walkTime: 5, distance: '350 m', category: 'shopping', icon: ShoppingBag },
  { id: '8', name: 'Traditional Cafes', walkTime: 4, distance: '250 m', category: 'dining', icon: Coffee },
];

const TRANSPORT_OPTIONS: TransportOption[] = [
  { id: '1', name: 'Vaporetto Stop (Arsenale)', type: 'water', time: '5 min walk', icon: Ship },
  { id: '2', name: 'Santa Lucia Train Station', type: 'train', time: '35 min', icon: Train },
  { id: '3', name: 'Marco Polo Airport', type: 'air', time: '45 min', icon: Plane },
];

const NEIGHBORHOOD_HIGHLIGHTS: NeighborhoodHighlight[] = [
  {
    id: '1',
    title: 'Authentic Venice',
    description: 'Experience the real Venice away from tourist crowds in the historic Castello district.',
    icon: Star,
  },
  {
    id: '2',
    title: 'Local Life',
    description: 'Surrounded by neighborhood trattorias, artisan workshops, and hidden squares.',
    icon: Coffee,
  },
  {
    id: '3',
    title: 'Easy Access',
    description: 'Central location with water bus stops nearby for exploring all of Venice.',
    icon: Navigation,
  },
];

// ============================================================================
// ANIMATION CONFIG
// ============================================================================
const springConfig = { type: 'spring', stiffness: 400, damping: 30 } as const;

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: springConfig },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

// ============================================================================
// COMPONENTS
// ============================================================================

// Attraction Card - memoized
const AttractionCard = memo(function AttractionCard({
  attraction,
  index,
}: {
  attraction: Attraction;
  index: number;
}) {
  const Icon = attraction.icon;

  return (
    <motion.div
      variants={fadeInUp}
      className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200
                  ${attraction.highlight
                    ? 'bg-[#C4A572]/10 border border-[#C4A572]/20'
                    : 'bg-gray-50 hover:bg-gray-100'
                  }`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                      ${attraction.highlight ? 'bg-[#C4A572] text-white' : 'bg-white text-gray-600'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm truncate">{attraction.name}</p>
        <p className="text-xs text-gray-500">{attraction.distance}</p>
      </div>
      <div className="flex items-center gap-1 text-gray-500 flex-shrink-0">
        <Footprints className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{attraction.walkTime} min</span>
      </div>
    </motion.div>
  );
});

// Transport Card - memoized
const TransportCard = memo(function TransportCard({
  transport,
}: {
  transport: TransportOption;
}) {
  const Icon = transport.icon;

  const bgColor = useMemo(() => {
    switch (transport.type) {
      case 'water': return 'bg-blue-50 text-blue-600';
      case 'train': return 'bg-emerald-50 text-emerald-600';
      case 'air': return 'bg-purple-50 text-purple-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  }, [transport.type]);

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bgColor}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm truncate">{transport.name}</p>
        <p className="text-xs text-gray-500">{transport.time}</p>
      </div>
    </div>
  );
});

// Neighborhood Highlight Card
const HighlightCard = memo(function HighlightCard({
  highlight,
}: {
  highlight: NeighborhoodHighlight;
}) {
  const Icon = highlight.icon;

  return (
    <motion.div variants={fadeInUp} className="flex gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#C4A572]/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-[#C4A572]" />
      </div>
      <div>
        <h4 className="font-semibold text-gray-900 text-sm">{highlight.title}</h4>
        <p className="text-sm text-gray-500 leading-relaxed">{highlight.description}</p>
      </div>
    </motion.div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function LocationSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Filter attractions by category
  const filteredAttractions = useMemo(() => {
    if (!selectedCategory) return ATTRACTIONS.slice(0, 6);
    return ATTRACTIONS.filter(a => a.category === selectedCategory);
  }, [selectedCategory]);

  // Category filters
  const categories = useMemo(() => [
    { id: null, label: 'All' },
    { id: 'landmark', label: 'Landmarks' },
    { id: 'culture', label: 'Culture' },
    { id: 'dining', label: 'Dining' },
  ], []);

  // Google Maps URL
  const googleMapsUrl = useMemo(() => {
    const query = encodeURIComponent(`${PROPERTY_LOCATION.address}, ${PROPERTY_LOCATION.city}, ${PROPERTY_LOCATION.country}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-16 sm:py-20 lg:py-28 bg-gradient-to-b from-gray-900 to-gray-950 text-white overflow-hidden"
      id="location"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="mb-12 lg:mb-16"
        >
          <motion.span
            variants={fadeInUp}
            className="text-[#C4A572] font-medium tracking-wider uppercase text-xs sm:text-sm"
          >
            Location
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl sm:text-4xl lg:text-5xl font-light mt-3 mb-4"
          >
            In the Heart of Venice
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-base sm:text-lg text-gray-400 max-w-2xl">
            Nestled in the prestigious Castello district, experience authentic Venetian life
            while being minutes from the city&apos;s most celebrated landmarks.
          </motion.p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column - Map & Address */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ ...springConfig, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Interactive Map */}
            <div className="relative h-[300px] sm:h-[350px] lg:h-[400px] rounded-2xl overflow-hidden border border-white/10">
              <MapComponent
                lat={PROPERTY_LOCATION.lat}
                lng={PROPERTY_LOCATION.lng}
                onLoad={() => setMapLoaded(true)}
              />

              {/* Map Overlay - Address Card */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#C4A572] flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{PROPERTY_LOCATION.address}</p>
                      <p className="text-sm text-gray-500">
                        {PROPERTY_LOCATION.district}, {PROPERTY_LOCATION.city} {PROPERTY_LOCATION.postalCode}
                      </p>
                    </div>
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-2 bg-gray-900 text-white text-xs font-medium
                                 rounded-lg hover:bg-gray-800 transition-colors flex-shrink-0"
                    >
                      Directions
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Transportation */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[#C4A572]" />
                Getting Here
              </h3>
              <div className="grid gap-2">
                {TRANSPORT_OPTIONS.map((transport) => (
                  <TransportCard key={transport.id} transport={transport} />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Column - Attractions & Neighborhood */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ ...springConfig, delay: 0.3 }}
            className="space-y-8"
          >
            {/* Nearby Attractions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#C4A572]" />
                  Nearby Attractions
                </h3>
              </div>

              {/* Category Filters */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    key={cat.id ?? 'all'}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all
                               ${selectedCategory === cat.id
                                 ? 'bg-[#C4A572] text-white'
                                 : 'bg-white/10 text-gray-300 hover:bg-white/20'
                               }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Attractions Grid */}
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid gap-2"
              >
                {filteredAttractions.map((attraction, index) => (
                  <AttractionCard key={attraction.id} attraction={attraction} index={index} />
                ))}
              </motion.div>
            </div>

            {/* Neighborhood Highlights */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-[#C4A572]" />
                The Neighborhood
              </h3>
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
                className="space-y-4"
              >
                {NEIGHBORHOOD_HIGHLIGHTS.map((highlight) => (
                  <HighlightCard key={highlight.id} highlight={highlight} />
                ))}
              </motion.div>
            </div>

            {/* CTA */}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 bg-white text-gray-900
                         font-medium rounded-xl hover:bg-gray-100 transition-colors
                         focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              <MapPin className="w-5 h-5" />
              View on Google Maps
              <ChevronRight className="w-4 h-4" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
