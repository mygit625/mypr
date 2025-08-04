
"use client";

import React, { useState, useEffect, useMemo } from 'react';

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
    let cleanupTimer: NodeJS.Timeout;

    if (active && !isRendering) {
      setIsRendering(true);
      const newPieces = Array.from({ length: pieceCount }).map((_, index) => {
        const animationDuration = (Math.random() * 0.5 + 0.75) * (duration / 1000);
        const animationDelay = Math.random() * (duration / 1000);
        
        return {
          id: index,
          style: {
            left: `${Math.random() * 100}vw`,
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            transition: `transform ${animationDuration}s linear`,
            animation: `confetti-spin ${Math.random() * 2 + 1}s linear infinite`,
            animationDelay: `${animationDelay}s`,
          } as React.CSSProperties,
        };
      });

      setPieces(newPieces);
      
      // Use requestAnimationFrame to apply the 'fall' class after the initial render
      requestAnimationFrame(() => {
        setPieces(currentPieces =>
          currentPieces.map(p => ({
            ...p,
            style: {
              ...p.style,
              transform: `translateY(110vh) rotate(${Math.random() * 360}deg)`,
            }
          }))
        );
      });

      cleanupTimer = setTimeout(() => {
        setPieces([]);
        setIsRendering(false);
      }, duration + 1000);
    }

    return () => {
      clearTimeout(cleanupTimer);
    };
  }, [active, pieceCount, duration, colors, isRendering]);

  if (!isRendering) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 h-full z-[100] overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute top-[-20px] h-4 w-2 rounded-sm"
          style={piece.style}
        />
      ))}
    </div>
  );
};
