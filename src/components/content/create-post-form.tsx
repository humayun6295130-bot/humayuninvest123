'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { collection, serverTimestamp } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useFirestore, addDocumentNonBlocking } from "@/firebase";
import { slugify } from "@/lib/utils";
import { useState } from "react";

const formSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  content: z.string().min(50, { message: "Content must be at least 50 characters." }),
});

export function CreatePostForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    if (!user) {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "You must be logged in to create a post.",
        });
        setIsLoading(false);
        return;
    }

    try {
        const postsCollectionRef = collection(firestore, "users", user.uid, "draft_posts");
        
        const newPost = {
            title: values.title,
            slug: slugify(values.title),
            contentHtml: values.content, // For now, we'll store raw text as HTML. A markdown editor could be added later.
            authorId: user.uid,
            publishedDate: null,
            lastModifiedDate: serverTimestamp(),
            status: 'draft',
            summary: values.content.substring(0, 150),
        };

        await addDocumentNonBlocking(postsCollectionRef, newPost);

        toast({
            title: "Draft Saved",
            description: "Your new post has been saved as a draft.",
        });

        router.push("/content");

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Saving Post",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Create a New Post</CardTitle>
            <CardDescription>Write your article, analysis, or insight here. It will be saved as a draft.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Post Title</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., The Future of Decentralized Finance" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Write your thoughts here..." {...field} disabled={isLoading} className="min-h-64" />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <div className="flex justify-end gap-4">
                    <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Saving..." : "Save Draft"}
                    </Button>
                </div>
                </form>
            </Form>
        </CardContent>
    </Card>
  );
}
