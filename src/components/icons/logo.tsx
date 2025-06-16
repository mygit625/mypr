
import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <div className="flex items-center gap-2" aria-label="PDFBox Logo">
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-10 w-10 text-primary" // Size of the SVG icon
        {...props}
      >
        {/* Cube Outline */}
        <path
          d="M24 4 L4 14 V34 L24 44 L44 34 V14 L24 4Z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M4 14L24 24"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M24 44L24 24"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M44 14L24 24"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Text on top face: PDF */}
        <text
          x="24"
          y="14.5" // Adjusted for vertical centering on the top rhombus
          dominantBaseline="middle"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="7.5"
          fontWeight="bold"
          fill="hsl(var(--primary-foreground))"
        >
          PDF
        </text>

        {/* Text on left-front face: JPG */}
        <text
          x="13.5" // Adjusted for horizontal centering on the left rhombus
          y="29" // Adjusted for vertical centering
          dominantBaseline="middle"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="6.5"
          fontWeight="bold"
          fill="hsl(var(--primary-foreground))"
        >
          JPG
        </text>

        {/* Excel-like icon on right-front face */}
        <g transform="translate(34.5, 29.5)"> {/* Centering the icon group */}
          {/* Background sheet for Excel icon */}
          <rect 
            x="-4" 
            y="-5" 
            width="8" 
            height="10" 
            rx="1" 
            fill="hsl(var(--primary-foreground))"
          />
          {/* 'X' Mark */}
          <line 
            x1="-3" y1="-3.5" 
            x2="0" y2="-0.5" 
            stroke="currentColor" 
            strokeWidth="1.2" 
            strokeLinecap="round"
          />
          <line 
            x1="0" y1="-3.5" 
            x2="-3" y2="-0.5" 
            stroke="currentColor" 
            strokeWidth="1.2" 
            strokeLinecap="round"
          />
          {/* Horizontal Bars */}
          <rect x="1" y="-3" width="2.5" height="1.2" fill="currentColor"/>
          <rect x="1" y="-0.8" width="2.5" height="1.2" fill="currentColor"/>
          <rect x="1" y="1.4" width="2.5" height="1.2" fill="currentColor"/>
        </g>
      </svg>
      <span className="text-2xl font-bold text-primary">PDFBox</span>
    </div>
  );
}
