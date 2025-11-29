'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { generateUserId } from '@/lib/userId';

/**
 * Legacy URL redirect page
 * Redirects /messages to /u/{userId}/messages
 */
export default function MessagesRedirect() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Not authenticated - redirect to login
        router.replace('/auth/login');
      } else {
        // Authenticated - redirect to new user-specific URL
        const userId = generateUserId(user);
        router.replace(`/u/${userId}/messages`);
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
