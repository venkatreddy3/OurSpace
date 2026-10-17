import React from 'react';
import { NavLink } from 'react-router-dom';
import { Heart, Home, Pin, Award, Gamepad2, Compass, Image, LogOut } from 'lucide-react';

/**
 * Navbar component
 * Purpose:
 * - Shared desktop and mobile navigation links.
 * - Displays active states using Tailwind styles.
 */
const Navbar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Home', icon: <Home className="w-4 h-4" /> },
    { to: '/pinboard', label: 'Pinboard', icon: <Pin className="w-4 h-4" /> },
    { to: '/memory-stack', label: 'Memories', icon: <Award className="w-4 h-4" /> },
    { to: '/games', label: 'Games', icon: <Gamepad2 className="w-4 h-4" /> },
    { to: '/recommendations', label: 'Explore', icon: <Compass className="w-4 h-4" /> },
    { to: '/gallery', label: 'Gallery', icon: <Image className="w-4 h-4" /> },
  ];

  return (
    <nav className="border-b border-zinc-900 bg-surface-container sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Heart className="fill-primary text-primary w-5 h-5 animate-pulse" />
            <span className="font-serif font-extrabold text-lg text-on-surface tracking-tight">
              Our<span className="text-primary">space</span>
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/10'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-transparent'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>

          {/* User Options / Logout */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 border-r border-zinc-900 pr-4">
              <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-sm border border-border-gray">
                U
              </div>
              <span className="text-xs text-on-surface-variant font-medium">User</span>
            </div>
            <button
              className="text-on-surface-variant hover:text-on-surface p-2 rounded-lg hover:bg-surface-container-high transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
