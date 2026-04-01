"use client";

import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { DollarSign } from "lucide-react";

export default function AdminPage() {
    const { user, isUserLoading, userProfile, isProfileLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push("/login");
        } else if (!isProfileLoading && userProfile && userProfile.role !== "admin") {
            router.push("/dashboard");
        }
    }, [user, isUserLoading, userProfile, isProfileLoading, router]);

    if (isUserLoading || isProfileLoading || !userProfile) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <DollarSign className="h-12 w-12 animate-pulse text-primary" />
                    <p className="text-muted-foreground">Verifying access...</p>
                </div>
            </div>
        );
    }

    if (userProfile.role !== "admin") {
        return null;
    }

    return <AdminDashboard />;
}
