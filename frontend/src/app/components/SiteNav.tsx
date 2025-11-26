'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
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

const navLinks = [
  { href: '/#about', label: 'About' },
  { href: '/#features', label: 'Features' },
];

const SiteNav = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, logout } = useAuthStore();

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

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 bg-transparent"
    >
      <div className="px-6 md:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3 focus:outline-none">
            <Image
              src="/logos/logo-horizontal.svg"
              alt="All'Arco Apartment Logo"
              width={200}
              height={60}
              className="object-contain"
              priority
            />
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 text-gray-800 hover:text-gray-900 bg-white/30 hover:bg-white/50 backdrop-blur-sm rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#C4A572]/50"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2 text-gray-800 text-sm">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="relative px-4 py-2 rounded-full hover:text-gray-900 hover:bg-white/40 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#C4A572]/50"
              >
                {label}
              </Link>
            ))}

            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 bg-white/40 backdrop-blur-sm px-4 py-2 rounded-full hover:bg-white/60 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-[#C4A572]/50"
                aria-label="Account menu"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <User className="w-4 h-4" />
                <span>{isAuthenticated ? user?.first_name || 'Account' : 'Account'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 mt-2 w-56 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden z-50 border border-white/30"
                    role="menu"
                  >
                    <div className="py-2">
                      {isAuthenticated ? (
                        <>
                          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-white/60 hover:text-gray-900 transition-all duration-200 mx-2 rounded-lg" role="menuitem">
                            <User className="w-4 h-4 text-gray-500" />
                            <span>Dashboard</span>
                          </Link>
                          <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-white/60 hover:text-gray-900 transition-all duration-200 mx-2 rounded-lg" role="menuitem">
                            <Settings className="w-4 h-4 text-gray-500" />
                            <span>Profile</span>
                          </Link>
                          <Link href="/bookings" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-white/60 hover:text-gray-900 transition-all duration-200 mx-2 rounded-lg" role="menuitem">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span>My Bookings</span>
                          </Link>
                          {(user?.role === 'admin' || user?.role === 'super_admin') && (
                            <Link href="/admin" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-white/60 hover:text-gray-900 transition-all duration-200 mx-2 rounded-lg" role="menuitem">
                              <Sparkles className="w-4 h-4 text-gray-500" />
                              <span>Admin Panel</span>
                            </Link>
                          )}
                          <div className="my-2 border-t border-white/40 mx-2" />
                          <button
                            onClick={() => { logout(); setDropdownOpen(false); }}
                            className="flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50/60 transition-all duration-200 w-full text-left mx-2 rounded-lg"
                            style={{ width: 'calc(100% - 16px)' }}
                            role="menuitem"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <Link href="/auth/login" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-white/60 hover:text-gray-900 transition-all duration-200 mx-2 rounded-lg" role="menuitem">
                            <LogIn className="w-4 h-4 text-gray-500" />
                            <span>Login</span>
                          </Link>
                          <Link href="/auth/register" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-white/60 hover:text-gray-900 transition-all duration-200 mx-2 rounded-lg" role="menuitem">
                            <UserPlus className="w-4 h-4 text-gray-500" />
                            <span>Sign Up</span>
                          </Link>
                          <Link href="/bookings" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-white/60 hover:text-gray-900 transition-all duration-200 mx-2 rounded-lg" role="menuitem">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span>My Bookings</span>
                          </Link>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white/90 backdrop-blur-xl z-50 md:hidden overflow-y-auto shadow-[-8px_0_32px_rgba(0,0,0,0.1)]"
              role="dialog"
              aria-label="Mobile navigation"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-xl font-semibold text-gray-900">Menu</span>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 hover:bg-white/60 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#C4A572]/50 border border-transparent hover:border-white/30"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                <div className="space-y-1">
                  {navLinks.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-3 text-gray-700 hover:text-gray-900 hover:bg-white/60 rounded-xl transition-all duration-300"
                    >
                      {label}
                    </Link>
                  ))}

                  <div className="pt-4 mt-4 border-t border-gray-200/50">
                    {isAuthenticated ? (
                      <>
                        <Link
                          href="/dashboard"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:text-gray-900 hover:bg-white/60 rounded-xl transition-all duration-300"
                        >
                          <User className="w-4 h-4" />
                          Dashboard
                        </Link>
                        <Link
                          href="/bookings"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:text-gray-900 hover:bg-white/60 rounded-xl transition-all duration-300"
                        >
                          <Calendar className="w-4 h-4" />
                          My Bookings
                        </Link>
                        <button
                          onClick={() => { logout(); setMobileMenuOpen(false); }}
                          className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50/60 rounded-xl transition-all duration-300 w-full text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/auth/login"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:text-gray-900 hover:bg-white/60 rounded-xl transition-all duration-300"
                        >
                          <LogIn className="w-4 h-4" />
                          Login
                        </Link>
                        <Link
                          href="/auth/register"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:text-gray-900 hover:bg-white/60 rounded-xl transition-all duration-300"
                        >
                          <UserPlus className="w-4 h-4" />
                          Sign Up
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default SiteNav;
