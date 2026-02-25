'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";
import Link from "next/link";

export default function ContentPage() {
  // In the future, we will fetch and display posts here.

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Hub</h1>
          <p className="text-muted-foreground">Manage your articles, drafts, and published posts.</p>
        </div>
        <Button asChild>
          <Link href="/content/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Post
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Posts</CardTitle>
          <CardDescription>A list of all your content.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center rounded-md border-2 border-dashed">
            <p className="text-muted-foreground">You haven't created any posts yet.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
