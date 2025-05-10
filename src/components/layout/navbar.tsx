"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/icons/logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/merge', label: 'Merge PDF' },
  { href: '/split', label: 'Split PDF' },
  { href: '/summarize', label: 'Summarize PDF' },
];

export default function Navbar() {
  const pathname = usePathname();

  const renderNavLinks = (isMobile = false) =>
    navItems.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === item.href ? "text-primary" : "text-foreground/80",
          isMobile && "block py-2 px-4 text-base"
        )}
      >
        {item.label}
      </Link>
    ));

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" aria-label="Go to homepage">
          <Logo />
        </Link>
        <nav className="hidden items-center space-x-6 md:flex">
          {renderNavLinks()}
        </nav>
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="mt-8 flex flex-col space-y-4">
                {renderNavLinks(true)}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
