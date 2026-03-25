"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Search, User as UserIcon, Menu, Bell, X, Briefcase, History, Newspaper, BadgeCheck, HelpCircle, Pickaxe, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useUser, useAuth } from "@/firebase";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function AppHeader() {
  const pathname = usePathname();
  const { user, userProfile } = useUser();
  const { signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/portfolio': 'Portfolio',
      '/wallet': 'Wallet',
      '/mining': 'Mining Hub',
      '/invest': 'Invest',
      '/earnings': 'Earnings',
      '/transactions': 'Transactions',
      '/referrals': 'Referrals',
      '/content': 'Market Insights',
      '/kyc': 'KYC Verification',
      '/support': 'Support',
      '/notifications': 'Notifications',
      '/settings': 'Settings',
      '/admin': 'Admin Panel',
    };
    for (const [path, title] of Object.entries(titles)) {
      if (pathname.startsWith(path)) return title;
    }
    return "BTCMine";
  };

  const handleLogout = async () => {
    await signOut();
    setMobileMenuOpen(false);
  };

  const displayName = userProfile?.display_name || user?.displayName || "My Account";
  const userEmail = userProfile?.email || user?.email || "";
  const userId = user?.uid;

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { href: '/portfolio', label: 'Portfolio', icon: 'Briefcase' },
    { href: '/wallet', label: 'Wallet', icon: 'Wallet' },
    { href: '/mining', label: 'Mining', icon: 'Pickaxe' },
    { href: '/invest', label: 'Invest', icon: 'TrendingUp' },
    { href: '/earnings', label: 'Earnings', icon: 'DollarSign' },
    { href: '/transactions', label: 'Transactions', icon: 'History' },
    { href: '/referrals', label: 'Referrals', icon: 'Users' },
    { href: '/content', label: 'Market Insights', icon: 'Newspaper' },
    { href: '/profile', label: 'My Profile', icon: 'User' },
    { href: '/kyc', label: 'KYC Verification', icon: 'BadgeCheck' },
    { href: '/support', label: 'Support', icon: 'HelpCircle' },
    { href: '/notifications', label: 'Notifications', icon: 'Bell' },
    { href: '/settings', label: 'Settings', icon: 'Settings' },
  ];

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sm:px-6 transition-all duration-300">
      {/* Mobile Menu Button */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden hover:bg-muted transition-colors duration-200"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
          <SheetHeader className="p-6 border-b">
            <SheetTitle className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
                <span className="text-xl font-bold">$</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                BTCMine
              </span>
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 p-4 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${pathname === item.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
              >
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="border-t my-2" />
            <Link
              href="/notifications"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${pathname === '/notifications'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            >
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </Link>
            <Link
              href="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${pathname === '/settings'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            >
              <LogOut className="h-5 w-5" />
              <span>Settings</span>
            </Link>
          </nav>
        </SheetContent>
      </Sheet>

      {/* Page Title */}
      <div className="flex-1">
        <h1 className="text-lg font-semibold md:text-xl animate-in fade-in slide-in-from-left-2 duration-300">
          {getPageTitle()}
        </h1>
      </div>

      {/* Search Bar */}
      <div className="relative hidden sm:block flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 focus-within:text-primary" />
        <Input
          type="search"
          placeholder="Search assets..."
          className="w-full rounded-full bg-muted/80 pl-10 pr-4 border-0 focus-visible:ring-2 focus-visible:ring-primary/30 transition-all duration-300 hover:bg-muted"
        />
      </div>

      {/* Notifications - Visible on all screens */}
      <Link
        href="/notifications"
        className="relative flex items-center justify-center hover:bg-muted transition-all duration-200 rounded-lg p-2"
      >
        <Bell className="h-5 w-5" />
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="sr-only">Notifications</span>
      </Link>

      {/* User Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-10 w-10 rounded-full ring-2 ring-primary/20 ring-offset-2 ring-offset-background transition-all duration-300 hover:ring-primary/40 hover:scale-105"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={`https://picsum.photos/seed/${userId}/40/40`}
                alt={displayName}
              />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {displayName?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-2" sideOffset={8}>
          <div className="flex items-center gap-3 p-2">
            <Avatar className="h-12 w-12 ring-2 ring-primary/20">
              <AvatarImage
                src={`https://picsum.photos/seed/${userId}/100/100`}
                alt={displayName}
              />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                {displayName?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
            <Link href="/settings" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="rounded-lg cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
