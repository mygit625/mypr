
"use client";

import Link from 'next/link';
import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, LayoutGrid, Files, Scale, Settings, QrCode, Link as LinkIcon } from 'lucide-react'; 
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'All Tools', Icon: LayoutGrid },
  { href: '/pdf-tools', label: 'PDF Tools', Icon: Files },
  { href: '/unit-converters', label: 'Unit Converters', Icon: Scale },
  { href: '/qr-code', label: 'QR Generator', Icon: QrCode },
  { href: '/url-shortener', label: 'Dynamic Links', Icon: LinkIcon },
  { href: '/admin', label: 'Admin', Icon: Settings },
];

// Placeholder for auth status, replace with actual auth logic
const isAuthenticated = false; 

export default function Navbar() {
  const renderNavLinks = (isMobile = false) =>
    navItems.map((item) => (
      <Button variant={isMobile ? "ghost" : "ghost"} asChild key={item.href} className={cn(isMobile && "w-full justify-start text-base py-2 px-4")}>
        <Link href={item.href} className="flex items-center gap-2">
          <item.Icon className="h-4 w-4" />
          {item.label}
        </Link>
      </Button>
    ));

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" aria-label="Go to homepage">
          <Logo />
        </Link>
        
        <div className="hidden items-center space-x-2 md:flex">
          {renderNavLinks()}
          {isAuthenticated ? (
            <Button variant="outline">Account</Button> 
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="#">Log in</Link>
              </Button>
              <Button variant="default" asChild>
                <Link href="#">Sign up</Link>
              </Button>
            </>
          )}
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <div className="mt-8 flex flex-col space-y-2">
                {renderNavLinks(true)}
                <hr className="my-2"/>
                {isAuthenticated ? (
                  <Button variant="outline" className="w-full justify-start text-base py-2 px-4">Account</Button>
                ) : (
                  <>
                    <Button variant="ghost" asChild className="w-full justify-start text-base py-2 px-4">
                      <Link href="#">Log in</Link>
                    </Button>
                    <Button variant="default" asChild className="w-full justify-start text-base py-2 px-4">
                      <Link href="#">Sign up</Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
