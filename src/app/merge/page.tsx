
import type { Metadata } from 'next';
import MergeClientPage from './MergeClientPage';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://toolsinn.com';

export const metadata: Metadata = {
  title: 'Merge PDF',
  description: 'Combine multiple PDF documents into one single PDF file quickly and easily. Drag and drop to reorder your files before merging.',
  openGraph: {
    title: 'Merge PDF | Toolsinn',
    description: 'Combine multiple PDF documents into one single PDF file quickly and easily.',
    images: [
      {
        url: `https://placehold.co/1200x630.png`, // Using a placeholder that you can replace from an admin panel later
        width: 1200,
        height: 630,
        alt: 'Merge PDF Tool Banner',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Merge PDF | Toolsinn',
    description: 'Combine multiple PDF documents into one single PDF file quickly and easily.',
    images: [`https://placehold.co/1200x630.png`], // Using a placeholder that you can replace from an admin panel later
  },
};

export default function MergePage() {
  return <MergeClientPage />;
}
