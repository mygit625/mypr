"use client";

import { useState, useEffect } from 'react';

export default function ClientFooterYear() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  if (currentYear === null) {
    // Return null or a placeholder during server render / initial client render before hydration
    // Using new Date().getFullYear() directly in SSR for the fallback is generally okay for the year
    // as it changes infrequently, but null is safer to ensure client takes over.
    return null; 
  }

  return <>{currentYear}</>;
}
