import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

type Theme = 'dark' | 'light' | 'intimate';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Theme Provider Context
 * Purpose:
 * - Manages application styling modes: dark, light, or intimate (warm rose/gold).
 * - Binds CSS attributes to root DOM elements.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('ourspace-theme');
    return (saved as Theme) || 'light';
  });

  const firstRender = useRef(true);

  useEffect(() => {
    const root = window.document.documentElement;
    let timer: number | undefined;
    if (!firstRender.current) {
      root.classList.add('theme-transition');
      timer = window.setTimeout(() => root.classList.remove('theme-transition'), 450);
    }
    firstRender.current = false;
    root.classList.remove('light', 'dark', 'intimate');
    root.classList.add(theme);
    localStorage.setItem('ourspace-theme', theme);
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
