
import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <div className="flex items-center gap-2" aria-label="PDFBox Logo">
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-10 w-10 text-primary" // Increased size
        {...props}
      >
        {/* Cube Outline */}
        <path
          d="M24 4L4 14V34L24 44L44 34V14L24 4Z" // Outer hexagon
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M4 14L24 24" // Line from top-left to center
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M24 44L24 24" // Line from bottom-center to center
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M44 14L24 24" // Line from top-right to center
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Text on faces - fill with primary-foreground for contrast */}
        {/* Top face: PDF */}
        <text
          x="24"
          y="15" // Adjusted y for better centering on top rhombus
          dominantBaseline="middle"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="7" // Font size for top face
          fontWeight="bold"
          fill="hsl(var(--primary-foreground))"
        >
          PDF
        </text>

        {/* Left-front face: JPG */}
        {/* Centered on the approximate middle of the left face's visible area */}
        <text
          x="14"
          y="24" // Adjusted y to be center of side face height
          dominantBaseline="middle"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="6" // Slightly smaller font for side faces
          fontWeight="bold"
          fill="hsl(var(--primary-foreground))"
        >
          JPG
        </text>

        {/* Right-front face: PPT */}
        {/* Centered on the approximate middle of the right face's visible area */}
        <text
          x="34"
          y="24" // Adjusted y to be center of side face height
          dominantBaseline="middle"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="6" // Slightly smaller font for side faces
          fontWeight="bold"
          fill="hsl(var(--primary-foreground))"
        >
          PPT
        </text>
      </svg>
      <span className="text-2xl font-bold text-primary">PDFBox</span>
    </div>
  );
}
