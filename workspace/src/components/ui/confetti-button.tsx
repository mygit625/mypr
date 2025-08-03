
"use client";

import React, { useState, useEffect } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConfettiPiece {
  id: number;
  style: React.CSSProperties;
}

export const ConfettiButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ onClick, className, children, ...props }, ref) => {
    const [isConfettiActive, setIsConfettiActive] = useState(false);
    const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);

    useEffect(() => {
      // Trigger confetti on mount (when the button first appears)
      setIsConfettiActive(true);
      const timer = setTimeout(() => setIsConfettiActive(false), 1000);
      return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
      if (isConfettiActive) {
        const newPieces = Array.from({ length: 20 }).map((_, index) => {
          const randomX = Math.random() * 100;
          const randomDelay = Math.random() * 0.5;
          const randomDuration = 0.5 + Math.random() * 0.5;
          const colors = ['#FFC700', '#FF0000', '#2E86C1', '#2ECC71'];
          const randomColor = colors[Math.floor(Math.random() * colors.length)];

          return {
            id: index,
            style: {
              left: `${randomX}%`,
              animationDelay: `${randomDelay}s`,
              animationDuration: `${randomDuration}s`,
              backgroundColor: randomColor,
            },
          };
        });
        setConfettiPieces(newPieces);
      } else {
        setConfettiPieces([]);
      }
    }, [isConfettiActive]);
    
    const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // You can re-trigger confetti on click if desired
      // setIsConfettiActive(true);
      // setTimeout(() => setIsConfettiActive(false), 1000);
      if (onClick) {
        onClick(e);
      }
    };

    return (
      <Button
        ref={ref}
        onClick={handleButtonClick}
        className={cn("relative overflow-hidden bg-green-600 hover:bg-green-700 text-white", className)}
        {...props}
      >
        <span className="z-10">{children}</span>
        {confettiPieces.map((piece) => (
          <div key={piece.id} className="confetti-piece" style={piece.style} />
        ))}
      </Button>
    );
  }
);

ConfettiButton.displayName = 'ConfettiButton';
