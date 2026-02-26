"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useFirestore, useUser, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function UserSettings({ userProfile }: { userProfile: any }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isPublic, setIsPublic] = useState(userProfile.isPublic || false);
  const [displayName, setDisplayName] = useState(userProfile.displayName || "");
  const [bio, setBio] = useState(userProfile.bio || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateProfile = async () => {
    if (!user || !firestore) return;
    setIsSaving(true);
    try {
        const userDocRef = doc(firestore, "users", user.uid);
        await updateDocumentNonBlocking(userDocRef, { 
            displayName, 
            bio 
        });
        
        // If public profile exists, update it too
        if (isPublic) {
            const publicProfileRef = doc(firestore, "public_profiles", userProfile.username);
            setDocumentNonBlocking(publicProfileRef, {
                displayName,
                bio
            }, { merge: true });
        }

        toast({ title: "Profile Updated", description: "Your changes have been saved." });
    } catch (e) {
        toast({ variant: "destructive", title: "Error", description: "Failed to update profile." });
    } finally {
        setIsSaving(false);
    }
  };

  const handlePublicToggle = async (checked: boolean) => {
    if (!user || !firestore || !userProfile) return;

    setIsPublic(checked);
    const userDocRef = doc(firestore, "users", user.uid);
    updateDocumentNonBlocking(userDocRef, { isPublic: checked });

    const publicProfileRef = doc(firestore, "public_profiles", userProfile.username);

    if (checked) {
      const publicProfileData = {
        userId: user.uid,
        username: userProfile.username,
        displayName: displayName,
        bio: bio,
        profilePictureUrl: userProfile.profilePictureUrl || "",
      };
      setDocumentNonBlocking(publicProfileRef, publicProfileData, { merge: true });
    } else {
      deleteDocumentNonBlocking(publicProfileRef);
    }
  };

  useEffect(() => {
    setIsPublic(userProfile.isPublic || false);
    setDisplayName(userProfile.displayName || "");
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
