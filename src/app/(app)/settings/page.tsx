"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth, useFirestore, useUser, useDoc, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";


export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  const userDocRef = user ? doc(firestore, "users", user.uid) : null;
  const { data: userProfile, isLoading: isUserLoading } = useDoc(userDocRef);

  useEffect(() => {
    if (userProfile) {
      setUserData(userProfile);
      setIsPublic(userProfile.isPublic || false);
      setIsLoading(false);
    }
  }, [userProfile]);

  const handlePublicToggle = async (checked: boolean) => {
    if (!user || !firestore || !userData) return;

    setIsPublic(checked);
    const userDocRef = doc(firestore, "users", user.uid);
    updateDocumentNonBlocking(userDocRef, { isPublic: checked });

    const publicProfileRef = doc(firestore, "public_profiles", userData.username);

    if (checked) {
      const publicProfileData = {
        userId: user.uid,
        username: userData.username,
        displayName: userData.displayName,
        bio: userData.bio || "",
        profilePictureUrl: userData.profilePictureUrl || "",
      };
      setDocumentNonBlocking(publicProfileRef, publicProfileData, { merge: true });
    } else {
      deleteDocumentNonBlocking(publicProfileRef);
    }
  };

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
               {isPublic && userData?.username && (
                <div className="rounded-lg border p-4">
                  <Label className="text-base">Your Public URL</Label>
                   <p className="text-sm text-muted-foreground">
                    Share this link with others to show your portfolio.
                  </p>
                  <a
                    href={`/u/${userData.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {window.location.origin}/u/{userData.username}
                  </a>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
    