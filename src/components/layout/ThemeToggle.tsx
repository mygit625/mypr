
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
        className="h-6 w-6 text-orange-400"
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
        className="h-6 w-6"
    >
        <path 
            d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" 
            fill="white"
        />
        <path 
            d="M12.0001 4.00002C13.5135 4.00002 14.9394 4.43328 16.1612 5.21202C12.1818 6.55465 9.44543 10.8213 10.7881 14.8007C11.8388 18.068 14.9315 20.1034 18 20.1034C18.1755 20.1034 18.3501 20.096 18.5228 20.0815C16.593 21.2331 14.3594 21.8966 12.0001 21.8966C7.08639 21.8966 3.10352 17.9137 3.10352 12C3.10352 8.35222 5.15242 5.21495 8.0001 4.00002" 
            fill="#aaccff"
        />
        <g fill="#aaccff">
            <path d="M14.5 9.25L14.0887 10.0387L13.3 9.62739L14.0887 9.21612L14.5 8.42739L14.9113 9.21612L15.7 9.62739L14.9113 10.0387L14.5 10.8274Z" />
            <path d="M17.5 11.25L17.1953 11.8247L16.6206 11.5199L17.1953 11.2152L17.5 10.6405L17.8047 11.2152L18.3794 11.5199L17.8047 11.8247L17.5 12.3994Z" />
        </g>
    </svg>
);

export default function ThemeToggle() {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();

    useEffect(() => setMounted(true), []);

    if (!mounted) {
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
                "relative flex h-9 w-24 items-center rounded-full p-1 transition-colors duration-300",
                isDarkMode ? 'bg-blue-600' : 'bg-orange-300'
            )}
            aria-label="Toggle theme"
        >
            <div
                className={cn(
                    "absolute flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300",
                    isDarkMode ? 'translate-x-0' : 'translate-x-[3.25rem]'
                )}
            >
                {isDarkMode ? <MoonIcon /> : <SunIcon />}
            </div>
            <div className="w-full flex justify-between text-white text-xs font-bold px-2">
                 <span className={cn(isDarkMode ? 'opacity-0' : 'opacity-100')}>DAY</span>
                 <span className={cn(isDarkMode ? 'opacity-100' : 'opacity-0')}>NIGHT</span>
            </div>
        </button>
    );
}
