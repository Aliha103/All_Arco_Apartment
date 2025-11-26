'use client';

import { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useAuthStore } from '@/stores/authStore';
import {
  User,
  LogIn,
  LogOut,
  Menu,
  X,
  Settings,
  Calendar,
  Sparkles,
  UserPlus,
  ChevronDown,
} from 'lucide-react';

const SITE_URL = 'https://www.allarcoapartment.com';

const SiteNav = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="p-6 md:p-8"
    >
      <div className="flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 focus:outline-none">
          <Image
            src="/logos/logo-icon.svg"
            alt="All'Arco Apartment"
            width={88}
            height={88}
            className="object-contain"
          />
          <span className="text-white text-2xl font-semibold">All&apos;Arco Apartment</span>
        </a>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-white/90 text-sm">
          <a href={`${SITE_URL}/#about`} className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded px-2 py-1">About</a>
          <a href={`${SITE_URL}/#features`} className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded px-2 py-1">Features</a>

          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full hover:bg-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
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
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg overflow-hidden z-50 border border-gray-200"
                  role="menu"
                >
                  <div className="py-1">
                    {isAuthenticated ? (
                      <>
                        <a href="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">
                          <User className="w-4 h-4 text-gray-500" />
                          <span>Dashboard</span>
                        </a>
                        <a href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">
                          <Settings className="w-4 h-4 text-gray-500" />
                          <span>Profile</span>
                        </a>
                        <a href="/bookings" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span>My Bookings</span>
                        </a>
                        {(user?.role === 'admin' || user?.role === 'super_admin') && (
                          <a href="/admin" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">
                            <Sparkles className="w-4 h-4 text-gray-500" />
                            <span>Admin Panel</span>
                          </a>
                        )}
                        <div className="my-1 border-t border-gray-100" />
                        <button
                          onClick={() => { logout(); setDropdownOpen(false); }}
                          className="flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                          role="menuitem"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <a href="/login" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">
                          <LogIn className="w-4 h-4 text-gray-500" />
                          <span>Login</span>
                        </a>
                        <a href="/register" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">
                          <UserPlus className="w-4 h-4 text-gray-500" />
                          <span>Sign Up</span>
                        </a>
                        <a href="/my-reservation" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span>My Reservation</span>
                        </a>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>
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
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white z-50 md:hidden overflow-y-auto"
              role="dialog"
              aria-label="Mobile navigation"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-xl font-semibold text-gray-900">Menu</span>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                    aria-label="Close menu"
                  >
                    <X className="w-6 h-6 text-gray-600" />
                  </button>
                </div>
                <div className="space-y-3">
                  <a href={`${SITE_URL}/#about`} className="block text-gray-800 text-sm font-medium">About</a>
                  <a href={`${SITE_URL}/#features`} className="block text-gray-800 text-sm font-medium">Features</a>
                  <a href={`${SITE_URL}/#booking`} className="block text-gray-800 text-sm font-medium">Reservations</a>
                  <a href={isAuthenticated ? '/bookings' : '/my-reservation'} className="block text-gray-800 text-sm font-medium">My Reservation</a>
                  <div className="border-t border-gray-200 pt-3 space-y-2">
                    {isAuthenticated ? (
                      <>
                        <a href="/dashboard" className="block text-gray-800 text-sm font-medium">Dashboard</a>
                        <a href="/profile" className="block text-gray-800 text-sm font-medium">Profile</a>
                        <a href="/bookings" className="block text-gray-800 text-sm font-medium">My Bookings</a>
                        <button
                          onClick={() => { logout(); setMobileMenuOpen(false); }}
                          className="block text-left text-red-600 text-sm font-medium"
                        >
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <>
                        <a href="/login" className="block text-gray-800 text-sm font-medium">Login</a>
                        <a href="/register" className="block text-gray-800 text-sm font-medium">Sign Up</a>
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
