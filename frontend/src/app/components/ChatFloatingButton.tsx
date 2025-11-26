'use client';

import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

interface ChatFloatingButtonProps {
  anchor?: 'left' | 'right';
  onClick?: () => void;
}

export default function ChatFloatingButton({ anchor = 'right', onClick }: ChatFloatingButtonProps) {
  const positionClass = anchor === 'left'
    ? 'left-[max(16px,env(safe-area-inset-left))]'
    : 'right-[max(16px,env(safe-area-inset-right))]';

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      aria-label="Chat with us"
      className={`fixed bottom-6 ${positionClass} w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-full shadow-lg flex items-center justify-center z-40 hover:shadow-xl transition-shadow`}
    >
      <MessageCircle className="w-6 h-6" />
    </motion.button>
  );
}
