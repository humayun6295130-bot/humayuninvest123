"use client";

import { useUser } from "@/supabase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserDashboard } from "@/components/dashboard/user-dashboard";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { DollarSign } from "lucide-react";

export default function DashboardPage() {
  const { user, isUserLoading, userProfile, isProfileLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || isProfileLoading || !userProfile) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <DollarSign className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return <UserDashboard userProfile={userProfile} />;
}