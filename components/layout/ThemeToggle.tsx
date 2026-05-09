'use client';

/**
 * Theme Toggle Component
 * 
 * Switches between light and dark mode
 */

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Only run on client after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = stored || (prefersDark ? 'dark' : 'light');
    
    console.log('🎨 ThemeToggle mounted, theme:', initialTheme);
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);
  
  const toggleTheme = () => {
    console.log('🎨 Toggle theme clicked, current:', theme);
    const newTheme = theme === 'light' ? 'dark' : 'light';
    console.log('🎨 New theme:', newTheme);
    console.log('🎨 Document classes before:', document.documentElement.classList.toString());
    
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Force update the class
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    console.log('🎨 Document classes after:', document.documentElement.classList.toString());
  };
  
  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="p-2 w-9 h-9" aria-label="Loading theme toggle">
        {/* Placeholder to maintain layout */}
      </div>
    );
  }
  
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      ) : (
        <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      )}
    </button>
  );
}
