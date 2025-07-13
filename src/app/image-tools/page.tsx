
import { FeatureCard } from '@/components/feature/feature-card';
import { 
  Minimize, Expand, Crop, Image as ImageIcon, Droplets, Wand2, Type, ArrowRightLeft, ImageUp, CircleEllipsis
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Feature {
  title: string;
  description: string;
  href: string;
  Icon: LucideIcon;
  iconColor?: string; 
}

interface FeatureCategory {
  name: string;
  features: Feature[];
}

const featuresByCategory: FeatureCategory[] = [
  {
    name: 'Edit & Transform',
    features: [
      { title: 'Compress Image', description: 'Reduce file size of JPG, PNG, SVG, and GIF images without losing quality.', href: '#', Icon: Minimize, iconColor: 'text-green-500' },
      { title: 'Resize Image', description: 'Change the dimensions of your images by pixel or percentage.', href: '#', Icon: Expand, iconColor: 'text-blue-500' },
      { title: 'Crop Image', description: 'Cut your images to a specific size or ratio with our online cropper.', href: '#', Icon: Crop, iconColor: 'text-yellow-500' },
      { title: 'Circle Crop', description: 'Crop your image into a perfect circle, ideal for profile pictures.', href: '/circle-crop', Icon: CircleEllipsis, iconColor: 'text-teal-500' },
      { title: 'Image Editor', description: 'Add text, filters, stickers, or annotations to your photos.', href: '#', Icon: Wand2, iconColor: 'text-purple-500' },
      { title: 'Watermark Image', description: 'Stamp a text or image watermark over your pictures.', href: '#', Icon: Droplets, iconColor: 'text-sky-500' },
      { title: 'Remove Background', description: 'Automatically erase the background from any image with one click.', href: '/remove-background', Icon: ImageIcon, iconColor: 'text-pink-500' },
    ],
  },
  {
    name: 'Convert Images',
    features: [
      { title: 'Convert to JPG', description: 'Transform PNG, GIF, TIF, or RAW images to the JPG format.', href: '#', Icon: ArrowRightLeft, iconColor: 'text-red-500' },
      { title: 'Convert from JPG', description: 'Change JPG images to other formats like PNG or GIF.', href: '#', Icon: ArrowRightLeft, iconColor: 'text-red-600' },
      { title: 'Upscale Image', description: 'Increase the resolution of your images using AI.', href: '#', Icon: ImageUp, iconColor: 'text-indigo-500' },
      { title: 'Add Text to Image', description: 'Easily add text and captions to your photos for memes or labels.', href: '#', Icon: Type, iconColor: 'text-orange-500' },
    ],
  },
];

export default function ImageToolsPage() {
  return (
    <div className="space-y-12 md:space-y-16 pb-16">
      <section className="text-center pt-12 pb-8 md:pt-16 md:pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Online Image Tools for Every Need
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Quickly compress, resize, convert, and edit your images right in your browser. Our tools are free, fast, and secure, designed to streamline your creative workflow.
          </p>
        </div>
      </section>

      {featuresByCategory.map((category) => (
        <section key={category.name}>
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-6 md:mb-8 text-center md:text-left">
              {category.name}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {category.features.map((feature) => (
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
      ))}
    </div>
  );
}
