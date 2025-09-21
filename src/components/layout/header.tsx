'use client';

import Link from 'next/link';
import { Search, User, ArrowRight, LogOut, HelpCircle } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '../ui/theme-toggle';

export function Header() {
  const pathname = usePathname();
  const [, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    // Wire this to your real search route or server action
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  const getBreadcrumbs = () => {
    const segments = pathname?.split('/').filter(Boolean) || [];
    const breadcrumbs = [{ label: 'Dashboard', href: '/' }];

    let currentPath = '';
    segments.forEach((segment) => {
      currentPath += `/${segment}`;
      const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ');
      breadcrumbs.push({ label, href: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  // const currentPage = breadcrumbs[breadcrumbs.length - 1];

  return (
    <header className="border-border bg-background/95 backdrop-blur-custom sticky top-0 z-30 border-b">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <nav className="text-muted-foreground flex items-center space-x-1 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center">
                  {index > 0 && <ArrowRight className="mx-2 h-3 w-3" />}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="text-foreground font-medium">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href} className="hover:text-foreground transition-colors">
                      {crumb.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile: icon-only, preserves your current behavior */}
          <Button
            variant="outline"
            size="sm"
            className="relative h-9 w-9 bg-transparent p-0 xl:hidden"
            onClick={() => setSearchOpen(true)}
            aria-label="Open search"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Desktop (xl+): full pill input with attached Search button */}
          <form onSubmit={handleSearch} className="relative hidden xl:block">
            {/* Input */}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="border-border focus-visible:ring-ring placeholder:text-muted-foreground h-10 w-96 rounded-lg border bg-transparent pr-24 pl-9 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              aria-label="Search"
            />

            {/* Left icon inside the input */}
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />

            {/* Attached Search button (right, inside the field) */}
            <Button
              type="submit"
              className="absolute top-1/2 right-1 h-8 -translate-y-1/2 rounded-lg px-4 shadow-sm"
            >
              Search
            </Button>
          </form>

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/professional-avatar.png" alt="User" />
                  <AvatarFallback>SI</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm leading-none font-medium">Sana Ismayeel</p>
                  <p className="text-muted-foreground text-xs leading-none">
                    sanaismayeel@gmail.com
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Help</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
