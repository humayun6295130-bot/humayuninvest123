"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useFirebase, insertRow } from "@/firebase";
import { useState } from "react";
import { generateSupportId } from "@/lib/support-id";
import { query, collection, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";

// Function to generate unique support ID
async function generateUniqueSupportId(): Promise<string> {
  if (!db) throw new Error("Firebase not configured");

  let supportId = generateSupportId();
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    // Check if this ID already exists
    const q = query(
      collection(db, "users"),
      where("support_id", "==", supportId)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      isUnique = true;
    } else {
      // Generate new ID if exists
      supportId = generateSupportId();
      attempts++;
    }
  }

  return supportId;
}

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  username: z.string().min(3, { message: "Username must be at least 3 characters." }).regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores."),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

export function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { isConfigured } = useFirebase();
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    try {
      if (!isConfigured) {
        throw new Error('Firebase is not configured. Please check your environment variables.');
      }

      // Check if this user should be an admin based on their email
      const isAdmin = values.email.toLowerCase() === "humayunlbb@gmail.com";

      // Create user with Firebase Auth
      const userCredential = await signUp(values.email, values.password);
      const user = userCredential.user;

      if (!user) throw new Error("User creation failed.");

      // Generate unique support ID for this user
      const supportId = await generateUniqueSupportId();

      // Create user profile in database
      await insertRow("users", {
        id: user.uid,
        email: values.email,
        username: values.username,
        display_name: values.name,
        is_public: false,
        bio: "",
        profile_picture_url: "",
        balance: 0,
        role: isAdmin ? "admin" : "user",
        currency_preference: "USD",
        support_id: supportId, // Unique support reference number
      });

      // Create a default portfolio for the new user
      await insertRow("portfolios", {
        user_id: user.uid,
        name: "My First Portfolio",
      });

      if (isAdmin) {
        await insertRow("roles_admin", {
          user_id: user.uid,
          email: values.email,
          display_name: values.name,
        });
      }

      toast({
        title: "Registration Successful",
        description: `Your account has been created. ${isAdmin ? "You have been assigned admin privileges." : ""}`,
      });

      setIsLoading(false);

      // Use window.location for full page navigation to ensure auth state is fresh
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 100);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "An unexpected error occurred.",
      });
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4 pt-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="john_doe" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Button variant="link" asChild className="p-0 h-auto">
                <Link href="/login">Sign in</Link>
              </Button>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
