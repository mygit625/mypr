"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu, LayoutGrid, Files, Scale, QrCode, Image, BrainCircuit, User, LogOut } from 'lucide-react'; 
import { cn } from '@/lib/utils';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '@/contexts/auth-context';
import { signOut } from '@/lib/firebase-auth';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { href: '/', label: 'All Tools', Icon: LayoutGrid },
  { href: '/pdf-tools', label: 'PDF Tools', Icon: Files },
  { href: '/image-tools', label: 'Image Tools', Icon: Image },
  { href: '/cover-letter-generator', label: 'AI Cover Letter', Icon: BrainCircuit },
  { href: '/unit-converters', label: 'Unit Converters', Icon: Scale },
  { href: '/qr-code', label: 'QR Generator', Icon: QrCode },
];

export default function Navbar() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const renderNavLinks = (isMobile = false) =>
    navItems.map((item) => (
      <Button variant="ghost" asChild key={item.href} className={cn(isMobile && "w-full justify-start text-base py-3 px-4")} onClick={() => setMobileMenuOpen(false)}>
        <Link href={item.href} className="flex items-center gap-3">
          <item.Icon className="h-5 w-5" />
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
        
        <nav className="hidden items-center space-x-1 md:flex">
          {renderNavLinks()}
        </nav>

        <div className="hidden items-center space-x-2 md:flex">
          {loading ? (
             <div className="h-10 w-24 bg-muted animate-pulse rounded-md" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User avatar'} />
                    <AvatarFallback>{getInitials(user.displayName || user.email)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button variant="default" asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
          <ThemeToggle />
        </div>

        <div className="md:hidden flex items-center gap-2">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <SheetHeader>
                 <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-8 flex flex-col space-y-2">
                {renderNavLinks(true)}
                <hr className="my-2"/>
                {loading ? (
                   <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
                ) : user ? (
                   <>
                    <div className="px-4 py-2">
                      <p className="text-sm font-medium leading-none">{user.displayName || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                    <Button variant="ghost" onClick={() => { handleSignOut(); setMobileMenuOpen(false); }} className="w-full justify-start text-base py-3 px-4 text-destructive hover:text-destructive">
                      <LogOut className="mr-3 h-5 w-5" />
                      Log out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" asChild className="w-full justify-start text-base py-3 px-4" onClick={() => setMobileMenuOpen(false)}>
                      <Link href="/login">Log in</Link>
                    </Button>
                    <Button variant="default" asChild className="w-full justify-start text-base py-3 px-4" onClick={() => setMobileMenuOpen(false)}>
                      <Link href="/signup">Sign up</Link>
                    </Button>
                  </>
                )}
                 <div className="pt-4 flex justify-center">
                    <ThemeToggle />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
