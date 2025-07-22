
"use client";

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const SunIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6 text-yellow-500"
  >
    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
    <path
      d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MoonIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6 text-blue-300"
  >
    <path
      d="M11.5 2.5C5.1 2.5 1.5 8.1 3.5 14C5.5 20 12 22.5 17.5 20C20.5 18.5 22.5 15.5 22.5 12C22.5 6.5 17.5 2.5 11.5 2.5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 5L17.5 8L16 11"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19 6L20 8L19 10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Render a placeholder to avoid layout shift, matching the final component's size
    return <div className="w-36 h-9 rounded-full bg-muted animate-pulse" />;
  }

  const isDarkMode = theme === 'dark';

  const toggleTheme = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative flex h-9 w-36 items-center rounded-full p-1 transition-all duration-300 ease-in-out shadow-inner",
        isDarkMode
          ? 'bg-gradient-to-br from-blue-700 to-blue-900 shadow-slate-900/50'
          : 'bg-gradient-to-br from-yellow-400 to-orange-400 shadow-slate-400/30'
      )}
      aria-label="Toggle theme"
    >
      {/* Sliding Circle */}
      <div
        className={cn(
          "absolute flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out",
          isDarkMode ? "translate-x-0" : "translate-x-[6.75rem]"
        )}
      >
        {isDarkMode ? <MoonIcon /> : <SunIcon />}
      </div>

      {/* Text Labels */}
      <div className="flex w-full justify-between items-center px-2">
        <span className={cn(
          "text-xs font-bold text-white transition-opacity duration-300",
          isDarkMode ? 'opacity-0' : 'opacity-100'
        )}>
          DAY MODE
        </span>
        <span className={cn(
          "text-xs font-bold text-white transition-opacity duration-300",
          isDarkMode ? 'opacity-100' : 'opacity-0'
        )}>
          NIGHT MODE
        </span>
      </div>
    </button>
  );
}
