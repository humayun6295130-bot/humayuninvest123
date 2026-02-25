"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useFirestore, useUser, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { useEffect, useState } from "react";

export function UserSettings({ userProfile }: { userProfile: any }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isPublic, setIsPublic] = useState(userProfile.isPublic || false);

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
        displayName: userProfile.displayName,
        bio: userProfile.bio || "",
        profilePictureUrl: userProfile.profilePictureUrl || "",
      };
      setDocumentNonBlocking(publicProfileRef, publicProfileData, { merge: true });
    } else {
      deleteDocumentNonBlocking(publicProfileRef);
    }
  };

  useEffect(() => {
    setIsPublic(userProfile.isPublic || false);
  }, [userProfile]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="public-profile" className="text-base">
            Public Profile
          </Label>
          <p className="text-sm text-muted-foreground">
            Make your portfolio visible to others via a public link.
          </p>
        </div>
        <Switch
          id="public-profile"
          checked={isPublic}
          onCheckedChange={handlePublicToggle}
        />
      </div>
       {isPublic && userProfile?.username && (
        <div className="rounded-lg border p-4">
          <Label className="text-base">Your Public URL</Label>
           <p className="text-sm text-muted-foreground">
            Share this link with others to show your portfolio.
          </p>
          <a
            href={`/u/${userProfile.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {typeof window !== 'undefined' && `${window.location.origin}/u/${userProfile.username}`}
          </a>
        </div>
      )}
    </div>
  );
}
