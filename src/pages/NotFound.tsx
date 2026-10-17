import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';

/**
 * NotFound Page
 * Purpose:
 * - Directs the user back to safe territory if they hit an unknown route.
 */
const NotFound: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-6">
      <motion.div
        initial={{ rotate: 0 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        className="w-16 h-16 rounded-full bg-surface-container border border-border-gray flex items-center justify-center text-on-surface-variant mb-4"
      >
        <Compass className="w-8 h-8" />
      </motion.div>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold font-serif text-on-surface">Lost in Space?</h1>
        <p className="text-on-surface-variant text-sm max-w-xs mx-auto">
          We couldn&apos;t find this page in your private universe. Let&apos;s guide you back home.
        </p>
      </div>
      <Link
        to="/"
        className="inline-flex items-center gap-2 bg-surface-container hover:bg-surface-container-high text-on-surface border border-border-gray rounded-full px-6 py-2.5 text-sm font-semibold transition-colors"
      >
        <Home className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
};

export default NotFound;
