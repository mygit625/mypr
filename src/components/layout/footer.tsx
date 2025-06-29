import Link from 'next/link';
import { Logo } from '@/components/icons/logo';
import ClientFooterYear from '@/components/layout/client-footer-year';
import { Button } from '@/components/ui/button';
import { Github, Twitter, Linkedin, Globe } from 'lucide-react';

const footerSections = [
  {
    title: 'ToolsInn',
    links: [
      { label: 'Home', href: '/' },
      { label: 'PDF Tools', href: '/pdf-tools' },
      { label: 'About Us', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
  {
    title: 'Product',
    links: [
      { label: 'Merge PDF', href: '/merge' },
      { label: 'Split PDF', href: '/split' },
      { label: 'Summarize PDF', href: '/summarize' },
      { label: 'Pricing', href: '#' },
      { label: 'Features', href: '#' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'Business', href: '#' },
      { label: 'Education', href: '#' },
      { label: 'Developers', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Our Story', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Legal & Privacy', href: '#' },
    ],
  },
];

const socialLinks = [
  { label: 'GitHub', Icon: Github, href: '#' },
  { label: 'Twitter', Icon: Twitter, href: '#' },
  { label: 'LinkedIn', Icon: Linkedin, href: '#' },
];

export default function Footer() {
  return (
    <footer className="bg-card border-t">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-8 lg:mb-0">
            <Link href="/" className="inline-block mb-4">
              <Logo />
            </Link>
            <p className="text-sm text-muted-foreground">
              Making daily tasks simple and accessible for everyone.
            </p>
          </div>
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-md font-semibold text-foreground mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground mb-4 md:mb-0">
            © <ClientFooterYear /> ToolsInn. All rights reserved.
          </p>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              <Globe className="h-4 w-4 mr-2" />
              English
            </Button>
            <div className="flex space-x-2">
              {socialLinks.map((social) => (
                <Link key={social.label} href={social.href} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" aria-label={social.label} className="text-muted-foreground hover:text-primary">
                    <social.Icon className="h-5 w-5" />
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
