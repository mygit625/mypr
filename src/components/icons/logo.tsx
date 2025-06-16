
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

        {/* Text on right-front face: PPT */}
        <text
          x="34.5" // Adjusted for horizontal centering on the right rhombus
          y="29" // Adjusted for vertical centering
          dominantBaseline="middle"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="6.5"
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
