"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  BarChart3,
  Shield,
  Database,
  Mail,
  Bell,
  CreditCard,
  Globe,
  Zap,
  Activity,
  UserCheck,
  FileCheck,
  MessageSquare,
  HelpCircle,
  Wrench,
  Menu,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'User Management',
    href: '/admin/users',
    icon: Users,
    badge: '1,234',
    children: [
      { title: 'All Users', href: '/admin/users', icon: Users },
      { title: 'User Roles', href: '/admin/users/roles', icon: UserCheck },
      { title: 'Permissions', href: '/admin/users/permissions', icon: Shield },
      { title: 'User Activity', href: '/admin/users/activity', icon: Activity },
    ]
  },
  {
    title: 'Content Management',
    href: '/admin/content',
    icon: FileText,
    children: [
      { title: 'Pages', href: '/admin/content/pages', icon: FileText },
      { title: 'Blog Posts', href: '/admin/content/blog', icon: FileCheck },
      { title: 'Media Library', href: '/admin/content/media', icon: Database },
      { title: 'SEO Settings', href: '/admin/content/seo', icon: Globe },
    ]
  },
  {
    title: 'Analytics & Reports',
    href: '/admin/analytics',
    icon: BarChart3,
    children: [
      { title: 'Overview', href: '/admin/analytics', icon: BarChart3 },
      { title: 'Tool Usage', href: '/admin/analytics/tools', icon: Wrench },
      { title: 'User Behavior', href: '/admin/analytics/behavior', icon: Activity },
      { title: 'Performance', href: '/admin/analytics/performance', icon: Zap },
    ]
  },
  {
    title: 'Tool Management',
    href: '/admin/tools',
    icon: Wrench,
    children: [
      { title: 'PDF Tools', href: '/admin/tools/pdf', icon: FileText },
      { title: 'Image Tools', href: '/admin/tools/image', icon: FileCheck },
      { title: 'Converters', href: '/admin/tools/converters', icon: Zap },
      { title: 'Tool Settings', href: '/admin/tools/settings', icon: Settings },
    ]
  },
  {
    title: 'System Settings',
    href: '/admin/settings',
    icon: Settings,
    children: [
      { title: 'General', href: '/admin/settings/general', icon: Settings },
      { title: 'Security', href: '/admin/settings/security', icon: Shield },
      { title: 'Email', href: '/admin/settings/email', icon: Mail },
      { title: 'Notifications', href: '/admin/settings/notifications', icon: Bell },
      { title: 'API Keys', href: '/admin/settings/api', icon: Database },
    ]
  },
  {
    title: 'Billing & Payments',
    href: '/admin/billing',
    icon: CreditCard,
    children: [
      { title: 'Subscriptions', href: '/admin/billing/subscriptions', icon: CreditCard },
      { title: 'Transactions', href: '/admin/billing/transactions', icon: BarChart3 },
      { title: 'Plans & Pricing', href: '/admin/billing/plans', icon: Settings },
    ]
  },
  {
    title: 'Support & Help',
    href: '/admin/support',
    icon: HelpCircle,
    badge: '12',
    children: [
      { title: 'Tickets', href: '/admin/support/tickets', icon: MessageSquare },
      { title: 'FAQ Management', href: '/admin/support/faq', icon: HelpCircle },
      { title: 'Documentation', href: '/admin/support/docs', icon: FileText },
    ]
  },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const pathname = usePathname();

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    );
  };

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.href);
    const active = isActive(item.href);

    return (
      <div key={item.href}>
        <div className="flex items-center">
          <Link
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent hover:text-accent-foreground flex-1",
              active && "bg-accent text-accent-foreground font-medium",
              level > 0 && "ml-6 text-xs"
            )}
            onClick={() => setSidebarOpen(false)}
          >
            <item.icon className="h-4 w-4" />
            <span className="flex-1">{item.title}</span>
            {item.badge && (
              <Badge variant="secondary" className="ml-auto">
                {item.badge}
              </Badge>
            )}
          </Link>
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => toggleExpanded(item.href)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <Link href="/admin" className="flex items-center gap-2">
              <Logo />
              <span className="text-sm font-medium text-muted-foreground">Admin</span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-2">
              {menuItems.map(item => renderMenuItem(item))}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-medium">A</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Admin User</p>
                <p className="text-xs text-muted-foreground truncate">admin@toolsinn.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Admin Dashboard</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline" size="sm" asChild>
              <Link href="/">View Site</Link>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}