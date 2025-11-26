'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import {
  Calendar,
  ChevronDown,
  LogIn,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  User,
  UserPlus,
  X,
} from 'lucide-react';

// Navigation structure for hospitality
const navLinks = [
  { href: '/#about', label: 'The Apartment' },
  { href: '/#features', label: 'Amenities' },
  { href: '/#gallery', label: 'Gallery' },
  { href: '/#location', label: 'Venice' },
];

const SiteNav = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const { user, isAuthenticated, logout } = useAuthStore();

  // Framer Motion scroll tracking
  const { scrollY } = useScroll();

  // Quantum scroll logic - hide on scroll down, show on scroll up
  useMotionValueEvent(scrollY, 'change', (latest) => {
    const previous = lastScrollY.current;

    // Determine scroll direction and visibility
    if (latest > 100) {
      setIsScrolled(true);
      // Hide navbar when scrolling down, show when scrolling up
      if (latest > previous && latest > 200) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    } else {
      setIsScrolled(false);
      setIsVisible(true);
    }

    lastScrollY.current = latest;
  });

  // Close handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  // Dynamic styles based on scroll state
  const headerClasses = `
    fixed top-0 left-0 right-0 z-50
    transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
    ${isScrolled
      ? 'bg-white/95 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.08)] border-b border-gray-100/50'
      : 'bg-transparent'
    }
    ${isVisible ? 'translate-y-0' : '-translate-y-full'}
  `;

  const textClasses = isScrolled ? 'text-gray-800' : 'text-white';
  const textHoverClasses = isScrolled ? 'hover:text-gray-900' : 'hover:text-white/80';
  const logoFilter = isScrolled ? '' : 'brightness-0 invert';

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={headerClasses}
    >
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="flex items-center justify-between h-20 lg:h-24">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 focus:outline-none group">
            <Image
              src="/allarco-logo.png"
              alt="All'Arco Apartment"
              width={160}
              height={60}
              className={`object-contain transition-all duration-500 ${logoFilter}`}
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`
                  relative px-4 py-2 text-sm font-medium tracking-wide
                  transition-all duration-300 rounded-full
                  ${textClasses} ${textHoverClasses}
                  hover:bg-white/10
                  focus:outline-none focus:ring-2 focus:ring-[#C4A572]/50
                  group
                `}
              >
                {label}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-[#C4A572] transition-all duration-300 group-hover:w-1/2" />
              </Link>
            ))}
          </nav>

          {/* Right Section - CTA & Account */}
          <div className="hidden lg:flex items-center gap-4">
            {/* Book Now CTA */}
            <Link
              href="/book"
              className="
                px-6 py-2.5 text-sm font-semibold tracking-wide
                bg-[#C4A572] text-white rounded-full
                hover:bg-[#B39562] hover:shadow-lg hover:shadow-[#C4A572]/25
                transition-all duration-300 ease-out
                focus:outline-none focus:ring-2 focus:ring-[#C4A572] focus:ring-offset-2
              "
            >
              Book Now
            </Link>

            {/* Account Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-full
                  transition-all duration-300
                  ${isScrolled
                    ? 'text-gray-700 hover:bg-gray-100'
                    : 'text-white/90 hover:bg-white/10'
                  }
                  focus:outline-none focus:ring-2 focus:ring-[#C4A572]/50
                `}
                aria-label="Account menu"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  ${isScrolled ? 'bg-gray-100' : 'bg-white/20'}
                  transition-colors duration-300
                `}>
                  <User className="w-4 h-4" />
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden z-50 border border-gray-100"
                    role="menu"
                  >
                    {/* User Info Header */}
                    {isAuthenticated && (
                      <div className="px-5 py-4 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100">
                        <p className="font-semibold text-gray-900">{user?.first_name} {user?.last_name}</p>
                        <p className="text-sm text-gray-500">{user?.email}</p>
                      </div>
                    )}

                    <div className="py-2">
                      {isAuthenticated ? (
                        <>
                          <Link href="/dashboard" className="flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem" onClick={() => setDropdownOpen(false)}>
                            <User className="w-4 h-4 text-gray-400" />
                            <span>Dashboard</span>
                          </Link>
                          <Link href="/bookings" className="flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem" onClick={() => setDropdownOpen(false)}>
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>My Reservations</span>
                          </Link>
                          <Link href="/profile" className="flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem" onClick={() => setDropdownOpen(false)}>
                            <Settings className="w-4 h-4 text-gray-400" />
                            <span>Settings</span>
                          </Link>
                          {(user?.role === 'admin' || user?.role === 'super_admin') && (
                            <Link href="/admin" className="flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem" onClick={() => setDropdownOpen(false)}>
                              <Sparkles className="w-4 h-4 text-[#C4A572]" />
                              <span>Admin Panel</span>
                            </Link>
                          )}
                          <div className="my-1 mx-4 border-t border-gray-100" />
                          <button
                            onClick={() => { logout(); setDropdownOpen(false); }}
                            className="flex items-center gap-3 px-5 py-3 text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                            role="menuitem"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="px-5 py-3 border-b border-gray-100">
                            <p className="text-sm text-gray-500">Welcome to All&apos;Arco</p>
                          </div>
                          <Link href="/auth/login" className="flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem" onClick={() => setDropdownOpen(false)}>
                            <LogIn className="w-4 h-4 text-gray-400" />
                            <span>Sign In</span>
                          </Link>
                          <Link href="/auth/register" className="flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem" onClick={() => setDropdownOpen(false)}>
                            <UserPlus className="w-4 h-4 text-gray-400" />
                            <span>Create Account</span>
                          </Link>
                          <div className="p-4 bg-gradient-to-br from-[#C4A572]/10 to-transparent">
                            <p className="text-xs text-gray-600 mb-2">Already have a reservation?</p>
                            <Link
                              href="/bookings/find"
                              className="block text-center py-2 bg-[#C4A572] text-white text-sm font-medium rounded-lg hover:bg-[#B39562] transition-colors"
                              onClick={() => setDropdownOpen(false)}
                            >
                              Find Booking
                            </Link>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`
              lg:hidden p-2.5 rounded-xl
              transition-all duration-300
              focus:outline-none focus:ring-2 focus:ring-[#C4A572]/50
              ${isScrolled
                ? 'text-gray-700 hover:bg-gray-100'
                : 'text-white hover:bg-white/10'
              }
            `}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 lg:hidden overflow-y-auto"
              role="dialog"
              aria-label="Mobile navigation"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <Image
                  src="/allarco-logo.png"
                  alt="All'Arco Apartment"
                  width={120}
                  height={45}
                  className="object-contain"
                />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="p-6">
                <nav className="space-y-1">
                  {navLinks.map(({ href, label }, index) => (
                    <motion.div
                      key={href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link
                        href={href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center px-4 py-4 text-lg font-medium text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
                      >
                        {label}
                      </Link>
                    </motion.div>
                  ))}
                </nav>

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-8"
                >
                  <Link
                    href="/book"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center w-full py-4 bg-[#C4A572] text-white font-semibold rounded-xl hover:bg-[#B39562] transition-colors"
                  >
                    Book Your Stay
                  </Link>
                </motion.div>

                {/* Account Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-8 pt-8 border-t border-gray-100"
                >
                  <p className="text-sm font-medium text-gray-500 mb-4">Account</p>
                  <div className="space-y-1">
                    {isAuthenticated ? (
                      <>
                        <Link
                          href="/dashboard"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                        >
                          <User className="w-5 h-5 text-gray-400" />
                          Dashboard
                        </Link>
                        <Link
                          href="/bookings"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                        >
                          <Calendar className="w-5 h-5 text-gray-400" />
                          My Reservations
                        </Link>
                        <button
                          onClick={() => { logout(); setMobileMenuOpen(false); }}
                          className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors w-full text-left"
                        >
                          <LogOut className="w-5 h-5" />
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/auth/login"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                        >
                          <LogIn className="w-5 h-5 text-gray-400" />
                          Sign In
                        </Link>
                        <Link
                          href="/auth/register"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                        >
                          <UserPlus className="w-5 h-5 text-gray-400" />
                          Create Account
                        </Link>
                      </>
                    )}
                  </div>
                </motion.div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default SiteNav;
