'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HelpCircle, X, Sparkles, Calendar, Shield, Globe } from 'lucide-react';

const APP_VERSION = '1.0.0';

const updates = [
  {
    version: '1.0.0',
    date: 'November 2025',
    icon: Sparkles,
    title: 'Initial Release',
    changes: [
      'Luxury apartment booking system',
      'Secure payment processing',
      'Guest dashboard & reservations',
      'Mobile-responsive design',
    ],
  },
  {
    version: '1.0.1',
    date: 'November 2025',
    icon: Shield,
    title: 'Policies & Legal',
    changes: [
      'Privacy Policy (GDPR compliant)',
      'Terms of Service',
      'Cancellation Policy',
      'Cookie Policy',
    ],
  },
  {
    version: '1.0.2',
    date: 'November 2025',
    icon: Globe,
    title: 'UX Improvements',
    changes: [
      'Smooth mobile navigation',
      'Auto-scrolling hero images',
      'Improved footer design',
      'Professional animations',
    ],
  },
];

const VersionInfo = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 bottom-4 z-50 w-10 h-10 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-400 hover:text-[#C4A572] rounded-full shadow-lg shadow-black/20 flex items-center justify-center transition-colors duration-300 border border-gray-800 hover:border-[#C4A572]/30"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Version information"
      >
        <HelpCircle className="w-5 h-5" />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-4 right-4 bottom-4 sm:left-4 sm:right-auto sm:bottom-4 sm:w-[400px] max-h-[80vh] bg-[#121212] rounded-2xl shadow-2xl z-[101] overflow-hidden border border-gray-800"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#C4A572]/10 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#C4A572]" />
                  </div>
                  <div>
                    <h2 className="text-white font-semibold">All&apos;Arco Apartment</h2>
                    <p className="text-xs text-gray-500">Version {APP_VERSION}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Updates List */}
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Latest Updates
                </h3>
                <div className="space-y-4">
                  {updates.map((update, index) => {
                    const Icon = update.icon;
                    return (
                      <motion.div
                        key={update.version}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative pl-6 pb-4 border-l border-gray-800 last:border-l-transparent"
                      >
                        {/* Timeline dot */}
                        <div className="absolute -left-[9px] top-0 w-[18px] h-[18px] bg-[#121212] border-2 border-[#C4A572] rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-[#C4A572] rounded-full" />
                        </div>

                        {/* Content */}
                        <div className="ml-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-white">{update.title}</span>
                            <span className="text-xs px-2 py-0.5 bg-[#C4A572]/10 text-[#C4A572] rounded-full">
                              v{update.version}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                            <Calendar className="w-3 h-3" />
                            {update.date}
                          </div>
                          <ul className="space-y-1">
                            {update.changes.map((change, i) => (
                              <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                                <span className="text-[#C4A572] mt-1.5">•</span>
                                {change}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-800 bg-black/20">
                <p className="text-xs text-gray-500 text-center">
                  Made with love in Venice, Italy
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default VersionInfo;
