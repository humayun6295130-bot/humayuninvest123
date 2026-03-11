"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser, updateRow, upsertRow, deleteRow } from "@/firebase";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Hash, Headphones, AlertCircle, Bell, Shield, Moon, Globe, Trash2, Mail, Smartphone, Lock, User, TrendingUp, Zap, Gift, Settings } from "lucide-react";
import { formatSupportId } from "@/lib/support-id";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function UserSettings({ userProfile }: { userProfile: any }) {
  const { user } = useUser();
  const { toast } = useToast();

  // Profile states
  const [isPublic, setIsPublic] = useState(userProfile?.is_public || false);
  const [displayName, setDisplayName] = useState(userProfile?.display_name || "");
  const [bio, setBio] = useState(userProfile?.bio || "");
  const [phone, setPhone] = useState(userProfile?.phone || "");
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Notification states
  const [emailNotifications, setEmailNotifications] = useState(userProfile?.email_notifications !== false);
  const [investmentAlerts, setInvestmentAlerts] = useState(userProfile?.investment_alerts !== false);
  const [marketingEmails, setMarketingEmails] = useState(userProfile?.marketing_emails || false);
  const [smsAlerts, setSmsAlerts] = useState(userProfile?.sms_alerts || false);

  // System Control States
  const [autoDailyEarnings, setAutoDailyEarnings] = useState(userProfile?.auto_daily_earnings !== false);
  const [autoLevelUpgrade, setAutoLevelUpgrade] = useState(userProfile?.auto_level_upgrade !== false);
  const [teamCommissionEnabled, setTeamCommissionEnabled] = useState(userProfile?.team_commission_enabled !== false);

  // Security states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(userProfile?.two_factor_enabled || false);
  const [loginAlerts, setLoginAlerts] = useState(userProfile?.login_alerts !== false);

  // Preferences
  const [language, setLanguage] = useState(userProfile?.language || "en");
  const [currency, setCurrency] = useState(userProfile?.currency || "USD");
  const [themePreference, setThemePreference] = useState(userProfile?.theme || "system");

  const userId = user?.uid;

  const handleCopySupportId = async () => {
    if (!userProfile?.support_id) return;
    try {
      await navigator.clipboard.writeText(userProfile.support_id);
      setCopied(true);
      toast({ title: "Copied!", description: "Support ID copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ variant: "destructive", title: "Copy Failed", description: "Please copy manually" });
    }
  };

  const handleUpdateProfile = async () => {
    if (!userId) return;
    setIsSaving(true);
    try {
      await updateRow("users", userId, {
        display_name: displayName,
        bio,
        phone,
      });

      if (isPublic) {
        await upsertRow("public_profiles", {
          id: userProfile.username,
          username: userProfile.username,
          user_id: userId,
          display_name: displayName,
          bio,
        });
      }

      toast({ title: "Profile Updated", description: "Your changes have been saved" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update profile" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateNotifications = async () => {
    if (!userId) return;
    try {
      await updateRow("users", userId, {
        email_notifications: emailNotifications,
        investment_alerts: investmentAlerts,
        marketing_emails: marketingEmails,
        sms_alerts: smsAlerts,
      });
      toast({ title: "Preferences Saved", description: "Notification settings updated" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save preferences" });
    }
  };

  const handleUpdateSecurity = async () => {
    if (!userId) return;
    try {
      await updateRow("users", userId, {
        two_factor_enabled: twoFactorEnabled,
        login_alerts: loginAlerts,
      });
      toast({ title: "Security Settings Saved", description: "Security preferences updated" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save security settings" });
    }
  };

  const handleUpdatePreferences = async () => {
    if (!userId) return;
    try {
      await updateRow("users", userId, {
        language,
        currency,
        theme: themePreference,
      });
      toast({ title: "Preferences Saved", description: "Your preferences have been updated" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save preferences" });
    }
  };

  // Handle System Controls Update
  const handleUpdateSystemControls = async () => {
    if (!userId) return;
    try {
      await updateRow("users", userId, {
        auto_daily_earnings: autoDailyEarnings,
        auto_level_upgrade: autoLevelUpgrade,
        team_commission_enabled: teamCommissionEnabled,
      });
      toast({ title: "System Controls Saved", description: "Your system settings have been updated" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save system controls" });
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId) return;
    try {
      toast({
        variant: "destructive",
        title: "Account Deletion Requested",
        description: "Contact support to complete account deletion"
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to process request" });
    }
  };

  const handlePublicToggle = async (checked: boolean) => {
    if (!userId || !userProfile) return;
    setIsPublic(checked);
    await updateRow("users", userId, { is_public: checked });

    if (checked) {
      await upsertRow("public_profiles", {
        id: userProfile.username,
        user_id: userId,
        username: userProfile.username,
        display_name: displayName,
        bio: bio,
        profile_picture_url: userProfile.profile_picture_url || "",
      });
    } else {
      try {
        await deleteRow("public_profiles", userProfile.username);
      } catch {
        // Ignore if not found
      }
    }
  };

  useEffect(() => {
    setIsPublic(userProfile?.is_public || false);
    setDisplayName(userProfile?.display_name || "");
    setBio(userProfile?.bio || "");
    setPhone(userProfile?.phone || "");
    setEmailNotifications(userProfile?.email_notifications !== false);
    setInvestmentAlerts(userProfile?.investment_alerts !== false);
    setMarketingEmails(userProfile?.marketing_emails || false);
    setSmsAlerts(userProfile?.sms_alerts || false);
    setTwoFactorEnabled(userProfile?.two_factor_enabled || false);
    setLoginAlerts(userProfile?.login_alerts !== false);
    setLanguage(userProfile?.language || "en");
    setCurrency(userProfile?.currency || "USD");
    setThemePreference(userProfile?.theme || "system");
  }, [userProfile]);

  const formattedSupportId = userProfile?.support_id ? formatSupportId(userProfile.support_id) : "Not Available";

  return (
    <div className="space-y-6">
      {/* Support Reference ID Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Headphones className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Support Reference ID</CardTitle>
              <CardDescription>
                Use this ID when contacting our support team for any issues
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-3 rounded-full bg-primary/10 shrink-0">
                <Hash className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Your Support ID</p>
                <p className="text-2xl font-bold tracking-wider text-primary font-mono">
                  {formattedSupportId}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Share this ID when contacting support
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySupportId}
              className="shrink-0"
              disabled={!userProfile?.support_id}
            >
              {copied ? (
                <><Check className="w-4 h-4 mr-2" /> Copied!</>
              ) : (
                <><Copy className="w-4 h-4 mr-2" /> Copy ID</>
              )}
            </Button>
          </div>
          <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-yellow-500" />
            <p>
              When you contact support for payment issues, technical problems, or account inquiries,
              please provide this Support ID so we can quickly locate your account.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <CardTitle>Profile Information</CardTitle>
          </div>
          <CardDescription>Update your personal information and bio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your Name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about your investment goals..."
              className="h-24"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
            <div className="space-y-0.5">
              <Label htmlFor="public-profile" className="text-base">Public Profile</Label>
              <p className="text-sm text-muted-foreground">
                Make your investment summary visible to the community
              </p>
            </div>
            <Switch
              id="public-profile"
              checked={isPublic}
              onCheckedChange={handlePublicToggle}
            />
          </div>

          {isPublic && userProfile?.username && (
            <div className="rounded-lg border p-4 border-dashed bg-primary/5">
              <Label className="text-base">Your Public Profile Link</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Anyone with this link can view your investment summary
              </p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/u/${userProfile.username}` : ''}
                  className="bg-background"
                />
                <Button variant="outline" asChild>
                  <a href={`/u/${userProfile.username}`} target="_blank" rel="noopener noreferrer">View</a>
                </Button>
              </div>
            </div>
          )}

          <Button onClick={handleUpdateProfile} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <CardTitle>Notification Preferences</CardTitle>
          </div>
          <CardDescription>Choose how you want to be notified</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive updates about your account</p>
              </div>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label>Investment Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified about investment opportunities</p>
              </div>
            </div>
            <Switch checked={investmentAlerts} onCheckedChange={setInvestmentAlerts} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label>SMS Alerts</Label>
                <p className="text-sm text-muted-foreground">Receive text messages for important updates</p>
              </div>
            </div>
            <Switch checked={smsAlerts} onCheckedChange={setSmsAlerts} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label>Marketing Emails</Label>
                <p className="text-sm text-muted-foreground">Receive promotional offers and news</p>
              </div>
            </div>
            <Switch checked={marketingEmails} onCheckedChange={setMarketingEmails} />
          </div>

          <Button onClick={handleUpdateNotifications}>Save Notification Preferences</Button>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <CardTitle>Security Settings</CardTitle>
          </div>
          <CardDescription>Manage your account security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
              </div>
            </div>
            <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label>Login Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified when someone logs into your account</p>
              </div>
            </div>
            <Switch checked={loginAlerts} onCheckedChange={setLoginAlerts} />
          </div>

          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <Label>Password</Label>
                <p className="text-sm text-muted-foreground">Last changed recently</p>
              </div>
              <Button variant="outline" size="sm">
                Change Password
              </Button>
            </div>
          </div>

          <Button onClick={handleUpdateSecurity}>Save Security Settings</Button>
        </CardContent>
      </Card>

      {/* Appearance & Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-primary" />
            <CardTitle>Appearance & Preferences</CardTitle>
          </div>
          <CardDescription>Customize your experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label>Theme</Label>
            <Select value={themePreference} onValueChange={setThemePreference}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                <SelectItem value="es">Español (Spanish)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
                <SelectItem value="BDT">BDT (৳)</SelectItem>
                <SelectItem value="INR">INR (₹)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleUpdatePreferences}>Save Preferences</Button>
        </CardContent>
      </Card>

      {/* System Controls */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-500" />
            <CardTitle>System Controls</CardTitle>
          </div>
          <CardDescription>Control automatic and manual features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Automatic Features */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Automatic Features</h4>

            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-yellow-500" />
                <div className="space-y-0.5">
                  <Label>Auto Daily Earnings</Label>
                  <p className="text-sm text-muted-foreground">Automatically add daily earnings based on level</p>
                </div>
              </div>
              <Switch checked={autoDailyEarnings} onCheckedChange={setAutoDailyEarnings} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <div className="space-y-0.5">
                  <Label>Auto Level Upgrade</Label>
                  <p className="text-sm text-muted-foreground">Automatically upgrade level based on balance</p>
                </div>
              </div>
              <Switch checked={autoLevelUpgrade} onCheckedChange={setAutoLevelUpgrade} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                <Gift className="w-5 h-5 text-purple-500" />
                <div className="space-y-0.5">
                  <Label>Team Commission</Label>
                  <p className="text-sm text-muted-foreground">Enable team commission from referrals</p>
                </div>
              </div>
              <Switch checked={teamCommissionEnabled} onCheckedChange={setTeamCommissionEnabled} />
            </div>
          </div>

          <Button onClick={handleUpdateSystemControls} className="w-full">
            Save System Controls
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </div>
          <CardDescription>Irreversible actions for your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
            <div>
              <h4 className="font-medium text-destructive">Delete Account</h4>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account
                    and remove all your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
