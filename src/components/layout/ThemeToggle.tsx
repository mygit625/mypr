
"use client";

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

// Custom Sun Icon Component
const SunIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="6" fill="#FBBF24"/>
    <path d="M12 1V3" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 21V23" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4.22 4.22L5.64 5.64" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18.36 18.36L19.78 19.78" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
    <path d="M1 12H3" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
    <path d="M21 12H23" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4.22 19.78L5.64 18.36" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18.36 5.64L19.78 4.22" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Custom Moon Icon Component
const MoonIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.5 2.5C10.0817 2.5 6.5 6.08172 6.5 10.5C6.5 14.9183 10.0817 18.5 14.5 18.5C15.8953 18.5 17.2033 18.1537 18.3635 17.5458C17.7383 18.9953 16.2513 20 14.5 20C10.3579 20 7 16.6421 7 12.5C7 8.35786 10.3579 5 14.5 5C16.2513 5 17.7383 6.00473 18.3635 7.45421C17.2033 6.84632 15.8953 6.5 14.5 6.5C10.3579 6.5 7 9.85786 7 14C7 14.4133 7.02284 14.8194 7.0667 15.2154C7.50291 10.5393 10.6133 7 14.5 7C14.5 2.5 14.5 2.5 14.5 2.5Z" fill="#67E8F9"/>
    <path d="M16 8L16.5 7.5L16 7L15.5 7.5L16 8Z" fill="#FFFFFF"/>
    <path d="M20 13L20.5 12.5L20 12L19.5 12.5L20 13Z" fill="#FFFFFF"/>
  </svg>
);


export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Render a placeholder to avoid layout shift, matching the final component's size.
    return <div className="w-[180px] h-[48px] rounded-full bg-muted animate-pulse" />;
  }

  const isDarkMode = theme === 'dark';

  const toggleTheme = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative flex items-center w-[180px] h-[48px] rounded-full p-1 cursor-pointer transition-all duration-300 shadow-md",
        "bg-gray-200" // A neutral base for the shadow
      )}
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
    >
      {/* 3D Recessed Track */}
      <div className={cn(
        "absolute inset-[3px] rounded-full transition-all duration-300",
        "shadow-[inset_0px_2px_4px_rgba(0,0,0,0.2)]", // Inner shadow for 3D effect
        isDarkMode ? 'bg-gradient-to-r from-blue-500 to-indigo-700' : 'bg-gradient-to-r from-pink-400 to-orange-400'
      )} />

      {/* Sliding Thumb */}
      <div
        className={cn(
          "absolute top-[3px] left-[3px] h-[42px] w-[42px] rounded-full flex items-center justify-center transition-transform duration-300 ease-in-out",
          "bg-white shadow-lg",
          "border-2 border-white/50",
          isDarkMode ? 'translate-x-0' : 'translate-x-[130px]'
        )}
      >
        {/* Sun Icon (visible in light mode) */}
        <div className={cn("transition-opacity duration-200", isDarkMode ? 'opacity-0' : 'opacity-100')}>
            <SunIcon />
        </div>
        {/* Moon Icon (visible in dark mode) */}
         <div className={cn("absolute transition-opacity duration-200", isDarkMode ? 'opacity-100' : 'opacity-0')}>
            <MoonIcon />
        </div>
      </div>

      {/* Text Labels */}
      <div className="relative w-full h-full flex items-center justify-between px-5">
        <span className={cn(
            "text-white font-bold text-sm transition-opacity duration-300",
            isDarkMode ? 'opacity-100' : 'opacity-0'
        )}>
          NIGHT MODE
        </span>
        <span className={cn(
            "text-white font-bold text-sm transition-opacity duration-300",
            isDarkMode ? 'opacity-0' : 'opacity-100'
        )}>
          DAY MODE
        </span>
      </div>
    </button>
  );
}
