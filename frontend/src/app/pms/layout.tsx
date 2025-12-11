'use client';

import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LazyMotion, domAnimation, m, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { logPMSAccess } from '@/lib/auditLogger';
import {
  LayoutDashboard,
  Calendar,
  CreditCard,
  FileText,
  Users,
  DollarSign,
  CalendarDays,
  Image as ImageIcon,
  UserCog,
  TrendingUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  User,
  LogOut,
  Home,
  Sparkles,
  Shield,
  SprayCan,
  Receipt,
  Star,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Smooth easing
const smoothEase = [0.22, 1, 0.36, 1] as const;
// Alias to keep existing motion.* usage while using LazyMotion for smaller bundles
const motion = m;

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  permission: string | null;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/pms', icon: LayoutDashboard, permission: null }, // Always visible
  { name: 'Bookings', href: '/pms/bookings', icon: Calendar, permission: 'bookings.view' },
  { name: 'Calendar', href: '/pms/calendar', icon: CalendarDays, permission: 'bookings.view' },
  { name: 'Cleaning', href: '/pms/cleaning', icon: SprayCan, permission: 'cleaning.view' },
  { name: 'Payments', href: '/pms/payments', icon: CreditCard, permission: 'payments.view' },
  { name: 'Invoices', href: '/pms/invoices', icon: FileText, permission: 'payments.view' },
  { name: 'Expenses', href: '/pms/expenses', icon: Receipt, permission: 'payments.view' },
  { name: 'Guests tree', href: '/pms/guests', icon: Users, permission: 'guests.view' },
  { name: 'Reviews', href: '/pms/reviews', icon: Star, permission: 'reviews.view' },
  { name: 'Users', href: '/pms/users', icon: User, permission: 'team.view' },
  { name: 'Pricing', href: '/pms/pricing', icon: DollarSign, permission: 'pricing.view' },
  { name: 'Gallery', href: '/pms/gallery', icon: ImageIcon, permission: 'gallery.view' },
  { name: 'Team', href: '/pms/team', icon: UserCog, permission: 'team.view' },
  { name: 'OTA Setting', href: '/pms/settings/ota', icon: Sparkles, permission: 'bookings.view' },
  { name: 'Alloggiati', href: '/pms/settings/alloggiati', icon: Shield, permission: 'bookings.view' },
  { name: 'Reports', href: '/pms/reports', icon: TrendingUp, permission: 'reports.view' },
];

export default function PMSLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const { hasPermission, isTeamMember } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const originalBodyStyles = useRef<{ overflow: string; touchAction: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  // Scroll tracking
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    if (latest > 20) {
      setIsScrolled(true);
    } else {
      setIsScrolled(false);
    }
  });

  // Redirect if not team member and log PMS access
  useEffect(() => {
    // Wait for auth to complete before making any decisions
    if (isLoading) return;

    if (!user || !isTeamMember()) {
      router.push('/auth/login');
    } else {
      // Log successful PMS access for security audit
      logPMSAccess(user);
    }
  }, [user, isLoading, isTeamMember, router]);

  // Close dropdown on outside click and handle Escape key
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
  }, [setDropdownOpen, setMobileMenuOpen]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (!originalBodyStyles.current) {
      originalBodyStyles.current = {
        overflow: document.body.style.overflow,
        touchAction: document.body.style.touchAction,
      };
    }

    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = originalBodyStyles.current?.overflow || '';
      document.body.style.touchAction = originalBodyStyles.current?.touchAction || '';
    }

    return () => {
      document.body.style.overflow = originalBodyStyles.current?.overflow || '';
      document.body.style.touchAction = originalBodyStyles.current?.touchAction || '';
    };
  }, [mobileMenuOpen]);

  // Filter navigation based on permissions
  const filteredNav = useMemo(
    () => navigation.filter((item) => !item.permission || hasPermission(item.permission)),
    [hasPermission, user?.id]
  );

  const navItems = useMemo(
    () =>
      filteredNav.map((item, index) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <motion.div
            key={item.href}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <Link
              href={item.href}
              className={`flex items-center ${
                isSidebarCollapsed ? 'justify-center px-2.5' : 'gap-2.5 px-3.5'
              } py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[#C4A572] to-[#B39562] text-white shadow-lg shadow-[#C4A572]/30'
                  : 'text-gray-700 hover:bg-gray-100 hover:translate-x-1'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {isSidebarCollapsed ? <span className="sr-only">{item.name}</span> : item.name}
            </Link>
          </motion.div>
        );
      }),
    [filteredNav, isSidebarCollapsed, pathname]
  );

  // Show loading screen during authentication, initial mount, or when user is not authorized
  // This prevents any flash of content during auth checks and redirects
  if (isLoading || !user || !isTeamMember()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            {/* Outer ring */}
            <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
            {/* Spinning ring */}
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-[#C4A572] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">Loading PMS</p>
            <p className="text-sm text-gray-500 mt-1">Verifying authentication...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const roleLabel = user.role_info?.name || 'Team Member';

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-gray-50">
        {/* Professional Header - Matching Homepage */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: smoothEase }}
          className={`
            fixed top-0 left-0 right-0 z-50
          transition-all duration-500 ease-out
          ${isScrolled
            ? 'bg-white/98 backdrop-blur-xl shadow-lg shadow-black/5'
            : 'bg-white border-b border-gray-200'
          }
        `}
      >
        <div className="w-full px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between h-16 sm:h-18 lg:h-20">

            {/* Logo */}
            <Link href="/pms" className="flex-shrink-0 focus:outline-none flex items-center gap-3">
              <Image
                src="/allarco-logo.png"
                alt="All'Arco Apartment"
                width={160}
                height={58}
                className="object-contain h-10 sm:h-12 lg:h-14 w-auto"
                priority
              />
            </Link>

            {/* Right Section */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* View Site Link */}
              <Link
                href="/"
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#C4A572] transition-colors rounded-lg hover:bg-gray-50"
              >
                <Home className="w-4 h-4" />
                View Site
              </Link>

              {/* User Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A572]"
                  aria-label="Account menu"
                  aria-expanded={dropdownOpen}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C4A572] to-[#B39562] flex items-center justify-center text-white text-sm font-semibold shadow-md">
                    {user.first_name?.[0]?.toUpperCase()}{user.last_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="hidden md:block text-left max-w-[140px]">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {user.first_name?.[user.first_name.length - 1]?.toUpperCase()}. {user.last_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{roleLabel}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: smoothEase }}
                      className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl shadow-black/20 overflow-hidden border border-gray-200"
                    >
                      {/* User Info Section */}
                      <div className="px-4 py-4 bg-gradient-to-br from-gray-50 to-white border-b border-gray-200">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C4A572] to-[#B39562] flex items-center justify-center text-white text-lg font-bold shadow-lg">
                            {user.first_name?.[user.first_name.length - 1]?.toUpperCase()}{user.last_name?.[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">
                              {user.first_name?.[user.first_name.length - 1]?.toUpperCase()}. {user.last_name}
                            </p>
                            <p className="text-xs text-gray-600 truncate mt-0.5">{user.email}</p>
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-gradient-to-r from-[#C4A572] to-[#B39562] text-[10px] font-bold text-white mt-2 shadow-sm">
                              {roleLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items - All Vertical */}
                      <div className="py-2">
                        <Link
                          href="/"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors sm:hidden"
                        >
                          <Home className="w-4 h-4 text-gray-400" />
                          <span>View Site</span>
                        </Link>
                        <Link
                          href="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <User className="w-4 h-4 text-gray-400" />
                          <span>My Dashboard</span>
                        </Link>
                        <Link
                          href="/messages"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          <span>Messages</span>
                        </Link>
                        <div className="my-2 border-t border-gray-100"></div>
                        <button
                          onClick={() => {
                            logout();
                            setDropdownOpen(false);
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile Menu Button */}
              <motion.button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A572]"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                whileTap={{ scale: 0.95 }}
              >
                <Menu className="w-6 h-6" />
              </motion.button>
            </div>
          </div>
        </div>
        </motion.header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-full max-w-[280px] bg-white z-[70] lg:hidden overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#C4A572]" />
                  <span className="font-bold text-gray-900">PMS Navigation</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="p-3 space-y-1">
                {filteredNav.map((item, index) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-[#C4A572] to-[#B39562] text-white shadow-lg shadow-[#C4A572]/30'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {item.name}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex pt-16 sm:pt-18 lg:pt-20">
        {/* Desktop Sidebar */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: smoothEase }}
          className={`hidden lg:flex flex-col ${isSidebarCollapsed ? 'w-16' : 'w-40'} bg-white border-r border-gray-200 min-h-[calc(100vh-5rem)] sticky top-[5rem] transition-[width] duration-300 ease-out`}
        >
          <nav className="p-2 space-y-0.5 flex-1 overflow-y-auto">
            {navItems}
          </nav>
          <div className="p-2 border-t border-gray-100 sticky bottom-0 bg-white">
            <button
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label={isSidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
              {isSidebarCollapsed ? (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span className="sr-only">Expand</span>
                </>
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  <span>Collapse sidebar</span>
                </>
              )}
            </button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: smoothEase }}
          >
            {children}
          </motion.div>
        </main>
      </div>
      </div>
    </LazyMotion>
  );
}
