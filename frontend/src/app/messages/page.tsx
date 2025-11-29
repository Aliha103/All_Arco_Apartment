'use client';

import { MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';

export default function MessagesPage() {
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
