"use client";

import { useCollection, useDoc, useMemoFirebase } from "@/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DollarSign } from "lucide-react";
import { collection, query, where } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import { PortfolioChart } from "@/components/dashboard/portfolio-chart";
import { TopHoldings } from "@/components/dashboard/top-holdings";
import { StatsCards } from "@/components/dashboard/stats-cards";

export default function PublicProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const firestore = useFirestore();

  const publicProfileQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "public_profiles"),
      where("username", "==", params.username)
    );
  }, [firestore, params.username]);

  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
  } = useCollection(publicProfileQuery);

  const profile = profileData?.[0];

  if (profileLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <DollarSign className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Profile Not Found</CardTitle>
              <CardDescription>
                The profile you are looking for does not exist or is not public.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-8 p-4 py-8">
      <header className="flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
        <Avatar className="h-24 w-24 border-2 border-primary">
          <AvatarImage src={profile.profilePictureUrl} alt={profile.displayName} />
          <AvatarFallback>{profile.displayName?.[0]}</AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{profile.displayName}</h1>
          <p className="text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="text-lg">{profile.bio}</p>}
        </div>
      </header>

      <main className="space-y-6">
        <StatsCards />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PortfolioChart />
          </div>
          <div className="lg:col-span-1">
            <TopHoldings />
          </div>
        </div>
      </main>
    </div>
  );
}
    