
"use client";

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Moon } from 'lucide-react';
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
        <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <path
            d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22"
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
        return <div className="w-[152px] h-9 rounded-full bg-muted animate-pulse" />;
    }

    const isDarkMode = theme === 'dark';

    const toggleTheme = () => {
        setTheme(isDarkMode ? 'light' : 'dark');
    };

    return (
        <button
            onClick={toggleTheme}
            className={cn(
                "relative flex h-9 w-[152px] items-center rounded-full p-1 transition-all duration-300",
                "shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]",
                isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-orange-300 to-yellow-200'
            )}
            aria-label="Toggle theme"
        >
            {/* Thumb */}
            <div
                className={cn(
                    "absolute flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/5 transition-transform duration-300 ease-in-out",
                    isDarkMode ? 'translate-x-[4px]' : 'translate-x-[118px]'
                )}
            >
                {isDarkMode ? <Moon className="h-5 w-5 text-slate-800" /> : <SunIcon />}
            </div>

            {/* Text Labels */}
            <div className="w-full flex justify-between items-center px-2 text-white font-bold text-xs">
                <span className={cn("transition-opacity duration-300 text-center text-yellow-900/80", isDarkMode ? "opacity-0" : "opacity-100")}>
                    DAY<br/>MODE
                </span>
                <span className={cn("transition-opacity duration-300 text-center text-blue-200/80", isDarkMode ? "opacity-100" : "opacity-0")}>
                    NIGHT<br/>MODE
                </span>
            </div>
        </button>
    );
}
