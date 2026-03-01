"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useUser, updateRow, upsertRow, deleteRow } from "@/firebase";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function UserSettings({ userProfile }: { userProfile: any }) {
  const { user } = useUser();
  const { toast } = useToast();
  const [isPublic, setIsPublic] = useState(userProfile.is_public || false);
  const [displayName, setDisplayName] = useState(userProfile.display_name || "");
  const [bio, setBio] = useState(userProfile.bio || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateRow("users", user.id, {
        display_name: displayName,
        bio
      });

      // If public profile exists, update it too
      if (isPublic) {
        await upsertRow("public_profiles", {
          username: userProfile.username,
          user_id: user.id,
          display_name: displayName,
          bio
        });
      }

      toast({ title: "Profile Updated", description: "Your changes have been saved." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update profile." });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublicToggle = async (checked: boolean) => {
    if (!user || !userProfile) return;

    setIsPublic(checked);
    await updateRow("users", user.id, { is_public: checked });

    if (checked) {
      await upsertRow("public_profiles", {
        user_id: user.id,
        username: userProfile.username,
        display_name: displayName,
        bio: bio,
        profile_picture_url: userProfile.profile_picture_url || "",
      });
    } else {
      try {
        await deleteRow("public_profiles", userProfile.username, "username");
      } catch {
        // Ignore if not found
      }
    }
  };

  useEffect(() => {
    setIsPublic(userProfile.is_public || false);
    setDisplayName(userProfile.display_name || "");
    setBio(userProfile.bio || "");
  }, [userProfile]);

  return (
    <div className="space-y-8">
      <div className="grid gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Profile Information</h3>
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
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about your investment strategy..."
              className="h-24"
            />
          </div>
          <Button onClick={handleUpdateProfile} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
          <div className="space-y-0.5">
            <Label htmlFor="public-profile" className="text-base">
              Public Portfolio
            </Label>
            <p className="text-sm text-muted-foreground">
              Make your holdings and performance visible to the community.
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
              Anyone with this link can view your investment summary.
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
      </div>
    </div>
  );
}
