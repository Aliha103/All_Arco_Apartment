'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Facebook, Instagram, Mail, Heart } from 'lucide-react';

const FOOTER_LINKS = {
  Explore: [
    { label: 'About', href: '/#about' },
    { label: 'Features', href: '/#features' },
    { label: 'Gallery', href: '/' },
  ],
  Support: [
    { label: 'Contact', href: '/#contact' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Help', href: '/help' },
  ],
  Legal: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Cookies', href: '/cookies' },
  ],
  Connect: [
    { label: 'Facebook', href: '#' },
    { label: 'Instagram', href: '#' },
    { label: 'Email', href: 'mailto:info@allarcoapartment.com' },
  ],
};

const SOCIAL_LINKS = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Mail, href: 'mailto:info@allarcoapartment.com', label: 'Email' },
];

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-100 mt-auto">
      <div className="w-full px-6 md:px-8 lg:px-12 xl:px-16 py-12">
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12">
          {/* Brand */}
          <div className="text-center lg:text-left">
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="inline-block"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-white font-bold text-3xl mx-auto lg:mx-0 mb-4">
                AA
              </div>
            </motion.div>
            <p className="text-sm text-gray-500 leading-relaxed max-w-[300px] mx-auto lg:mx-0">
              Authentic Venetian hospitality in the heart of Italy&apos;s most romantic city
            </p>
          </div>

          {/* Navigation Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center lg:text-left">
            {Object.entries(FOOTER_LINKS).map(([title, links]) => (
              <div key={title}>
                <h5 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-4">
                  {title}
                </h5>
                <div className="space-y-2">
                  {links.map((link, i) => (
                    <Link
                      key={i}
                      href={link.href}
                      className="block text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 mt-8 border-t border-gray-100">
          {/* Social Icons */}
          <div className="flex gap-3">
            {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
              <motion.a
                key={label}
                href={href}
                aria-label={label}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-900 hover:text-white transition-all duration-200"
                whileHover={{ y: -2 }}
              >
                <Icon className="w-4 h-4" />
              </motion.a>
            ))}
          </div>

          {/* Copyright */}
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-sm text-gray-400">
            <span>© {currentYear} All&apos;Arco Apartment</span>
            <span className="flex items-center gap-1">
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Heart className="w-3 h-3 text-red-500 fill-red-500" />
              </motion.span>
              Made in Venice
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
