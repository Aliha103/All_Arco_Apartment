'use client';

import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/pms', icon: '📊', permission: null }, // Always visible
  { name: 'Bookings', href: '/pms/bookings', icon: '📅', permission: 'bookings.view' },
  { name: 'Payments', href: '/pms/payments', icon: '💳', permission: 'payments.view' },
  { name: 'Invoices', href: '/pms/invoices', icon: '📄', permission: 'payments.view' },
  { name: 'Guests', href: '/pms/guests', icon: '👥', permission: 'guests.view' },
  { name: 'Pricing', href: '/pms/pricing', icon: '💰', permission: 'pricing.view' },
  { name: 'Calendar', href: '/pms/calendar', icon: '📆', permission: 'bookings.view' },
  { name: 'Team', href: '/pms/team', icon: '👨‍💼', permission: 'team.view' },
  { name: 'Reports', href: '/pms/reports', icon: '📈', permission: 'reports.view' },
];

export default function PMSLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const { hasPermission, isTeamMember } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect if not team member
  useEffect(() => {
    if (!isLoading && (!user || !isTeamMember())) {
      router.push('/auth/login');
    }
  }, [user, isLoading, isTeamMember, router]);

  if (isLoading || !user || !isTeamMember()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // Filter navigation based on permissions
  const filteredNav = navigation.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/pms" className="text-xl font-bold text-blue-600">
              All'Arco PMS
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
              View Site
            </Link>
            <span className="text-sm text-gray-600">
              {user.first_name} {user.last_name}
            </span>
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
              {user.role_info.name}
            </span>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r min-h-[calc(100vh-57px)] sticky top-[57px]">
          <nav className="p-4 space-y-1">
            {filteredNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
