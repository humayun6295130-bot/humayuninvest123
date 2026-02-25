"use client";

import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  useEffect(() => {
    if (isUserLoading || isProfileLoading) {
      return;
    }
    if (!user) {
      router.push('/login');
      return;
    }
    if (userProfile?.role !== 'admin') {
      router.push('/dashboard');
    } else {
      setIsAdmin(true);
    }
    setIsChecking(false);
  }, [user, isUserLoading, userProfile, isProfileLoading, router]);

  if (isChecking || !isAdmin) {
    return (
       <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
          <CardDescription>This is where you can manage application-wide settings and content.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Welcome, admin.</p>
        </CardContent>
      </Card>
    </div>
  );
}
