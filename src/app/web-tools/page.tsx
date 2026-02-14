
import { FeatureCard } from '@/components/feature/feature-card';
import {
  Globe,
  Network,
  MapPin,
  Laptop,
  Search as SearchIcon,
  Link as LinkIcon
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Feature {
  title: string;
  description: string;
  href: string;
  Icon: LucideIcon;
  iconColor?: string;
}

const webTools: Feature[] = [
    { title: "What's My IP?", description: 'Quickly find your public IP address and related information.', href: '#', Icon: Network, iconColor: 'text-blue-500' },
    { title: "What's My Location?", description: 'See your approximate geographical location based on your IP address.', href: '#', Icon: MapPin, iconColor: 'text-green-500' },
    { title: 'User Agent Finder', description: "View your browser's full user agent string and details.", href: '#', Icon: Laptop, iconColor: 'text-yellow-500' },
    { title: 'DNS Lookup', description: 'Perform DNS lookups to find records for a domain name.', href: '#', Icon: SearchIcon, iconColor: 'text-purple-500' },
    { title: 'URL Parser', description: 'Break down any URL into its constituent parts like protocol, host, and path.', href: '#', Icon: LinkIcon, iconColor: 'text-orange-500' },
];


export default function WebToolsPage() {
  return (
    <div className="space-y-12 md:space-y-16 pb-16">
      <section className="text-center pt-12 pb-8 md:pt-16 md:pb-12">
        <div className="container mx-auto px-4">
           <Globe className="mx-auto h-16 w-16 text-primary mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Web & Developer Tools
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            A collection of handy online utilities for developers, designers, and curious minds.
          </p>
        </div>
      </section>

      <section>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
            {webTools.map((feature) => (
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
