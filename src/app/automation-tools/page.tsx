
import { FeatureCard } from '@/components/feature/feature-card';
import { 
  Bot, Waypoints, FileJson
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Feature {
  title: string;
  description: string;
  href: string;
  Icon: LucideIcon;
  iconColor?: string; 
}

const automationTools: Feature[] = [
    { title: 'N8N Templates', description: 'Jumpstart your workflows with our library of pre-built N8N templates.', href: '#', Icon: Bot, iconColor: 'text-emerald-500' },
    { title: 'Sitemap Generator', description: 'Create an XML sitemap for your website to improve SEO.', href: '#', Icon: Waypoints, iconColor: 'text-rose-500' },
    { title: 'JSON to CSV', description: 'Convert complex JSON data into structured CSV files online.', href: '#', Icon: FileJson, iconColor: 'text-orange-500' },
];


export default function AutomationToolsPage() {
  return (
    <div className="space-y-12 md:space-y-16 pb-16">
      <section className="text-center pt-12 pb-8 md:pt-16 md:pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Automation & Developer Tools
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Streamline your repetitive tasks and boost your productivity with our suite of automation tools.
          </p>
        </div>
      </section>

      <section>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
            {automationTools.map((feature) => (
              <FeatureCard
                key={feature.title}
                title={feature.title}
                description={feature.description}
                href={feature.href}
                Icon={feature.Icon}
                iconColor={feature.iconColor}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
