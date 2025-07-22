
"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from 'lucide-react';
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // We need to wait for the component to mount to know the current theme.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Render a placeholder or nothing until mounted
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
        "relative inline-flex items-center h-9 w-36 rounded-full transition-colors duration-300 ease-in-out shadow-inner focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
        isDarkMode ? "bg-gradient-to-r from-sky-500 to-blue-700" : "bg-gradient-to-r from-pink-400 to-orange-400"
      )}
      aria-label={isDarkMode ? "Activate light mode" : "Activate dark mode"}
    >
      <span className="sr-only">Toggle theme</span>
      
      {/* Text Container */}
      <div className="flex justify-between w-full px-4 text-white font-bold text-xs tracking-wider">
        <span className={cn("transition-opacity duration-300", isDarkMode ? "opacity-100" : "opacity-0")}>
          NIGHT MODE
        </span>
        <span className={cn("transition-opacity duration-300", isDarkMode ? "opacity-0" : "opacity-100")}>
          DAY MODE
        </span>
      </div>

      {/* Sliding Circle */}
      <span
        className={cn(
          "absolute top-1 left-1 flex items-center justify-center h-7 w-7 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-in-out",
          isDarkMode ? "translate-x-0" : "translate-x-[6.75rem]" // 108px = 27 * 4px (w-36 - w-7 - p-1*2)
        )}
      >
        {isDarkMode ? (
          <Moon className="h-4 w-4 text-sky-500" />
        ) : (
          <Sun className="h-4 w-4 text-yellow-500" />
        )}
      </span>
    </button>
  );
}
