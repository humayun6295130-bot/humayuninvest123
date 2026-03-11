"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser } from "@/firebase";
import { AdminSettings } from "@/components/settings/admin-settings";
import { UserSettings } from "@/components/settings/user-settings";
import { TronWalletManager } from "@/components/settings/tron-wallet-manager";

export default function SettingsPage() {
  const { isUserLoading, userProfile, isProfileLoading } = useUser();

  const isLoading = isUserLoading || isProfileLoading;

  return (
    <div className="space-y-6">
      {/* TRON Wallet Section */}
      <TronWalletManager userProfile={userProfile} />

      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
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
