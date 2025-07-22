
"use client";

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const SunIcon = () => (
    <svg 
        className="w-10 h-10 text-yellow-400"
        fill="currentColor" 
        viewBox="0 0 24 24"
    >
        <path d="M12 18a6 6 0 100-12 6 6 0 000 12zM12 22a1 1 0 001-1v-2a1 1 0 10-2 0v2a1 1 0 001 1zM22 12a1 1 0 00-1-1h-2a1 1 0 100 2h2a1 1 0 001-1zM4 12a1 1 0 00-1-1H1a1 1 0 100 2h2a1 1 0 001-1zM12 4a1 1 0 001-1V1a1 1 0 10-2 0v2a1 1 0 001 1zM19.07 6.344a1 1 0 00.707-.293l1.414-1.414a1 1 0 10-1.414-1.414l-1.414 1.414a1 1 0 00.707 1.707zM3.515 20.485a1 1 0 00.707-.293l1.414-1.414a1 1 0 10-1.414-1.414L3.515 18.78a1 1 0 00.707 1.707zM20.485 20.485a1 1 0 001.414 0 1 1 0 000-1.414l-1.414-1.414a1 1 0 10-1.414 1.414l1.414 1.414zM4.929 6.344a1 1 0 001.414 0 1 1 0 000-1.414L4.929 3.515a1 1 0 10-1.414 1.414l1.414 1.414z"/>
    </svg>
);

const MoonIcon = () => (
    <svg 
        className="w-10 h-10 text-blue-400"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
);

export default function ThemeToggle() {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();

    useEffect(() => setMounted(true), []);

    if (!mounted) {
        // Render a placeholder to avoid layout shift, matching the final component's size
        return <div className="w-[180px] h-[80px] rounded-full bg-muted animate-pulse" />;
    }

    const isDarkMode = theme === 'dark';

    const toggleTheme = () => {
        setTheme(isDarkMode ? 'light' : 'dark');
    };

    return (
        <button
            onClick={toggleTheme}
            className={cn(
                "relative flex items-center w-[180px] h-[80px] rounded-full cursor-pointer overflow-hidden transition-all duration-300",
                "shadow-toggle-container"
            )}
            aria-label="Toggle theme"
        >
            {/* Background Gradient */}
            <div className={cn(
                "absolute top-0 left-0 w-full h-full rounded-full transition-opacity duration-300",
                isDarkMode ? "bg-gradient-to-r from-blue-400 to-purple-400 opacity-100" : "opacity-0"
            )}></div>
             <div className={cn(
                "absolute top-0 left-0 w-full h-full rounded-full transition-opacity duration-300",
                !isDarkMode ? "bg-gradient-to-r from-yellow-300 to-orange-400 opacity-100" : "opacity-0"
            )}></div>

            {/* Day Mode Text */}
            <div className={cn(
                "absolute left-[95px] flex flex-col items-center font-bold text-white transition-opacity duration-300 text-shadow-md",
                isDarkMode ? "opacity-0" : "opacity-100"
            )}>
                <span className="text-xl leading-none">DAY</span>
                <span className="text-xl leading-none">MODE</span>
            </div>
            
            {/* Night Mode Text */}
            <div className={cn(
                "absolute right-[95px] flex flex-col items-center font-bold text-white transition-opacity duration-300 text-shadow-md",
                isDarkMode ? "opacity-100" : "opacity-0"
            )}>
                 <span className="text-xl leading-none">NIGHT</span>
                <span className="text-xl leading-none">MODE</span>
            </div>

            {/* Sliding Circle */}
            <div
                className={cn(
                    "absolute w-[70px] h-[70px] bg-white rounded-full flex justify-center items-center transition-transform duration-300 ease-in-out shadow-toggle-circle z-10",
                    isDarkMode ? 'translate-x-[105px]' : 'translate-x-[5px]'
                )}
            >
                <div className="relative w-10 h-10 flex items-center justify-center">
                    {/* Sun Icon */}
                    <div className={cn("absolute transition-opacity duration-300", isDarkMode ? "opacity-0" : "opacity-100")}>
                        <SunIcon />
                    </div>
                    {/* Moon Icon */}
                    <div className={cn("absolute transition-opacity duration-300", isDarkMode ? "opacity-100" : "opacity-0")}>
                        <MoonIcon />
                    </div>
                </div>
            </div>
        </button>
    );
}
