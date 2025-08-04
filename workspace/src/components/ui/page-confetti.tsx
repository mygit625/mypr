
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ConfettiPiece {
  id: number;
  style: React.CSSProperties;
}

interface PageConfettiProps {
  active: boolean;
  pieceCount?: number;
  duration?: number;
}

export const PageConfetti: React.FC<PageConfettiProps> = ({ active, pieceCount = 150, duration = 5000 }) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [isRendering, setIsRendering] = useState(false);

  const colors = useMemo(() => ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#ff7043'], []);

  useEffect(() => {
    let renderTimer: NodeJS.Timeout;
    let cleanupTimer: NodeJS.Timeout;

    if (active && !isRendering) {
      setIsRendering(true);

      const newPieces = Array.from({ length: pieceCount }).map((_, index) => {
        const animationDuration = (Math.random() * 1 + 2) * (duration / 3000);
        
        return {
          id: index,
          style: {
            left: `${Math.random() * 100}vw`,
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            animation: `confetti-spin ${Math.random() * 2 + 1}s linear infinite`,
            transition: `transform ${animationDuration}s cubic-bezier(0.1, 0.5, 0.5, 1)`,
            transform: 'translateY(-20px)', // Start off-screen
          } as React.CSSProperties,
        };
      });

      setPieces(newPieces);

      // Allow initial render before starting the fall animation
      renderTimer = setTimeout(() => {
        setPieces(currentPieces =>
          currentPieces.map(p => ({
            ...p,
            style: {
              ...p.style,
              transform: `translateY(110vh) rotateZ(${Math.random() * 360}deg)`,
            }
          }))
        );
      }, 100);

      cleanupTimer = setTimeout(() => {
        setPieces([]);
        setIsRendering(false);
      }, duration + 1000);
    }

    return () => {
      clearTimeout(renderTimer);
      clearTimeout(cleanupTimer);
    };
  }, [active, pieceCount, duration, colors, isRendering]);

  if (!isRendering) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute top-0 h-4 w-2 rounded-sm"
          style={piece.style}
        />
      ))}
    </div>
  );
};
