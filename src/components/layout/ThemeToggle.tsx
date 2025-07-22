"use client";

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

// Custom Sun Icon Component to match the design
const SunIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="4" stroke="#FBBF24" strokeWidth="2"/>
    <path d="M12 2V4" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 20V22" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
    <path d="M5.63604 5.63604L7.05025 7.05025" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16.9497 16.9497L18.364 18.364" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
    <path d="M2 12H4" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
    <path d="M20 12H22" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
    <path d="M5.63604 18.364L7.05025 16.9497" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16.9497 7.05025L18.364 5.63604" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Custom Moon Icon Component to match the design
const MoonIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.5,18.5 C14.2862915,18.5 11.5,15.7137085 11.5,12.5 C11.5,9.2862915 14.2862915,6.5 17.5,6.5 C18.1511252,6.5 18.781356,6.60105153 19.367243,6.78680931 C18.1611083,5.65862367 16.4851219,5 14.65,5 C10.4395911,5 7,8.43959111 7,12.65 C7,16.8604089 10.4395911,20.3 14.65,20.3 C16.4851219,20.3 18.1611083,19.6413763 19.367243,18.5131907 C18.781356,18.6989485 18.1511252,18.5 17.5,18.5 Z" stroke="#67E8F9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 9L18 8L17 7L16 8L17 9Z" fill="#67E8F9"/>
    <path d="M14 13L15 12L14 11L13 12L14 13Z" fill="#67E8F9"/>
  </svg>
);


export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Render a placeholder to avoid layout shift, matching the final component's size
    return <div className="w-48 h-[4.5rem] rounded-full bg-muted animate-pulse" />;
  }

  const isDarkMode = theme === 'dark';

  const toggleTheme = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative flex items-center w-48 h-[4.5rem] rounded-full p-2 cursor-pointer transition-all duration-500 shadow-lg",
        // Gradient backgrounds
        isDarkMode 
          ? 'bg-gradient-to-br from-blue-700 to-sky-400' 
          : 'bg-gradient-to-br from-amber-500 to-yellow-300',
        // Inset shadow for 3D track effect
        'shadow-inner shadow-black/20'
      )}
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
    >
      {/* Sliding Thumb */}
      <div
        className={cn(
          "absolute h-14 w-14 rounded-full flex items-center justify-center transition-transform duration-500 ease-in-out",
          "bg-white/90 backdrop-blur-sm shadow-md border-2 border-white/30",
          isDarkMode ? 'translate-x-0' : 'translate-x-[6.25rem]'
        )}
      >
        {isDarkMode ? <MoonIcon /> : <SunIcon />}
      </div>

      {/* Text Labels Container */}
      <div className="w-full flex justify-between items-center px-1">
        {/* Day Mode Text */}
        <div className={cn(
            "text-white font-bold text-sm text-center transition-opacity duration-300",
            isDarkMode ? 'opacity-0' : 'opacity-100'
        )}>
          <span>DAY</span><br/><span>MODE</span>
        </div>
        
        {/* Night Mode Text */}
         <div className={cn(
            "text-white font-bold text-sm text-center transition-opacity duration-300",
            isDarkMode ? 'opacity-100' : 'opacity-0'
        )}>
          <span>NIGHT</span><br/><span>MODE</span>
        </div>
      </div>
    </button>
  );
}
