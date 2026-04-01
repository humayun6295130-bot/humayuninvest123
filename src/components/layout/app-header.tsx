"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Search, User as UserIcon, Menu, Bell, ShieldCheck, Settings } from "lucide-react";
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
import { isAdminProfile } from "@/lib/user-role";
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
  const showAdminEntry = isAdminProfile(userProfile);
  const isAdminRoute = pathname.startsWith("/admin");

  /** Full member app menu — not shown on /admin (admin works on behalf of users, not as an investor). */
  const memberNavItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/wallet', label: 'Wallet' },
    { href: '/mining', label: 'Mining' },
    { href: '/invest', label: 'Invest' },
    { href: '/earnings', label: 'Earnings' },
    { href: '/transactions', label: 'Transactions' },
    { href: '/referrals', label: 'Referrals' },
    { href: '/content', label: 'Market Insights' },
    { href: '/profile', label: 'My Profile' },
    { href: '/kyc', label: 'KYC Verification' },
    { href: '/support', label: 'Support' },
    { href: '/notifications', label: 'Notifications' },
    { href: '/settings', label: 'Settings' },
  ];

  /** On admin routes: only tools an operator needs (no invest / wallet / mining shortcuts). */
  const adminOperatorNavItems = [
    { href: '/admin', label: 'Control center' },
    { href: '/notifications', label: 'Notifications' },
    { href: '/settings', label: 'Account settings' },
  ];

  const navItems = isAdminRoute ? adminOperatorNavItems : memberNavItems;

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
            {isAdminRoute && (
              <p className="px-4 py-2 text-xs text-muted-foreground leading-relaxed border-b mb-2">
                Member app links are hidden here. Use the sidebar “Member app” link or /dashboard only when you need to test or support as a user.
              </p>
            )}
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${pathname === item.href || (item.href === '/admin' && pathname.startsWith('/admin'))
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
              >
                {item.href === '/admin' && <ShieldCheck className="h-5 w-5 shrink-0 text-amber-600" />}
                {item.href === '/settings' && <Settings className="h-5 w-5 shrink-0 opacity-70" />}
                {item.href === '/notifications' && <Bell className="h-5 w-5 shrink-0 opacity-70" />}
                <span>{item.label}</span>
              </Link>
            ))}
            {!isAdminRoute && showAdminEntry && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${pathname.startsWith('/admin')
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
              >
                <ShieldCheck className="h-5 w-5" />
                <span>Admin control center</span>
              </Link>
            )}
            <div className="border-t my-2" />
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                void handleLogout();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-500/10"
            >
              <LogOut className="h-5 w-5" />
              <span>Log out</span>
            </button>
          </nav>
        </SheetContent>
      </Sheet>

      {/* Page Title */}
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <h1 className="text-lg font-semibold md:text-xl animate-in fade-in slide-in-from-left-2 duration-300 truncate">
          {getPageTitle()}
        </h1>
        {showAdminEntry && !pathname.startsWith('/admin') && (
          <Button variant="outline" size="sm" className="hidden sm:inline-flex shrink-0 border-amber-500/40 text-amber-800 dark:text-amber-200" asChild>
            <Link href="/admin">
              <ShieldCheck className="h-4 w-4 mr-1.5" />
              Admin
            </Link>
          </Button>
        )}
      </div>

      {/* Search — member app only (not for admin operator screens). */}
      {!isAdminRoute && (
        <div className="relative hidden sm:block flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 focus-within:text-primary" />
          <Input
            type="search"
            placeholder="Search assets..."
            className="w-full rounded-full bg-muted/80 pl-10 pr-4 border-0 focus-visible:ring-2 focus-visible:ring-primary/30 transition-all duration-300 hover:bg-muted"
          />
        </div>
      )}

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
            <Link href="/profile" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              <span>My Profile</span>
            </Link>
          </DropdownMenuItem>
          {showAdminEntry && (
            <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
              <Link href="/admin" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span>Admin panel</span>
              </Link>
            </DropdownMenuItem>
          )}
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
