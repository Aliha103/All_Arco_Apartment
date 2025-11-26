'use client';

import { Heart, Mail } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const SiteFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#1a1a1a]">
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-6">
        {/* Main Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Location */}
          <div className="flex items-center gap-4">
            <Image
              src="/allarco-logo.png"
              alt="All'Arco Apartment"
              width={100}
              height={38}
              className="object-contain"
            />
            <span className="text-gray-500 text-sm hidden sm:inline">|</span>
            <span className="text-gray-500 text-sm hidden sm:inline">Venice, Italy</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm">
            <Link href="/#about" className="text-gray-400 hover:text-[#C4A572] transition-colors">
              Apartment
            </Link>
            <Link href="/#features" className="text-gray-400 hover:text-[#C4A572] transition-colors">
              Amenities
            </Link>
            <Link href="/#gallery" className="text-gray-400 hover:text-[#C4A572] transition-colors">
              Gallery
            </Link>
            <Link href="/#location" className="text-gray-400 hover:text-[#C4A572] transition-colors">
              Location
            </Link>
            <Link href="/book" className="text-[#C4A572] hover:text-[#D4B582] font-medium transition-colors">
              Book Now
            </Link>
          </nav>

          {/* Email Contact */}
          <a
            href="mailto:support@allarcoapartment.com"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#C4A572] transition-colors"
          >
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">support@allarcoapartment.com</span>
            <span className="sm:hidden">Contact</span>
          </a>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 mt-5 pt-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Policy Links */}
            <nav className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm">
              <Link href="/privacy-policy" className="text-gray-500 hover:text-[#C4A572] transition-colors">
                Privacy Policy
              </Link>
              <span className="text-gray-700">·</span>
              <Link href="/terms-of-service" className="text-gray-500 hover:text-[#C4A572] transition-colors">
                Terms of Service
              </Link>
              <span className="text-gray-700">·</span>
              <Link href="/cancellation-policy" className="text-gray-500 hover:text-[#C4A572] transition-colors">
                Cancellation Policy
              </Link>
              <span className="text-gray-700">·</span>
              <Link href="/cookie-policy" className="text-gray-500 hover:text-[#C4A572] transition-colors">
                Cookie Policy
              </Link>
            </nav>

            {/* Copyright & Made in Venice */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
              <span>&copy; {currentYear} All&apos;Arco Apartment</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:flex items-center gap-1">
                Made with <Heart className="w-3 h-3 text-[#C4A572] fill-[#C4A572]" /> in Venice
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
