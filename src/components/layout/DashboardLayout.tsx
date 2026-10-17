import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, needsProfile } from '../../store/authStore.js';
import { isFirebaseMocked } from '../../services/firebase.js';
import SidebarNav from './SidebarNav';
import NudgeHost from '../nudges/NudgeHost';
import GameHost from '../games/GameHost';
import ArcMenu from './ArcMenu';
import AnniversaryPrompt from '../dashboard/AnniversaryPrompt';

/**
 * DashboardLayout Component
 * Purpose:
 * - Frames all authenticated workspace routes.
 * - Flex layout containing SidebarNav on left, Outlet content on right.
 * - Allows pages (like Pinboard) to take up full-bleed edge-to-edge area by omitting margins.
 */
const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, checkAuth, user, switchIdentity } = useAuthStore();

  const isHome = location.pathname === '/';
  const isPinboard = location.pathname === '/pinboard';

  // Initialize Auth listeners and redirect check
  useEffect(() => {
    const unsubscribe = checkAuth();
    return () => {
      unsubscribe();
    };
  }, [checkAuth]);

  // Auth Guard: redirect unauthenticated sessions to login, unfinished profiles to the profile step
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) navigate('/login');
    else if (needsProfile(user)) navigate('/complete-profile');
  }, [isLoading, isAuthenticated, user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-on-surface-variant">
        <svg className="animate-spin h-8 w-8 text-primary mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span>Loading your space...</span>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background text-on-background flex ${isHome ? 'flex-col' : 'flex-col lg:flex-row'} relative selection:bg-primary selection:text-on-primary overflow-x-clip transition-colors duration-300`}>
      {/* Partner notes: sticky popups on Home, bell elsewhere, composer everywhere */}
      <NudgeHost isHome={isHome} />
      <GameHost />
      <AnniversaryPrompt />

      {/* TEMP dev testing: switch whole site between me and partner */}
      {isFirebaseMocked && (
        <button
          onClick={switchIdentity}
          className="fixed bottom-4 right-4 z-[100] px-3 py-2 rounded-full bg-primary text-on-primary text-[10px] font-mono uppercase tracking-widest shadow-lg cursor-pointer"
        >
          Dev: viewing as {user?.displayName} — switch
        </button>
      )}

      {/* Sidebar navigation on the left */}
      {!isHome && <SidebarNav />}
      {/* Home has no fixed sidebar; the arc menu slides out from the left edge instead */}
      {isHome && <ArcMenu />}

      {/* Main page content area */}
      <div className={`flex-1 min-h-screen flex flex-col ${isHome ? '' : 'lg:pl-64 pt-16 lg:pt-0'} relative z-20`}>
        <main className="flex-1 flex flex-col relative z-10">
          <Outlet />
        </main>

        {/* Footer (Hidden on pinboard canvas screen and home screen) */}
        {!isPinboard && !isHome && (
          <footer className="border-t border-border-gray bg-surface-container py-6 text-center text-[10px] text-on-surface-variant font-mono tracking-widest uppercase relative z-10 transition-colors duration-300">
            OURSPACE // PRIVATE SPACE FOR TWO
          </footer>
        )}
      </div>
    </div>
  );
};

export default DashboardLayout;
