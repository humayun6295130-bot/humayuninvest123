"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, getDoc, serverTimestamp, collection, getDocs, query, limit } from "firebase/firestore";

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
import { useAuth, useFirestore, setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { useState } from "react";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  username: z.string().min(3, { message: "Username must be at least 3 characters." }).regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores."),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

export function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
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
      // Check for username uniqueness
      const usernameDocRef = doc(firestore, "public_profiles", values.username);
      const usernameDoc = await getDoc(usernameDocRef);
      if (usernameDoc.exists()) {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: "This username is already taken. Please choose another one.",
        });
        form.setError("username", { message: "This username is already taken." });
        setIsLoading(false);
        return;
      }

      // Check if this is the first user to determine admin status
      const usersCollectionRef = collection(firestore, "users");
      const firstUserQuery = query(usersCollectionRef, limit(1));
      const userSnapshot = await getDocs(firstUserQuery);
      const isAdmin = userSnapshot.empty;

      // Create user
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // Update profile
      await updateProfile(user, { displayName: values.name });

      // Create user document in Firestore
      const userDocRef = doc(firestore, "users", user.uid);
      const newUser = {
        id: user.uid,
        email: values.email,
        username: values.username,
        displayName: values.name,
        memberSince: serverTimestamp(),
        isPublic: false,
        bio: "",
        profilePictureUrl: "",
        balance: 0,
        role: isAdmin ? 'admin' : 'user',
      };
      setDocumentNonBlocking(userDocRef, newUser, { merge: false });

      // Create a default portfolio for the new user
      const portfolioCollectionRef = collection(firestore, "users", user.uid, "portfolios");
      addDocumentNonBlocking(portfolioCollectionRef, {
          userId: user.uid,
          name: "My First Portfolio",
          creationDate: serverTimestamp(),
          lastUpdatedDate: serverTimestamp(),
      });

      toast({
        title: "Registration Successful",
        description: `Your account has been created. ${isAdmin ? "You have been assigned admin privileges." : ""}`,
      });
      router.push("/dashboard");

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
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
