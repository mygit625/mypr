"use client";

import { useState, useEffect } from 'react';

export default function ClientFooterYear() {
  const [year, setYear] = useState<number | string>("..."); // Initial placeholder

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []); // Empty dependency array ensures this runs once on mount (client-side)

  return <>{year}</>;
}
