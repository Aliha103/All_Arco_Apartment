'use client';

import { motion } from 'framer-motion';
import { Table, Calendar } from 'lucide-react';

interface ViewToggleProps {
  value: 'list' | 'calendar';
  onChange: (value: 'list' | 'calendar') => void;
}

export default function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
      <button
        onClick={() => onChange('list')}
        className={`relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
          value === 'list'
            ? 'text-white'
            : 'text-gray-700 hover:text-gray-900'
        }`}
      >
        {value === 'list' && (
          <motion.div
            layoutId="activeView"
            className="absolute inset-0 bg-blue-600 rounded-md"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        <Table className="w-4 h-4 relative z-10" />
        <span className="hidden sm:inline relative z-10">List</span>
      </button>
      <button
        onClick={() => onChange('calendar')}
        className={`relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
          value === 'calendar'
            ? 'text-white'
            : 'text-gray-700 hover:text-gray-900'
        }`}
      >
        {value === 'calendar' && (
          <motion.div
            layoutId="activeView"
            className="absolute inset-0 bg-blue-600 rounded-md"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        <Calendar className="w-4 h-4 relative z-10" />
        <span className="hidden sm:inline relative z-10">Calendar</span>
      </button>
    </div>
  );
}
