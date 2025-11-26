import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';

interface ChatFloatingButtonProps {
  onClick?: () => void;
  anchor?: 'left' | 'right';
}

export const ChatFloatingButton: React.FC<ChatFloatingButtonProps> = ({ onClick, anchor = 'right' }) => {
  const [isVisible, setIsVisible] = useState(true);

  // In this stripped version we just always show for guests; hide logic can be added later
  const shouldShow = useMemo(() => true, []);

  useEffect(() => {
    setIsVisible(shouldShow);
  }, [shouldShow]);

  if (!isVisible) return null;

  const anchorStyle =
    anchor === 'left'
      ? { left: 'max(16px, env(safe-area-inset-left))' }
      : { right: 'max(16px, env(safe-area-inset-right))' };

  return (
    <div
      className="fixed bottom-[max(16px,env(safe-area-inset-bottom))] z-50"
      style={anchorStyle}
    >
      <button
        onClick={onClick}
        aria-label="Chat with us"
        className="relative inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 px-4 py-3 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 transition duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-white"
      >
        <span className="absolute inset-0 rounded-full bg-indigo-500/20 blur-md opacity-70" aria-hidden="true" />
        <MessageCircle className="w-5 h-5 relative z-10" />
        <span className="relative z-10">Chat with us</span>
      </button>
    </div>
  );
};

export default ChatFloatingButton;
