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
        url: 'https://placehold.co/1200x630.png',
        width: 1200,
        height: 630,
        alt: 'Merge PDF Tool',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Merge PDF | Toolsinn',
    description: 'Combine multiple PDF documents into one single PDF file quickly and easily.',
    images: ['https://placehold.co/1200x630.png'],
  },
};

export default function MergePage() {
  return <MergeClientPage />;
}
