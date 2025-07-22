
"use client";

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

// Custom Sun Icon with gradient
const SunIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sunGradient" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFD60A"/>
        <stop offset="1" stopColor="#FF9F1C"/>
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="5" fill="url(#sunGradient)"/>
    <path d="M12 1V3" stroke="url(#sunGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 21V23" stroke="url(#sunGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4.22 4.22L5.64 5.64" stroke="url(#sunGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.36 18.36L19.78 19.78" stroke="url(#sunGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1 12H3" stroke="url(#sunGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 12H23" stroke="url(#sunGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4.22 19.78L5.64 18.36" stroke="url(#sunGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.36 5.64L19.78 4.22" stroke="url(#sunGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Custom Moon Icon with stars
const MoonIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" fill="#E0E7FF"/>
    <path d="M15 5L15.3536 4.64645L15 4.29289L14.6464 4.64645L15 5ZM14.5 4V4.5H15V4H14.5ZM15.5 4H15V4.5H15.5V4ZM15.5 6V5.5H15V6H15.5ZM14.5 6H15V5.5H14.5V6Z" fill="#FFFFFF" stroke="#E0E7FF" strokeWidth="1"/>
    <path d="M18 9L18.1768 8.82322L18 8.64645L17.8232 8.82322L18 9ZM17.75 8.75V8.92678H17.8232L17.9268 8.82322L17.75 8.75ZM18.25 8.75L18.0732 8.82322L18 8.92678H18.25V8.75ZM18.25 9.25V9.07322H18.1768L18.0732 9.17678L18.25 9.25ZM17.75 9.25L17.9268 9.17678L18 9.07322H17.75V9.25Z" fill="#FFFFFF" stroke="#E0E7FF" strokeWidth="0.5"/>
  </svg>
);

export function ThemeToggle() {
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
        "relative flex items-center h-9 w-36 rounded-full p-1 cursor-pointer transition-all duration-500 ease-in-out shadow-inner",
        // Inner shadow for 3D effect
        "shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]",
        // Background gradient transition
        isDarkMode 
          ? 'bg-gradient-to-r from-[#4F46E5] to-[#2E1065]' 
          : 'bg-gradient-to-r from-[#FBCFE8] to-[#FDE68A]'
      )}
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
    >
      {/* Sliding Circle */}
      <div
        className={cn(
          "absolute h-7 w-7 rounded-full flex items-center justify-center transition-transform duration-500 ease-in-out transform-gpu",
          // 3D effect for the slider
          "shadow-lg",
          // Gradient on the slider
          isDarkMode 
            ? 'bg-gradient-to-br from-indigo-400 to-indigo-600'
            : 'bg-gradient-to-br from-amber-200 to-orange-400',
          // Position
          isDarkMode ? 'translate-x-1' : 'translate-x-[6.75rem]'
        )}
        style={{ perspective: '500px' }}
      >
        {/* Rotating Icon Container */}
        <div 
          className="relative w-full h-full transition-transform duration-500 ease-in-out"
          style={{ transformStyle: 'preserve-3d', transform: isDarkMode ? 'rotateY(0deg)' : 'rotateY(180deg)' }}
        >
          {/* Moon Icon (Front face when dark) */}
          <div className="absolute w-full h-full backface-hidden flex items-center justify-center">
            <MoonIcon />
          </div>
          {/* Sun Icon (Back face, revealed on rotate) */}
          <div className="absolute w-full h-full backface-hidden flex items-center justify-center" style={{ transform: 'rotateY(180deg)' }}>
            <SunIcon />
          </div>
        </div>
      </div>
      
      {/* Day Mode Text */}
      <span className={cn(
        "absolute left-4 text-white text-[10px] font-bold tracking-wider transition-opacity duration-300",
        isDarkMode ? 'opacity-50' : 'opacity-100'
      )}>
        DAY MODE
      </span>
      
      {/* Night Mode Text */}
      <span className={cn(
        "absolute right-2 text-white text-[10px] font-bold tracking-wider transition-opacity duration-300",
         isDarkMode ? 'opacity-100' : 'opacity-50'
      )}>
        NIGHT MODE
      </span>
    </button>
  );
}
