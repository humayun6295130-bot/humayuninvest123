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
import { Bep20WalletManager } from "@/components/settings/tron-wallet-manager";
import Link from "next/link";
import { Info, MessageCircle, HelpCircle, BookOpen, Shield, ExternalLink } from "lucide-react";

export default function SettingsPage() {
  const { isUserLoading, userProfile, isProfileLoading } = useUser();

  const isLoading = isUserLoading || isProfileLoading;

  return (
    <div className="space-y-6">
      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/about">
          <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Info className="h-8 w-8 mb-2 text-primary" />
              <span className="text-sm font-medium">About Us</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/contact">
          <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <MessageCircle className="h-8 w-8 mb-2 text-primary" />
              <span className="text-sm font-medium">Contact</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/faq">
          <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <HelpCircle className="h-8 w-8 mb-2 text-primary" />
              <span className="text-sm font-medium">FAQ</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/how-it-works">
          <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <BookOpen className="h-8 w-8 mb-2 text-primary" />
              <span className="text-sm font-medium">How It Works</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* BEP20 Wallet Section */}
      <Bep20WalletManager userProfile={userProfile} />

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
