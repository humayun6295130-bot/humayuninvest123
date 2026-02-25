"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { AdminSettings } from "@/components/settings/admin-settings";
import { UserSettings } from "@/components/settings/user-settings";

export default function SettingsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  const isLoading = isUserLoading || isProfileLoading;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Manage your account settings and preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed">
                <p className="text-muted-foreground">Loading settings...</p>
            </div>
          ) : (
             userProfile && (userProfile.role === 'admin' ? <AdminSettings /> : <UserSettings userProfile={userProfile} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
