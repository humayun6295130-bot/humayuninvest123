"use client";

import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, Suspense, useState } from "react";
import { UserDashboard } from "@/components/dashboard/user-dashboard";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { DollarSign } from "lucide-react";

function DashboardContent() {
  const { user, isUserLoading, userProfile, isProfileLoading } = useUser();
  const router = useRouter();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Timeout for profile loading
  useEffect(() => {
    if (isProfileLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 5000); // 5 seconds timeout
      return () => clearTimeout(timer);
    }
  }, [isProfileLoading]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Show loading only on initial auth check
  if (isUserLoading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <DollarSign className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If profile is loading but timeout reached, show dashboard with default profile
  if (isProfileLoading && !loadingTimeout) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <DollarSign className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Use profile or default values if loading timed out
  const profile = userProfile || {
    display_name: 'Investor',
    balance: 0,
    total_invested: 0,
    total_earnings: 0,
    active_investments_count: 0
  };

  // Check if admin
  const isAdmin = profile?.role === 'admin';

  if (isAdmin) {
    return <AdminDashboard />;
  }

  return <UserDashboard userProfile={profile} />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <DollarSign className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
