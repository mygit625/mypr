import type { Metadata } from 'next';
import MergeClientPage from './MergeClientPage';

export const metadata: Metadata = {
  title: 'Merge PDF',
  description: 'Combine multiple PDF documents into one single PDF file quickly and easily. Drag and drop to reorder your files before merging.',
  openGraph: {
    title: 'Merge PDF | Toolsinn',
    description: 'Combine multiple PDF documents into one single PDF file quickly and easily.',
    images: [
      {
        url: '/merge/og-image', // Pointing to the new SVG image route
        width: 1200,
        height: 630,
        alt: 'Merge PDF Tool Banner',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Merge PDF | Toolsinn',
    description: 'Combine multiple PDF documents into one single PDF file quickly and easily.',
    images: ['/merge/og-image'], // Pointing to the new SVG image route
  },
};

export default function MergePage() {
  return <MergeClientPage />;
}
