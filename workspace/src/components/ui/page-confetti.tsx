
"use client";

import React, { useState, useEffect, useMemo } from 'react';

interface ConfettiPiece {
  id: number;
  style: React.CSSProperties;
  shape: 'rect' | 'triangle';
}

interface PageConfettiProps {
  active: boolean;
  pieceCount?: number;
  duration?: number; // duration of the fall in seconds
}

export const PageConfetti: React.FC<PageConfettiProps> = ({ active, pieceCount = 150, duration = 5 }) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [isRendering, setIsRendering] = useState(false);

  // Memoize colors to prevent re-calculation on every render
  const colors = useMemo(() => ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#ff7043'], []);

  useEffect(() => {
    let cleanupTimer: NodeJS.Timeout;

    if (active && !isRendering) {
      setIsRendering(true);
      const newPieces = Array.from({ length: pieceCount }).map((_, index) => {
        const fallDuration = (duration * 0.8 + Math.random() * duration * 0.4); // 4s to 6s for a 5s duration
        const fallDelay = Math.random() * duration * 0.5; // Stagger the start
        const randomXStart = Math.random() * 100; // vw
        const randomXEnd = Math.random() * 100; // vw
        const sway = Math.random() * 200 - 100; // vw sway
        const rotationSpeed = 0.5 + Math.random(); // rotations per second

        return {
          id: index,
          shape: Math.random() > 0.3 ? 'rect' : 'triangle',
          style: {
            '--start-x': `${randomXStart}vw`,
            '--end-x': `${randomXEnd}vw`,
            '--sway': `${sway}vw`,
            '--rotation-speed': `${rotationSpeed}s`,
            animation: `confetti-fall ${fallDuration}s linear ${fallDelay}s forwards`,
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
          } as React.CSSProperties,
        };
      });

      setPieces(newPieces);

      cleanupTimer = setTimeout(() => {
        setPieces([]);
        setIsRendering(false);
      }, (duration + 1) * 1000); // Wait for the longest animation to finish + buffer
    }

    return () => {
      clearTimeout(cleanupTimer);
    };
  }, [active, pieceCount, duration, colors, isRendering]);

  if (!isRendering) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {pieces.map((piece) => {
        if (piece.shape === 'triangle') {
          return (
             <div
              key={piece.id}
              className="absolute top-[-20px]"
              style={{
                left: `var(--start-x)`,
                width: 0,
                height: 0,
                borderLeft: '7px solid transparent',
                borderRight: '7px solid transparent',
                borderBottom: `14px solid ${piece.style.backgroundColor}`,
                animation: piece.style.animation,
              }}
            />
          )
        }
        return (
          <div
            key={piece.id}
            className="absolute top-[-20px] h-4 w-2"
            style={piece.style}
          />
        );
      })}
    </div>
  );
};
