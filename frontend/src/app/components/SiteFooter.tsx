'use client';

import { motion } from 'framer-motion';
import { Heart, Mail, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { SOCIAL_LINKS } from '@/app/components/siteData';

const SiteFooter = () => {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { label: 'The Apartment', href: '/#about' },
    { label: 'Amenities', href: '/#features' },
    { label: 'Gallery', href: '/#gallery' },
    { label: 'Location', href: '/#location' },
  ];

  const legalLinks = [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Cancellation Policy', href: '/cancellation' },
  ];

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 lg:gap-8">
          {/* Brand */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <Image
              src="/allarco-logo.png"
              alt="All'Arco Apartment"
              width={120}
              height={45}
              className="object-contain"
            />
            <div className="hidden sm:block w-px h-8 bg-gray-700" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Venice, Italy
              </span>
              <span className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                support@allarcoapartment.com
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            {quickLinks.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-gray-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A572] rounded"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/book"
              className="text-[#C4A572] hover:text-[#D4B582] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A572] rounded"
            >
              Book Now
            </Link>
          </nav>

          {/* Social Links */}
          <div className="flex items-center gap-2">
            {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
              <motion.a
                key={label}
                href={href}
                aria-label={label}
                className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800 text-gray-400 hover:bg-[#C4A572] hover:text-white transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A572]"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="w-4 h-4" />
              </motion.a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <span>&copy; {currentYear} All&apos;Arco Apartment</span>
              {legalLinks.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="hover:text-gray-300 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
            <span className="flex items-center gap-1.5">
              Made with
              <motion.span
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Heart className="w-3 h-3 text-red-500 fill-red-500" />
              </motion.span>
              in Venice
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
