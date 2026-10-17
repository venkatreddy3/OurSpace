import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import ThemeToggle from '../ui/ThemeToggle';
import LoveClock from '../ui/LoveClock';
import { useTheme } from '../../context/themeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Home,
  Pin,
  Award,
  Gamepad2,
  Compass,
  Image,
  LogOut,
  Settings as SettingsIcon,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';

/**
 * SidebarNav Component
 * Purpose:
 * - Positioned fixed on the left (responsive collapse toggle).
 * - Top: brand + partner status. Middle: navigation. Bottom: love clock, theme switch, profile.
 */
const SidebarNav: React.FC = () => {
  const navigate = useNavigate();
  const { user, partner, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/pinboard', label: 'Pinboard', icon: Pin },
    { to: '/memory-stack', label: 'MemoryStack', icon: Award },
    { to: '/games', label: 'Couple Games', icon: Gamepad2 },
    { to: '/recommendations', label: 'Recommendations', icon: Compass },
    { to: '/gallery', label: 'Shared Gallery', icon: Image },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initial = (name?: string, fallback = '?') => (name?.trim()?.[0] || fallback).toUpperCase();

  const Avatar: React.FC<{ photo?: string; name?: string; fallback: string }> = ({ photo, name, fallback }) => (
    <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container border-2 border-sidebar-bg flex items-center justify-center overflow-hidden text-sm font-bold">
      {photo ? <img src={photo} alt={name} className="w-full h-full object-cover" /> : initial(name, fallback)}
    </div>
  );

  const sidebarContent = (
    <div className="h-full flex flex-col gap-6 overflow-y-auto px-5 py-6 bg-sidebar-bg border-r border-sidebar-border transition-colors duration-300">
      {/* Brand */}
      <Link to="/" onClick={() => setIsOpen(false)} aria-label="Go to home" className="flex items-center gap-3 w-fit px-1">
        <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center">
          <Heart className="fill-current w-4 h-4" />
        </div>
        <span className="font-serif text-2xl tracking-tight text-on-background">Ourspace</span>
      </Link>

      {/* Partner connection */}
      <div className="flex items-center gap-3 px-1">
        <div className="flex -space-x-3">
          <Avatar photo={user?.photoURL} name={user?.displayName} fallback="U" />
          <Avatar photo={partner?.photoURL} name={partner?.displayName} fallback="P" />
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-on-surface leading-tight">
            <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" /> Connected
          </p>
          <p className="text-xs text-on-surface-variant truncate">with {partner?.displayName || 'your partner'}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1" aria-label="Main">
        <div className="flex items-center justify-between px-3 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">Menu</p>
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-1 rounded-md text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors cursor-pointer"
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setIsOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-primary-container text-on-primary-container font-semibold'
                  : 'text-on-surface-variant font-medium hover:text-on-surface hover:bg-surface-container-high'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom group */}
      <div className="mt-auto flex flex-col gap-4">
        <LoveClock />

        {/* Profile */}
        <div className="flex items-center gap-3 border-t border-sidebar-border pt-4">
          <div className="w-9 h-9 shrink-0 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center text-sm font-bold overflow-hidden">
            {user?.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : initial(user?.displayName, 'M')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-on-surface truncate leading-tight">{user?.displayName || 'My Profile'}</p>
            <p className="text-xs text-on-surface-variant truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Left Panel */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-30">{sidebarContent}</aside>

      {/* Mobile Header Bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-16 bg-background border-b border-border-gray z-35 flex items-center justify-between px-6 transition-colors duration-300">
        <div className="flex items-center gap-2">
          <Heart className="fill-primary text-primary w-5 h-5" />
          <span className="font-serif text-lg text-on-surface tracking-tight">
            Our<span className="text-primary">space</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-on-surface-variant hover:text-on-surface p-2 bg-surface-container border border-border-gray rounded-xl transition-colors duration-300"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="absolute inset-y-0 left-0 w-72 max-w-[85vw] h-full"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SidebarNav;
