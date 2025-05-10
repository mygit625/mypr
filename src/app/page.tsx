import { FeatureCard } from '@/components/feature/feature-card';
import { Combine, SplitSquareHorizontal, FileText, Zap } from 'lucide-react';

export default function HomePage() {
  const features = [
    {
      title: 'Merge PDFs',
      description: 'Combine multiple PDF files into a single, organized document quickly and easily.',
      href: '/merge',
      Icon: Combine,
    },
    {
      title: 'Split PDF',
      description: 'Divide a large PDF into smaller files, extract specific pages, or manage your documents efficiently.',
      href: '/split',
      Icon: SplitSquareHorizontal,
    },
    {
      title: 'Summarize PDF',
      description: 'Leverage AI to get a concise summary of your PDF content, saving you time and effort.',
      href: '/summarize',
      Icon: FileText,
    },
  ];

  return (
    <div className="space-y-12">
      <section className="text-center py-12 bg-card rounded-lg shadow-md">
        <div className="container mx-auto px-4">
          <Zap className="mx-auto h-16 w-16 text-primary mb-6" />
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-primary">
            Welcome to DocuEase
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Your all-in-one solution for managing PDF documents. Merge, split, or summarize your PDFs with just a few clicks.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-3xl font-semibold tracking-tight text-center mb-10">Our Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
              href={feature.href}
              Icon={feature.Icon}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
