"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { PublicBannerCarousel } from "@/components/layout/public-banner-carousel";
import { DollarSign, LayoutDashboard, Settings, Wallet, Newspaper, ShieldCheck, TrendingUp, History, Users, BadgeCheck, HelpCircle, Bell, User, Pickaxe } from "lucide-react";
import { useUser, useAuth } from "@/firebase";
import { isAdminProfile } from "@/lib/user-role";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isUserLoading, userProfile } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login");
    }
  }, [isUserLoading, user, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 h-16 w-16 animate-ping rounded-full bg-primary/20" />
            <DollarSign className="relative h-16 w-16 animate-pulse text-primary" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading your account...</p>
        </div>
      </div>
    );
  }

  const isAdmin = isAdminProfile(userProfile);
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  const displayName = userProfile?.display_name || user?.displayName || "User";
  const userEmail = userProfile?.email || user?.email || "";
  const userAvatar = `https://picsum.photos/seed/${user.uid}/100/100`;

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border/50">
        <SidebarHeader className="p-5 border-b border-sidebar-border/50">
          <Link href={isAdminRoute ? '/admin' : '/dashboard'} className="flex items-center gap-3 group/logo">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 group-hover/logo:scale-105 group-hover/logo:shadow-xl group-hover/logo:shadow-primary/30 group-data-[state=collapsed]:h-10 group-data-[state=collapsed]:w-10">
              <NoSsr>
                <DollarSign className="h-6 w-6 transition-transform duration-300 group-hover/logo:rotate-12" />
              </NoSsr>
            </div>
            <div className="group-data-[state=collapsed]:hidden overflow-hidden">
              <h1 className="text-xl font-bold bg-gradient-to-r from-sidebar-foreground to-sidebar-foreground/80 bg-clip-text text-transparent">
                BTCMine
              </h1>
              <p className="text-[10px] text-sidebar-foreground/50 font-medium uppercase tracking-wider">
                {isAdminRoute ? 'Administration' : 'Investment Platform'}
              </p>
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          {isAdminRoute ? (
            <SidebarGroup>
              <SidebarGroupLabel>Admin navigation</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Member-facing app (for testing or support)">
                    <Link href="/dashboard">
                      <LayoutDashboard />
                      <span>Member app</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive tooltip="Admin Panel">
                    <Link href="/admin">
                      <ShieldCheck />
                      <span>Control center</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
              <p className="px-2 py-3 text-xs text-muted-foreground leading-relaxed">
                Operator tools only — users, finance, tiers, mining monitor, support, analytics, banners. Use <strong>Member app</strong> only if you need to see the product as a user.
              </p>
            </SidebarGroup>
          ) : (
            <>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard'} tooltip="Dashboard">
                  <Link href="/dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/wallet'} tooltip="Wallet">
                  <Link href="/wallet">
                    <Wallet />
                    <span>Wallet</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/invest'} tooltip="Invest">
                  <Link href="/invest">
                    <TrendingUp />
                    <span>Invest</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/mining'} tooltip="Mining">
                  <Link href="/mining">
                    <Pickaxe />
                    <span>Mining</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/earnings'} tooltip="Earnings">
                  <Link href="/earnings">
                    <DollarSign />
                    <span>Earnings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/transactions'} tooltip="Transactions">
                  <Link href="/transactions">
                    <History />
                    <span>Transactions</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/referrals'} tooltip="Referrals">
                  <Link href="/referrals">
                    <Users />
                    <span>Referrals</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/content'} tooltip="Market Insights">
                  <Link href="/content">
                    <Newspaper />
                    <span>Market Insights</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Account</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/profile'} tooltip="My Profile">
                  <Link href="/profile">
                    <User />
                    <span>My Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/kyc'} tooltip="KYC Verification">
                  <Link href="/kyc">
                    <BadgeCheck />
                    <span>KYC Verification</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/support'} tooltip="Support">
                  <Link href="/support">
                    <HelpCircle />
                    <span>Support</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/notifications'} tooltip="Notifications">
                  <Link href="/notifications">
                    <Bell />
                    <span>Notifications</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          {isAdmin && (
            <SidebarGroup>
              <SidebarGroupLabel>Administration</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/admin'} tooltip="Admin Panel">
                    <Link href="/admin">
                      <ShieldCheck />
                      <span>Admin Control</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          )}
            </>
          )}
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border/50 p-4">
          {/* User Profile Card */}
          <div className="group-data-[collapsible=icon]:hidden mb-3">
            <Link href="/settings" className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/50 hover:bg-sidebar-accent transition-all duration-300 hover:shadow-md">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20 ring-offset-2 ring-offset-sidebar transition-transform duration-300 group-hover:scale-105">
                <AvatarImage src={userAvatar} alt={displayName} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {displayName?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">
                  {displayName}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {userEmail}
                </p>
              </div>
            </Link>
          </div>

          {/* Collapsed User Icon */}
          <div className="hidden group-data-[collapsible=icon]:flex justify-center mb-3">
            <Link href="/settings">
              <Avatar className="h-9 w-9 ring-2 ring-primary/20 ring-offset-2 ring-offset-sidebar hover:ring-primary/40 transition-all duration-300 hover:scale-110">
                <AvatarImage src={userAvatar} alt={displayName} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                  {displayName?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/settings'}
                tooltip="Settings"
                className="hover:bg-sidebar-accent/80"
              >
                <Link href="/settings">
                  <Settings className="transition-transform duration-300 group-hover/menu-button:rotate-90" />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleLogout}
                tooltip="Logout"
                className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
              >
                <LogOut className="transition-transform duration-300 group-hover/menu-button:translate-x-1" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]">
        {isAdminRoute && (
          <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-center text-sm font-medium text-amber-950 dark:text-amber-100">
            Administrator mode — support and platform controls (not for investing).{' '}
            <Link href="/dashboard" className="underline underline-offset-2 hover:text-amber-800 dark:hover:text-amber-50">
              Open member app
            </Link>
          </div>
        )}
        <AppHeader />
        {!isAdminRoute && <PublicBannerCarousel variant="app" />}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function NoSsr({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true) }, []);
  if (!isClient) return null;
  return <>{children}</>;
}
