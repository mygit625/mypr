
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/navbar';
import { Toaster } from '@/components/ui/toaster';
import Footer from '@/components/layout/footer';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { AuthProvider } from '@/contexts/auth-context';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'DocuEase - Free Online PDF Tools & Document Utilities',
    template: '%s | DocuEase',
  },
  description: 'Your one-stop destination for free online tools. Merge, split, compress, convert, and edit PDFs, plus QR code generation, unit converters, and more.',
  keywords: ['PDF tools', 'merge PDF', 'split PDF', 'compress PDF', 'convert PDF', 'QR code generator', 'unit converter', 'online tools'],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
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
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <Navbar />
              <main className="flex-grow container mx-auto px-4 py-6 md:py-10">
                {children}
              </main>
              <Toaster />
              <Footer />
            </AuthProvider>
          </ThemeProvider>
      </body>
    </html>
  );
}
