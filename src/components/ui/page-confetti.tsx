"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ConfettiPiece {
  id: number;
  style: React.CSSProperties;
}

interface PageConfettiProps {
  active: boolean;
  duration?: number;
  particleCount?: number;
}

const colors = ["#e53935", "#1e88e5", "#43a047", "#fdd835", "#fb8c00", "#8e24aa"];

export const PageConfetti: React.FC<PageConfettiProps> = ({
  active,
  duration = 4000,
  particleCount = 50,
}) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (active) {
      const newPieces = Array.from({ length: particleCount }).map((_, index) => {
        const randomXStart = Math.random() * 100;
        const randomYEnd = 110; // Fall past the bottom of the screen
        const randomDelay = Math.random() * duration;
        const randomDuration = (duration - randomDelay) * (0.8 + Math.random() * 0.4);
        const randomSize = 8 + Math.random() * 8;
        const randomRotationStart = Math.random() * 360;
        const randomRotationEnd = randomRotationStart + (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 720);
        
        return {
          id: index,
          style: {
            '--x-start': `${randomXStart}vw`,
            '--y-end': `${randomYEnd}vh`,
            '--delay': `${randomDelay}ms`,
            '--duration': `${randomDuration}ms`,
            '--size': `${randomSize}px`,
            '--rotation-start': `${randomRotationStart}deg`,
            '--rotation-end': `${randomRotationEnd}deg`,
            background: colors[Math.floor(Math.random() * colors.length)],
            animation: `confetti-fall var(--duration) cubic-bezier(0.25, 0.46, 0.45, 0.94) var(--delay) forwards`,
            willChange: 'transform, opacity',
          } as React.CSSProperties,
        };
      });
      setPieces(newPieces);

      const timer = setTimeout(() => {
        setPieces([]);
      }, duration + 500); // Clear pieces after animation completes

      return () => clearTimeout(timer);
    }
  }, [active, duration, particleCount]);

  if (pieces.length === 0) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
    >
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute top-[-20px] left-0"
          style={piece.style}
        />
      ))}
    </div>
  );
};
