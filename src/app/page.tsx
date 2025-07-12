import { FeatureCard } from '@/components/feature/feature-card';
import { 
  Files, Image, QrCode, Scale, Calculator, Globe, Link as LinkIcon, BrainCircuit
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ToolCategory {
  title: string;
  description: string;
  href: string;
  Icon: LucideIcon;
  iconColor?: string;
}

const toolCategories: ToolCategory[] = [
  { title: 'PDF Tools', description: 'Merge, split, compress, convert, and manage your PDF documents.', href: '/pdf-tools', Icon: Files, iconColor: 'text-red-500' },
  { title: 'Image Tools', description: 'Resize, compress, convert, and edit your images with ease.', href: '/image-tools', Icon: Image, iconColor: 'text-blue-500' },
  { title: 'AI Cover Letter Generator', description: 'Create professional, personalized cover letters in seconds using AI.', href: '/cover-letter-generator', Icon: BrainCircuit, iconColor: 'text-cyan-500' },
  { title: 'QR Code Generator', description: 'Create custom QR codes for URLs, text, Wi-Fi, and more.', href: '/qr-code', Icon: QrCode, iconColor: 'text-green-500' },
  { title: 'Unit Converters', description: 'Quickly convert between different units of measurement.', href: '/unit-converters', Icon: Scale, iconColor: 'text-yellow-500' },
  { title: 'Device-Aware Links', description: 'Create smart links that send users to different URLs based on their device.', href: '/url-shortener', Icon: LinkIcon, iconColor: 'text-indigo-500' },
  { title: 'Calculators', description: 'Access a variety of calculators for daily use, like finance or baby gender.', href: '#', Icon: Calculator, iconColor: 'text-purple-500' },
  { title: 'Web Tools', description: 'A collection of useful web utilities for developers and designers.', href: '#', Icon: Globe, iconColor: 'text-sky-500' },
];

export default function HomePage() {
  return (
    <div className="space-y-12 md:space-y-16 pb-16">
      <section className="text-center pt-12 pb-8 md:pt-16 md:pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Free Online Tools to Make Your Life Easier
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            From PDF and image utilities to converters and calculators, DocuEase provides the tools you need to get things done, completely free.
          </p>
        </div>
      </section>

      <section>
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-6 md:mb-8 text-center">
            Explore Our Tool Categories
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
            {toolCategories.map((tool) => (
              <FeatureCard
                key={tool.title}
                title={tool.title}
                description={tool.description}
                href={tool.href}
                Icon={tool.Icon}
                iconColor={tool.iconColor}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
