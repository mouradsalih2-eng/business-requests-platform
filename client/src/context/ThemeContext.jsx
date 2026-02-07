import { createContext, useContext, useState, useEffect } from 'react';
import { users } from '../lib/api';
import { supabase } from '../lib/supabase';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    // Check localStorage first for immediate theme
    const saved = localStorage.getItem('theme');
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      return saved;
    }
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState('light');

  // Resolve system theme
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateResolvedTheme = () => {
      if (theme === 'system') {
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
      } else {
        setResolvedTheme(theme);
      }
    };

    updateResolvedTheme();
    mediaQuery.addEventListener('change', updateResolvedTheme);

    return () => mediaQuery.removeEventListener('change', updateResolvedTheme);
  }, [theme]);

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  const setTheme = async (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);

    // Try to sync with server if logged in
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await users.updateSettings({ theme_preference: newTheme });
      }
    } catch (error) {
      // Log server sync errors but don't block UI - localStorage is source of truth
      console.error('Failed to sync theme preference to server:', error);
    }
  };

  // Sync theme from server on login
  const syncThemeFromServer = (serverTheme) => {
    if (serverTheme && ['light', 'dark', 'system'].includes(serverTheme)) {
      setThemeState(serverTheme);
      localStorage.setItem('theme', serverTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, syncThemeFromServer }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
