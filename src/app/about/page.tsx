
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Target, Rocket, ShieldCheck, Heart, Lightbulb, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about the mission, values, and team behind ToolsInn. We are dedicated to providing simple, free, and secure online tools for everyone.',
};

const teamMembers = [
  {
    name: 'John Doe',
    role: 'Founder & CEO',
    avatar: 'https://placehold.co/128x128.png',
    'data-ai-hint': 'man portrait',
  },
  {
    name: 'Jane Smith',
    role: 'Lead Developer',
    avatar: 'https://placehold.co/128x128.png',
    'data-ai-hint': 'woman engineer',
  },
  {
    name: 'Emily White',
    role: 'UX/UI Designer',
    avatar: 'https://placehold.co/128x128.png',
    'data-ai-hint': 'woman designer',
  },
  {
    name: 'Michael Brown',
    role: 'Marketing Specialist',
    avatar: 'https://placehold.co/128x128.png',
    'data-ai-hint': 'man smiling',
  },
];

const values = [
    {
        Icon: ShieldCheck,
        title: "Privacy First",
        description: "We believe your data is your own. We design our tools to be stateless, processing your files in-browser or deleting them from our servers within an hour. We will never sell your data."
    },
    {
        Icon: Heart,
        title: "Simplicity by Design",
        description: "Complexity is the enemy of productivity. Every tool we build is designed to be intuitive, clean, and easy to use, requiring no special knowledge or training."
    },
    {
        Icon: Rocket,
        title: "Accessibility for All",
        description: "Our tools are free and accessible to everyone, anywhere in the world. We are committed to breaking down barriers and providing universal access to helpful utilities."
    },
    {
        Icon: Lightbulb,
        title: "Continuous Innovation",
        description: "We are constantly exploring new technologies and listening to user feedback to improve our existing tools and create new ones that solve real-world problems."
    }
]

export default function AboutPage() {
  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section */}
      <section className="text-center pt-12">
        <Users className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">About ToolsInn</h1>
        <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          We're a passionate team dedicated to building simple, powerful, and free utilities for everyone.
        </p>
      </section>

      {/* Mission & Story Section */}
      <section className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-semibold">Our Mission</h2>
          </div>
          <p className="text-muted-foreground text-lg leading-relaxed">
            To make everyday digital tasks simpler and more accessible. We believe that everyone should have access to high-quality tools without the burden of expensive subscriptions or privacy concerns. Our goal is to create a single, reliable destination for all your utility needs.
          </p>
        </div>
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2">
            <Rocket className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-semibold">Our Story</h2>
          </div>
          <p className="text-muted-foreground text-lg leading-relaxed">
            ToolsInn started from a simple frustration: why are basic tools like PDF merging or image conversion so often locked behind paywalls or cluttered with ads? We decided to build the tools we wanted to use—ones that are fast, free, and respect user privacy. What began as a small project has grown into a suite of utilities used by thousands worldwide.
          </p>
        </div>
      </section>

       {/* Our Values Section */}
      <section className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">Our Core Values</h2>
          <p className="mt-2 text-muted-foreground">The principles that guide everything we do.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map(value => (
                <div key={value.title} className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="bg-primary/10 p-4 rounded-full">
                            <value.Icon className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <h3 className="text-xl font-semibold">{value.title}</h3>
                    <p className="mt-2 text-muted-foreground">{value.description}</p>
                </div>
            ))}
        </div>
      </section>


      {/* Team Section */}
      <section className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">Meet the Team</h2>
          <p className="mt-2 text-muted-foreground">The people behind the tools.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {teamMembers.map((member) => (
            <div key={member.name} className="text-center space-y-3">
              <Avatar className="h-32 w-32 mx-auto shadow-lg">
                <AvatarImage src={member.avatar} alt={`Photo of ${member.name}`} data-ai-hint={member['data-ai-hint']} />
                <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{member.name}</h3>
                <p className="text-primary">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-3xl mx-auto">
        <Card className="bg-primary/5 border-primary/20 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Ready to Simplify Your Tasks?</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              Explore our full suite of tools and discover how much easier your daily digital life can be.
            </p>
            <Button asChild size="lg">
              <Link href="/pdf-tools">
                Explore All Tools <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
