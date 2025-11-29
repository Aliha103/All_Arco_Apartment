'use client';

import { useEffect, useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { generateUserId, verifyUserId } from '@/lib/userId';
import SiteNav from '@/app/components/SiteNav';
import SiteFooter from '@/app/components/SiteFooter';

export default function MessagesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();

  // Security: Verify userId in URL matches logged-in user
  const urlUserId = params.userId as string;
  const isAuthorized = useMemo(() => {
    return verifyUserId(urlUserId, user);
  }, [urlUserId, user]);

  // Authentication guard - redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [isLoading, user, router]);

  // Authorization guard - redirect if userId doesn't match
  useEffect(() => {
    if (!isLoading && user && !isAuthorized) {
      const correctUserId = generateUserId(user);
      router.replace(`/u/${correctUserId}/messages`);
    }
  }, [isLoading, user, isAuthorized, router]);

  // Loading state or not authenticated
  if (isLoading || !user || !isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <SiteNav />
        <main className="flex-1 flex items-center justify-center pt-24">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#C4A572]/30 border-t-[#C4A572]" />
            <p className="text-sm text-gray-600">
              {isLoading ? 'Loading messages...' : 'Verifying access...'}
            </p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SiteNav />

      <main className="flex-1 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center"
          >
            <div className="w-16 h-16 bg-[#C4A572]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-8 h-8 text-[#C4A572]" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Messages</h1>
            <p className="text-gray-600 mb-8">
              Your messaging center for guest and team communications
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
              <strong>Coming Soon:</strong> Real-time messaging functionality will be available in the next update.
            </div>
          </motion.div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
