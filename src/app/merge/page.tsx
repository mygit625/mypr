
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
        url: `${baseUrl}/merge/og-image`, // This now points to the PNG generation route
        width: 1200,
        height: 630,
        alt: 'Merge PDF Tool Banner',
        type: 'image/png', // Specify the image type
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Merge PDF | Toolsinn',
    description: 'Combine multiple PDF documents into one single PDF file quickly and easily.',
    images: [`${baseUrl}/merge/og-image`],
  },
};

export default function MergePage() {
  return <MergeClientPage />;
}
