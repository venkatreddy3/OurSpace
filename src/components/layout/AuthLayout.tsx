import React from 'react';
import { Outlet } from 'react-router-dom';
import ThemeToggle from '../ui/ThemeToggle';

/**
 * AuthLayout Component
 * Purpose:
 * - Simple layout shell wrapping unauthenticated/login routes.
 * - Centers content on the screen with soft pink aura overlays and a theme toggle.
 */
const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-primary selection:text-on-primary">
      {/* Decorative pink glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Dynamic Route Content */}
      <main className="w-full max-w-6xl z-10 flex justify-center">
        <Outlet />
      </main>

      <footer className="absolute bottom-6 text-xs text-on-surface-variant font-mono">
        OURSPACE // PRIVATE SANCTUARY
      </footer>
    </div>
  );
};

export default AuthLayout;
