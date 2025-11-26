'use client';

import { Heart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const SiteFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#1a1a1a]">
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-6">
        {/* Single Row Layout */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Copyright */}
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

          {/* Made in Venice */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <span>&copy; {currentYear}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:flex items-center gap-1">
              Made with <Heart className="w-3 h-3 text-[#C4A572] fill-[#C4A572]" /> in Venice
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
