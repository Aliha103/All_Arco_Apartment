'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

/**
 * Legacy URL redirect page
 * Redirects /dashboard to appropriate URL:
 * - Team members → /pms
 * - Guests → / (homepage)
 */
export default function DashboardRedirect() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Not authenticated - redirect to login
        router.replace('/auth/login');
      } else {
        const isTeamMember = user.is_super_admin || user.is_team_member;

        if (isTeamMember) {
          // Team members go to PMS
          router.replace('/pms');
        } else {
          // Guests go to homepage
          router.replace('/');
        }
      }
    }
  }, [user, isLoading, router]);

  // Show loading spinner while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#C4A572]/30 border-t-[#C4A572]" />
        <p className="text-sm text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
