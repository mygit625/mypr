
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/navbar';
import { Toaster } from '@/components/ui/toaster';
import Footer from '@/components/layout/footer'; // Import the new Footer

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'DocuEase - Your PDF Toolkit',
  description: 'Easily merge, split, summarize, convert, and manage your PDF documents.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen bg-background`}
        suppressHydrationWarning={true}
      >
        <Navbar />
        {/* Adjusted padding for main content area to give more space if needed */}
        <main className="flex-grow container mx-auto px-4 py-6 md:py-10">
          {children}
        </main>
        <Toaster />
        <Footer /> {/* Use the new Footer component */}
      </body>
    </html>
  );
}

