'use client';

import { useMemo } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Navigation,
  Train,
  Plane,
  Bus,
  Clock,
  ArrowUpRight,
  Sparkles,
  Home,
  TreePine,
} from 'lucide-react';

// ============================================================================
// DYNAMIC MAP IMPORT (SSR disabled for Leaflet)
// ============================================================================
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gradient-to-br from-[#F9F6F1] to-[#EDE8E0] animate-pulse flex items-center justify-center">
      <MapPin className="w-8 h-8 text-[#C4A572]/40" />
    </div>
  ),
});

// ============================================================================
// DATA
// ============================================================================
const PROPERTY_LOCATION = {
  lat: 45.4975,
  lng: 12.2435,
  address: 'Via Castellana 61',
  city: 'Venice',
  country: 'Italy',
  postalCode: '30174',
  district: 'Carpenedo',
};

const TRANSPORT_OPTIONS = [
  { id: '1', name: 'Bus Stop', detail: 'Via Castellana', time: '2 min', icon: Bus, color: 'bg-amber-500' },
  { id: '2', name: 'Mestre Station', detail: 'Train connections', time: '15 min', icon: Train, color: 'bg-emerald-500' },
  { id: '3', name: 'Marco Polo', detail: 'Airport', time: '20 min', icon: Plane, color: 'bg-blue-500' },
];

const HIGHLIGHTS = [
  { id: '1', title: 'Venice Center', time: '35 min by bus', featured: true },
  { id: '2', title: "St. Mark's Square", time: '45 min', featured: true },
  { id: '3', title: 'Rialto Bridge', time: '40 min', featured: true },
  { id: '4', title: 'Local Restaurants', time: '3 min walk', featured: false },
  { id: '5', title: 'Supermarket', time: '5 min walk', featured: false },
  { id: '6', title: 'Park Bissuola', time: '10 min walk', featured: false },
];

const FEATURES = [
  { icon: Sparkles, title: 'Peaceful', desc: 'Quiet residential area' },
  { icon: Home, title: 'Authentic', desc: 'Local Italian atmosphere' },
  { icon: TreePine, title: 'Green', desc: 'Parks & gardens nearby' },
];

// ============================================================================
// ANIMATION CONFIG
// ============================================================================
const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut" as const }
  },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function LocationSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' });

  const googleMapsUrl = useMemo(() => {
    const query = encodeURIComponent(`${PROPERTY_LOCATION.address}, ${PROPERTY_LOCATION.postalCode} ${PROPERTY_LOCATION.city}, ${PROPERTY_LOCATION.country}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-20 sm:py-28 lg:py-32 bg-[#F9F6F1]"
      id="location"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.span
            variants={fadeIn}
            className="inline-block px-4 py-1.5 bg-[#C4A572]/10 text-[#C4A572] text-xs font-semibold tracking-wider uppercase rounded-full mb-4"
          >
            Location
          </motion.span>
          <motion.h2
            variants={fadeIn}
            className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 mb-4"
          >
            Your Gateway to Venice
          </motion.h2>
          <motion.p variants={fadeIn} className="text-gray-500 max-w-xl mx-auto text-base sm:text-lg">
            Perfectly positioned in peaceful Carpenedo with easy access to all Venice attractions
          </motion.p>
        </motion.div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-10">

          {/* Map - Takes 3 columns */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="lg:col-span-3 relative"
          >
            <div className="relative h-[400px] sm:h-[450px] lg:h-[500px] rounded-3xl overflow-hidden shadow-2xl shadow-black/10">
              <MapComponent
                lat={PROPERTY_LOCATION.lat}
                lng={PROPERTY_LOCATION.lng}
                onLoad={() => {}}
              />

              {/* Floating Address Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
                className="absolute bottom-6 left-6 right-6"
              >
                <div className="bg-white rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C4A572] to-[#A8895C] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#C4A572]/20">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-lg">{PROPERTY_LOCATION.address}</p>
                      <p className="text-gray-500 text-sm">
                        {PROPERTY_LOCATION.postalCode} {PROPERTY_LOCATION.district}, {PROPERTY_LOCATION.city}
                      </p>
                    </div>
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 rounded-xl bg-gray-900 text-white flex items-center justify-center
                                 hover:bg-gray-800 transition-all duration-300 hover:scale-105 flex-shrink-0"
                      aria-label="Open in Google Maps"
                    >
                      <ArrowUpRight className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Info Panel - Takes 2 columns */}
          <motion.div
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={stagger}
            className="lg:col-span-2 space-y-6"
          >
            {/* Transport Options */}
            <motion.div variants={fadeIn} className="bg-white rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#C4A572]/10 flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-[#C4A572]" />
                </div>
                <h3 className="font-semibold text-gray-900 text-lg">Getting Here</h3>
              </div>

              <div className="space-y-3">
                {TRANSPORT_OPTIONS.map((transport, i) => (
                  <motion.div
                    key={transport.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.4 + i * 0.1, duration: 0.4, ease: "easeOut" }}
                    className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-300"
                  >
                    <div className={`w-10 h-10 rounded-lg ${transport.color} flex items-center justify-center`}>
                      <transport.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{transport.name}</p>
                      <p className="text-xs text-gray-500">{transport.detail}</p>
                    </div>
                    <span className="text-sm font-semibold text-[#C4A572]">{transport.time}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Distances */}
            <motion.div variants={fadeIn} className="bg-white rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#C4A572]/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#C4A572]" />
                </div>
                <h3 className="font-semibold text-gray-900 text-lg">Distances</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {HIGHLIGHTS.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.5 + i * 0.05, duration: 0.4, ease: "easeOut" }}
                    className={`p-3 rounded-xl transition-all duration-300 ${
                      item.featured
                        ? 'bg-gradient-to-br from-[#C4A572]/10 to-[#C4A572]/5 border border-[#C4A572]/20'
                        : 'bg-gray-50'
                    }`}
                  >
                    <p className={`font-medium text-sm ${item.featured ? 'text-[#8B7355]' : 'text-gray-900'}`}>
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.time}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Neighborhood Features */}
            <motion.div variants={fadeIn} className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white">
              <h3 className="font-semibold text-lg mb-4">The Neighborhood</h3>
              <div className="grid grid-cols-3 gap-4">
                {FEATURES.map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: 0.7 + i * 0.1, duration: 0.4, ease: "easeOut" }}
                    className="text-center"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-2">
                      <feature.icon className="w-5 h-5 text-[#C4A572]" />
                    </div>
                    <p className="font-medium text-sm">{feature.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* CTA Button */}
            <motion.a
              variants={fadeIn}
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full py-4 bg-[#C4A572] text-white font-medium rounded-2xl
                         hover:bg-[#B39562] transition-all duration-300 hover:shadow-lg hover:shadow-[#C4A572]/25
                         focus:outline-none focus:ring-2 focus:ring-[#C4A572] focus:ring-offset-2"
            >
              <MapPin className="w-5 h-5" />
              View on Google Maps
              <ArrowUpRight className="w-4 h-4" />
            </motion.a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
