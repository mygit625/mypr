
"use client";

import React, { useState, useEffect } from 'react';

interface ConfettiPiece {
  id: number;
  style: React.CSSProperties;
}

interface PageConfettiProps {
  active: boolean;
  pieceCount?: number;
}

export const PageConfetti: React.FC<PageConfettiProps> = ({ active, pieceCount = 50 }) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (active) {
      const newPieces = Array.from({ length: pieceCount }).map((_, index) => {
        const randomXStart = Math.random() * window.innerWidth;
        const randomYEnd = window.innerHeight + 100;
        const randomDuration = 2 + Math.random() * 3;
        const randomDelay = Math.random() * 2;
        const randomRotation = Math.random() * 360;
        const colors = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        return {
          id: index,
          style: {
            position: 'fixed',
            left: `${randomXStart}px`,
            top: '-20px',
            width: `${8 + Math.random() * 8}px`,
            height: `${12 + Math.random() * 12}px`,
            backgroundColor: randomColor,
            opacity: 1,
            transform: `rotate(${randomRotation}deg)`,
            transition: `transform ${randomDuration}s ease-out ${randomDelay}s, opacity ${randomDuration}s ease-in ${randomDelay}s`,
            zIndex: 9999,
          } as React.CSSProperties,
        };
      });

      setPieces(newPieces);

      // Start the animation by changing properties
      setTimeout(() => {
        setPieces(currentPieces =>
          currentPieces.map(p => ({
            ...p,
            style: {
              ...p.style,
              transform: `translateY(${randomYEnd}px) rotate(${p.style.transform.match(/(\d+)/)?.[0]}deg) rotateZ(${Math.random() * 720}deg)`,
              opacity: 0,
            },
          }))
        );
      }, 50); // Small delay to ensure styles are applied before transition starts

      // Clean up after animation
      const cleanupTimer = setTimeout(() => {
        setPieces([]);
      }, (2 + 2 + 1) * 1000); // Max duration + max delay + buffer
      
      return () => clearTimeout(cleanupTimer);

    }
  }, [active, pieceCount]);

  if (!active && pieces.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((piece) => (
        <div key={piece.id} style={piece.style} />
      ))}
    </div>
  );
};
