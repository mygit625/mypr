
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
            d="M12.1 2.8415C6.42004 3.3415 2.38004 8.4415 4.02004 13.9115C5.66004 19.3815 11.51 22.4615 16.98 20.8215C22.45 19.1815 25.53 13.3315 23.89 7.8615C23.3615 5.99251 22.251 4.34141 20.78 3.2215C18.2 1.3015 14.88 1.8315 12.1 2.8415Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M17.5 5.5L16 4M17.5 5.5L19 4M17.5 5.5L16 7M17.5 5.5L19 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M20.5 9.5L19 8M20.5 9.5L22 8M20.5 9.5L19 11M20.5 9.5L22 11"
            stroke="currentColor"
            strokeWidth="1.5"
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
