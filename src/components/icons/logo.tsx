import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <div className="flex items-center gap-2" aria-label="PDFBox Logo">
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8 text-primary" // Controls size and stroke color for paths using currentColor
        {...props}
      >
        {/* Cube Outline */}
        <path
          d="M24 4L4 14V34L24 44L44 34V14L24 4Z" // Outer hexagon
          stroke="currentColor"
          strokeWidth="2.5" // Adjusted stroke width
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

        {/* Content on Faces */}
        {/* PDF on Top Face (centered on the rhombus: 24,4 to 4,14 to 24,24 to 44,14) */}
        <text
          x="24"
          y="14.5" // Adjusted Y for better centering on top face
          dominantBaseline="middle"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="7" // Adjusted font size
          fontWeight="bold"
          fill="white"
        >
          PDF
        </text>

        {/* JPG on Left-Front Face (rhombus: 4,14 to 24,24 to 4,34 to 24,44 - approx center x=14, y=24 ) */}
        {/* The text needs to appear skewed onto this face. Using a transform. */}
        <text
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="6.5" // Adjusted font size
          fontWeight="bold"
          fill="white"
          dominantBaseline="middle"
          textAnchor="middle"
          // Transform to fit the left face perspective
          // translate to center of face, rotate, then skew.
          // Approximate center of left face: x=14, y=24
          transform="matrix(0.85, 0.5, -0.35, 0.9, 10.5, 12.5)" // Fine-tuned matrix
        >
          JPG
        </text>

        {/* Excel Icon on Right-Front Face (rhombus: 44,14 to 24,24 to 44,34 to 24,44 - approx center x=34, y=24) */}
        {/* Transform to fit the right face perspective */}
        {/* Approximate center of right face: x=34, y=24 */}
        <g transform="matrix(0.85, -0.5, 0.35, 0.9, 17.5, 12.5)"> {/* Fine-tuned matrix */}
          {/* Base of the icon (white rectangle) */}
          <rect x="0" y="0" width="10" height="12" rx="0.5" ry="0.5" fill="white" transform="translate(-5, -6)"/>
          {/* Internal lines (currentColor will be primary color) */}
          <line x1="-5" y1="-2" x2="5" y2="-2" stroke="currentColor" strokeWidth="1" />
          <line x1="-5" y1="2" x2="5" y2="2" stroke="currentColor" strokeWidth="1" />
          <line x1="-1" y1="-6" x2="-1" y2="6" stroke="currentColor" strokeWidth="1" />
          {/* 'X' symbol (currentColor) */}
          <path d="M -4 -4.5 L -2 -2.5 M -2 -4.5 L -4 -2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      </svg>
      <span className="text-2xl font-bold text-primary">PDFBox</span>
    </div>
  );
}
