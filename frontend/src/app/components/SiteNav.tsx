'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  LogIn,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  User,
  UserPlus,
  X,
  Home,
  MapPin,
  Image as GalleryIcon,
  Bed,
  MessageSquare,
  LayoutDashboard,
} from 'lucide-react';

// Smooth easing - Discord-style
const smoothEase = [0.16, 1, 0.3, 1] as const;

// Navigation structure
const navLinks = [
  { href: '/#about', label: 'The Apartment', icon: Bed },
  { href: '/#features', label: 'Amenities', icon: Home },
  { href: '/#gallery', label: 'Gallery', icon: GalleryIcon },
  { href: '/#location', label: 'Venice', icon: MapPin },
];

const SiteNav = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const { user, isAuthenticated, logout } = useAuthStore();
  const isTeamMember = !!user && (user.is_super_admin || user.is_team_member);

  // Get first initial + last name
  const displayName = user
    ? `${user.first_name?.[0] || ''}. ${user.last_name || ''}`
    : '';

  // Role label with proper formatting
  const roleLabel = isTeamMember
    ? (user?.role_info?.name || 'Team Member')
    : 'Guest';

  // Framer Motion scroll tracking
  const { scrollY } = useScroll();

  // Quantum scroll logic - hide on scroll down, show on scroll up
  useMotionValueEvent(scrollY, 'change', (latest) => {
    const previous = lastScrollY.current;

    if (latest > 80) {
      setIsScrolled(true);
      if (latest > previous && latest > 150) {
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
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [mobileMenuOpen]);

  // Close menu on route change
  const handleNavClick = () => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  };

  const textClasses = isScrolled ? 'text-gray-800' : 'text-white';
  const textHoverClasses = isScrolled ? 'hover:text-[#C4A572]' : 'hover:text-[#C4A572]';

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: smoothEase }}
        className={`
          fixed top-0 left-0 right-0 z-50
          transition-all duration-500 ease-out
          ${isScrolled
            ? 'bg-white/98 backdrop-blur-xl shadow-lg shadow-black/5'
            : 'bg-gradient-to-b from-black/30 to-transparent'
          }
          ${isVisible ? 'translate-y-0' : '-translate-y-full'}
        `}
      >
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16">
          <div className="flex items-center justify-between h-16 sm:h-18 lg:h-20">

            {/* Logo */}
            <Link href="/" className="flex-shrink-0 focus:outline-none" onClick={handleNavClick}>
              <Image
                src="/allarco-logo.png"
                alt="All'Arco Apartment"
                width={180}
                height={65}
                className="object-contain h-12 sm:h-14 lg:h-16 w-auto"
                priority
              />
            </Link>

            {/* Desktop & Tablet Navigation (md and up) */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={handleNavClick}
                  className={`
                    relative px-3 lg:px-4 py-2 text-sm font-medium
                    transition-all duration-300 rounded-full
                    ${textClasses} ${textHoverClasses}
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A572]
                  `}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Book Now - Desktop & Tablet */}
              <Link
                href="/book"
                className="hidden sm:flex px-4 lg:px-6 py-2 lg:py-2.5 text-sm font-semibold
                  bg-[#C4A572] text-white rounded-full
                  hover:bg-[#B39562] hover:shadow-lg hover:shadow-[#C4A572]/20
                  transition-all duration-300 ease-out
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A572] focus-visible:ring-offset-2"
              >
                Book Now
              </Link>

              {/* Account Dropdown - Desktop (Discord Style) */}
              <div className="hidden md:block relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`
                    flex items-center gap-2 px-2.5 py-1.5 rounded-full
                    transition-all duration-200
                    ${isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'}
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A572]
                  `}
                  aria-label="Account menu"
                  aria-expanded={dropdownOpen}
                >
                  {isAuthenticated ? (
                    <>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs ${isScrolled ? 'bg-[#C4A572] text-white' : 'bg-[#C4A572] text-white'}`}>
                        {user?.first_name?.[0]}{user?.last_name?.[0]}
                      </div>
                      <span className="text-sm font-medium max-w-[120px] truncate">{displayName}</span>
                    </>
                  ) : (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isScrolled ? 'bg-gray-100' : 'bg-white/20'}`}>
                      <User className="w-4 h-4" />
                    </div>
                  )}
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: smoothEase }}
                      className="absolute right-0 mt-2 w-64 bg-[#18191c] rounded-lg shadow-2xl overflow-hidden border border-[#2b2d31]"
                    >
                      {isAuthenticated ? (
                        <>
                          {/* User Info Header - Discord Style */}
                          <div className="px-3 py-3 bg-[#111214] border-b border-[#2b2d31]">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#C4A572] flex items-center justify-center font-bold text-white flex-shrink-0">
                                {user?.first_name?.[0]}{user?.last_name?.[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white text-sm truncate">{displayName}</p>
                                <p className="text-xs text-[#b5bac1] truncate">{user?.email}</p>
                                <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded bg-[#C4A572]/20 text-[10px] font-semibold text-[#C4A572] uppercase tracking-wider">
                                  {roleLabel}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Menu Items */}
                          <div className="py-1.5">
                            <Link
                              href={isTeamMember ? '/pms' : '/dashboard'}
                              onClick={handleNavClick}
                              className="flex items-center gap-3 px-3 py-2 text-sm text-[#dbdee1] hover:bg-[#404249] hover:text-white transition-colors"
                            >
                              <LayoutDashboard className="w-4 h-4 text-[#b5bac1]" />
                              {isTeamMember ? 'PMS Dashboard' : 'Dashboard'}
                            </Link>
                            <Link
                              href="/messages"
                              onClick={handleNavClick}
                              className="flex items-center gap-3 px-3 py-2 text-sm text-[#dbdee1] hover:bg-[#404249] hover:text-white transition-colors"
                            >
                              <MessageSquare className="w-4 h-4 text-[#b5bac1]" />
                              Messages
                            </Link>
                            <Link
                              href="/profile/settings"
                              onClick={handleNavClick}
                              className="flex items-center gap-3 px-3 py-2 text-sm text-[#dbdee1] hover:bg-[#404249] hover:text-white transition-colors"
                            >
                              <Settings className="w-4 h-4 text-[#b5bac1]" />
                              Profile
                            </Link>
                          </div>

                          {/* Divider */}
                          <div className="border-t border-[#2b2d31]" />

                          {/* Logout */}
                          <div className="py-1.5">
                            <button
                              onClick={() => { logout(); handleNavClick(); }}
                              className="flex items-center gap-3 px-3 py-2 text-sm text-[#f23f43] hover:bg-[#404249] transition-colors w-full"
                            >
                              <LogOut className="w-4 h-4" />
                              Sign Out
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="py-1.5">
                          <Link
                            href="/auth/login"
                            onClick={handleNavClick}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-[#dbdee1] hover:bg-[#404249] hover:text-white transition-colors"
                          >
                            <LogIn className="w-4 h-4 text-[#b5bac1]" />
                            Sign In
                          </Link>
                          <Link
                            href="/auth/register"
                            onClick={handleNavClick}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-[#dbdee1] hover:bg-[#404249] hover:text-white transition-colors"
                          >
                            <UserPlus className="w-4 h-4 text-[#b5bac1]" />
                            Create Account
                          </Link>
                          <div className="border-t border-[#2b2d31] my-1.5" />
                          <Link
                            href="/bookings/find"
                            onClick={handleNavClick}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-[#C4A572] hover:bg-[#404249] transition-colors"
                          >
                            <Calendar className="w-4 h-4" />
                            Find Booking
                          </Link>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile Menu Button */}
              <motion.button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`
                  md:hidden p-2 rounded-xl touch-manipulation
                  transition-colors duration-300
                  ${isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'}
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A572]
                `}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                whileTap={{ scale: 0.95 }}
              >
                <Menu className="w-6 h-6" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu - Full Screen Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Mobile Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-[320px] bg-white z-[70] md:hidden overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <Image
                  src="/allarco-logo.png"
                  alt="All'Arco Apartment"
                  width={110}
                  height={40}
                  className="object-contain"
                />
                <motion.button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                  whileTap={{ scale: 0.95 }}
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>

              {/* Account Section */}
              <div className="flex-1 overflow-y-auto py-6">
                <div className="px-3">
                  {isAuthenticated ? (
                    <>
                      {/* User Info */}
                      <div className="px-4 py-3 mb-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#C4A572] flex items-center justify-center font-bold text-white flex-shrink-0">
                            {user?.first_name?.[0]}{user?.last_name?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{displayName}</p>
                            <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                            <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full bg-gray-200 text-[10px] font-semibold text-gray-700 uppercase tracking-wider">
                              {roleLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                        <Link
                          href={isTeamMember ? '/pms' : '/dashboard'}
                          onClick={handleNavClick}
                          className="flex items-center gap-4 px-4 py-4 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                        >
                          <div className="w-10 h-10 rounded-xl bg-[#C4A572]/10 flex items-center justify-center">
                            <LayoutDashboard className="w-5 h-5 text-[#C4A572]" />
                          </div>
                          <span className="font-medium">{isTeamMember ? 'PMS Dashboard' : 'Dashboard'}</span>
                          <ChevronRight className="w-5 h-5 text-gray-300 ml-auto" />
                        </Link>
                      </motion.div>

                      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                        <Link
                          href="/messages"
                          onClick={handleNavClick}
                          className="flex items-center gap-4 px-4 py-4 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                        >
                          <div className="w-10 h-10 rounded-xl bg-[#C4A572]/10 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-[#C4A572]" />
                          </div>
                          <span className="font-medium">Messages</span>
                          <ChevronRight className="w-5 h-5 text-gray-300 ml-auto" />
                        </Link>
                      </motion.div>

                      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                        <Link
                          href="/profile/settings"
                          onClick={handleNavClick}
                          className="flex items-center gap-4 px-4 py-4 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                        >
                          <div className="w-10 h-10 rounded-xl bg-[#C4A572]/10 flex items-center justify-center">
                            <Settings className="w-5 h-5 text-[#C4A572]" />
                          </div>
                          <span className="font-medium">Profile</span>
                          <ChevronRight className="w-5 h-5 text-gray-300 ml-auto" />
                        </Link>
                      </motion.div>

                      <div className="mx-4 my-4 border-t border-gray-100" />

                      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                        <button
                          onClick={() => { logout(); handleNavClick(); }}
                          className="flex items-center gap-4 px-4 py-4 text-red-600 hover:bg-red-50 rounded-xl transition-colors w-full"
                        >
                          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                            <LogOut className="w-5 h-5 text-red-500" />
                          </div>
                          <span className="font-medium">Sign Out</span>
                        </button>
                      </motion.div>
                    </>
                  ) : (
                    <>
                      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                        <Link href="/auth/login" onClick={handleNavClick} className="flex items-center gap-4 px-4 py-4 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                          <div className="w-10 h-10 rounded-xl bg-[#C4A572]/10 flex items-center justify-center">
                            <LogIn className="w-5 h-5 text-[#C4A572]" />
                          </div>
                          <span className="font-medium">Sign In</span>
                          <ChevronRight className="w-5 h-5 text-gray-300 ml-auto" />
                        </Link>
                      </motion.div>
                      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                        <Link href="/auth/register" onClick={handleNavClick} className="flex items-center gap-4 px-4 py-4 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                          <div className="w-10 h-10 rounded-xl bg-[#C4A572]/10 flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-[#C4A572]" />
                          </div>
                          <span className="font-medium">Create Account</span>
                          <ChevronRight className="w-5 h-5 text-gray-300 ml-auto" />
                        </Link>
                      </motion.div>
                      <div className="mx-4 my-4 border-t border-gray-100" />
                      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                        <Link href="/bookings/find" onClick={handleNavClick} className="flex items-center gap-4 px-4 py-4 text-[#C4A572] hover:bg-[#C4A572]/5 rounded-xl transition-colors">
                          <div className="w-10 h-10 rounded-xl bg-[#C4A572]/10 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-[#C4A572]" />
                          </div>
                          <span className="font-medium">Find Booking</span>
                          <ChevronRight className="w-5 h-5 text-[#C4A572]/50 ml-auto" />
                        </Link>
                      </motion.div>
                    </>
                  )}
                </div>
              </div>

              {/* Bottom CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4, ease: smoothEase }}
                className="p-4 border-t border-gray-100 bg-gray-50"
              >
                <Link
                  href="/book"
                  onClick={handleNavClick}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-[#C4A572] text-white font-semibold rounded-xl hover:bg-[#B39562] transition-colors active:scale-[0.98] touch-manipulation"
                >
                  Book Your Stay
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default SiteNav;
