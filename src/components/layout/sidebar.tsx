'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  PackageSearch,
  Settings,
  ChevronDown,
  Dot,
  ChartColumn,
  Users,
  FileSignature,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const NAV = [
  {
    category: 'Main',
    items: [
      { href: '/', label: 'Dashboard', icon: ChartColumn },
      { href: '/quotations', label: 'Quotations', icon: FileSignature },
      { href: '/products', label: 'Products', icon: PackageSearch },
      { href: '/customers', label: 'Customers', icon: Users },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

// const HELP_ITEMS: any[] = [];

const LS_KEY = 'qf.sidebar.collapsed';

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Main']));
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    const isCollapsed = saved === '1';
    setCollapsed(isCollapsed);
    document.body.dataset.sidebar = isCollapsed ? 'collapsed' : 'expanded';
    document.body.style.setProperty('--sidebar-w', isCollapsed ? '72px' : '280px');
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(LS_KEY, next ? '1' : '0');
    document.body.dataset.sidebar = next ? 'collapsed' : 'expanded';
    document.body.style.setProperty('--sidebar-w', next ? '72px' : '280px');
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag)) return;
      if (e.key === '[' && !collapsed) toggleCollapsed();
      if (e.key === ']' && collapsed) toggleCollapsed();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const NavLink = ({ href, label, icon: Icon, badge, count }: any) => {
    const active = pathname === href || pathname?.startsWith(href + '/');
    return (
      <Link
        href={href}
        ref={pathname === href ? firstLinkRef : undefined}
        className={`group sidebar-transition relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
          active
            ? 'bg-sidebar-accent text-sidebar-accent-foreground ring-sidebar-border shadow-sm ring-1'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span
          className={`origin-left transition-all duration-200 lg:[body[data-sidebar='collapsed']_&]:w-0 lg:[body[data-sidebar='collapsed']_&]:-translate-x-2 lg:[body[data-sidebar='collapsed']_&]:opacity-0`}
        >
          {label}
        </span>
        {!collapsed && badge && (
          <Badge variant="secondary" className="ml-auto px-1.5 py-0.5 text-xs">
            {badge}
          </Badge>
        )}
        {!collapsed && count && (
          <span className="text-sidebar-foreground/50 ml-auto font-mono text-xs">{count}</span>
        )}
        <div className="bg-popover text-popover-foreground pointer-events-none absolute left-full z-50 ml-3 hidden rounded-md border px-2 py-1.5 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100 lg:[body[data-sidebar='collapsed']_&]:block">
          {label}
          {badge && (
            <Badge variant="outline" className="ml-2 text-xs">
              {badge}
            </Badge>
          )}
        </div>
      </Link>
    );
  };

  const CategoryHeader = ({ category, isExpanded, onToggle }: any) => (
    <button
      onClick={() => onToggle(category)}
      className={`text-sidebar-foreground/50 hover:text-sidebar-foreground/70 flex w-full items-center justify-between px-3 py-2 text-xs font-semibold tracking-wider uppercase transition-colors lg:[body[data-sidebar='collapsed']_&]:justify-center ${
        collapsed ? "lg:[body[data-sidebar='collapsed']_&]:px-2" : ''
      }`}
    >
      <span className={`lg:[body[data-sidebar='collapsed']_&]:hidden`}>{category}</span>
      <ChevronDown
        className={`h-3 w-3 transition-transform lg:[body[data-sidebar='collapsed']_&]:hidden ${
          isExpanded ? 'rotate-180' : ''
        }`}
      />
      {collapsed && (
        <Dot className="text-sidebar-foreground/30 hidden h-4 w-4 lg:[body[data-sidebar='collapsed']_&]:block" />
      )}
    </button>
  );

  return (
    <>
      <button
        className="border-border bg-card/80 backdrop-blur-custom fixed top-4 left-4 z-50 rounded-lg border p-2.5 shadow-lg lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="bg-background/80 fixed inset-0 z-40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`border-sidebar-border bg-sidebar/95 backdrop-blur-custom fixed inset-y-0 left-0 z-50 w-80 transform border-r shadow-xl transition-transform lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="border-sidebar-border flex items-center justify-between border-b p-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg">
              <span className="text-primary-foreground text-sm font-bold">S</span>
            </div>
            <span className="text-lg font-bold">Seyna</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="border-sidebar-border bg-sidebar-accent hover:bg-sidebar-accent/80 rounded-lg border p-2 shadow-sm"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <nav className="space-y-6">
            {NAV.map((section) => (
              <div key={section.category}>
                <CategoryHeader
                  category={section.category}
                  isExpanded={expandedCategories.has(section.category)}
                  onToggle={toggleCategory}
                />
                {expandedCategories.has(section.category) && (
                  <div className="mt-2 space-y-1">
                    {section.items.map((item) => (
                      <NavLink key={item.href} {...item} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </aside>

      <aside
        className="border-sidebar-border bg-sidebar/95 backdrop-blur-custom sticky top-0 hidden h-screen border-r transition-all duration-300 lg:block"
        style={{ width: 'var(--sidebar-w,280px)' }}
        aria-label="Primary"
      >
        <div className="border-sidebar-border flex items-center justify-between border-b p-6">
          <div
            className={`flex items-center gap-3 transition-all duration-200 lg:[body[data-sidebar='collapsed']_&]:justify-center`}
          >
            <div className="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              <span className="text-primary-foreground text-sm font-bold">S</span>
            </div>
            <div className="lg:[body[data-sidebar='collapsed']_&]:hidden">
              <span className="text-lg font-bold tracking-tight">Seyna</span>
              <div className="text-sidebar-foreground/50 text-xs">Professional Quotes</div>
            </div>
          </div>

          <button
            onClick={toggleCollapsed}
            className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground rounded-lg border p-2 transition-colors"
            aria-pressed={collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <nav className="space-y-6">
            {NAV.map((section) => (
              <div key={section.category}>
                <CategoryHeader
                  category={section.category}
                  isExpanded={expandedCategories.has(section.category)}
                  onToggle={toggleCategory}
                />
                {(expandedCategories.has(section.category) || collapsed) && (
                  <div className="mt-2 space-y-1">
                    {section.items.map((item) => (
                      <NavLink key={item.href} {...item} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
