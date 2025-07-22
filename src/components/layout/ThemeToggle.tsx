
"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from 'lucide-react';
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Render a placeholder to avoid layout shift, matching the final component's size
    return <div className="w-24 h-9 rounded-full bg-muted animate-pulse" />;
  }

  const isDarkMode = theme === 'dark';

  const toggleTheme = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex items-center h-9 w-24 rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
        "shadow-inner bg-gray-200" // Base background with inner shadow
      )}
      aria-label={isDarkMode ? "Activate light mode" : "Activate dark mode"}
    >
      <span className="sr-only">Toggle theme</span>
      
      {/* Gradient Background Layer */}
      <div className={cn(
        "absolute inset-0 rounded-full transition-opacity duration-500",
        isDarkMode ? "bg-gradient-to-r from-sky-500 to-blue-700" : "bg-gradient-to-r from-pink-400 to-orange-400",
        "opacity-100"
      )}></div>

      {/* Sliding Circle with Text and Icon */}
      <div
        className={cn(
          "absolute top-1 left-1 flex items-center justify-center h-7 w-14 rounded-full bg-white shadow-md transform transition-transform duration-500 ease-in-out",
          isDarkMode ? "translate-x-[2.25rem]" : "translate-x-0"
        )}
      >
        <div className="relative flex items-center justify-center w-full h-full">
            {/* Day Content */}
            <div className={cn("absolute flex items-center justify-center gap-1 transition-opacity duration-500", isDarkMode ? "opacity-0" : "opacity-100")}>
                <Sun className="h-4 w-4 text-yellow-500" />
                <span className="font-bold text-[10px] text-gray-600 tracking-widest uppercase">DAY</span>
            </div>
            {/* Night Content */}
            <div className={cn("absolute flex items-center justify-center gap-1 transition-opacity duration-500", isDarkMode ? "opacity-100" : "opacity-0")}>
                <Moon className="h-4 w-4 text-sky-500" />
                <span className="font-bold text-[10px] text-gray-600 tracking-widest uppercase">NIGHT</span>
            </div>
        </div>
      </div>
    </button>
  );
}
