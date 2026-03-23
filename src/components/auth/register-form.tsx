"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useFirebase, insertRow } from "@/firebase";
import { useState, useEffect } from "react";
import { generateSupportId } from "@/lib/support-id";
import { query, collection, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { validateReferralCode, processNewReferral } from "@/lib/referral-system";
import { Users, Gift, TrendingUp } from "lucide-react";

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
  referralCode: z.string().optional(),
});

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { isConfigured } = useFirebase();
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState<string>("");
  const [referralValid, setReferralValid] = useState<{ valid: boolean; message: string; userId?: string }>({ valid: false, message: "" });

  // Get referral code from URL on mount
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      setReferralCode(refCode);
      validateReferralCode(refCode).then(result => {
        setReferralValid(result);
      });
    }
  }, [searchParams]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      referralCode: "",
    },
  });

  // Update referral code in form when it changes
  useEffect(() => {
    if (referralCode) {
      form.setValue("referralCode", referralCode);
    }
  }, [referralCode, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    try {
      if (!isConfigured) {
        throw new Error('Firebase is not configured. Please check your environment variables.');
      }

      // Check if this user should be an admin based on their email
      const isAdmin = values.email.toLowerCase() === "humayunlbb@gmail.com";

      // Validate referral code if provided
      let referrerId: string | null = null;
      if (values.referralCode || referralCode) {
        const refCode = values.referralCode || referralCode;
        const validation = await validateReferralCode(refCode);
        if (validation.valid && validation.userId) {
          referrerId = validation.userId;
        }
      }

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
        referral_earnings: 0,
        total_investment: 0,
        referral_level: 1,
        role: isAdmin ? "admin" : "user",
        currency_preference: "USD",
        support_id: supportId, // Unique support reference number
        referrer_id: referrerId, // Store who referred this user
        created_at: new Date().toISOString(),
      });

      // Create a default portfolio for the new user
      await insertRow("portfolios", {
        user_id: user.uid,
        name: "My First Portfolio",
      });

      // Initialize user's team record
      await insertRow("user_teams", {
        user_id: user.uid,
        total_members: 0,
        level1_count: 0,
        level2_count: 0,
        level3_count: 0,
        level4_count: 0,
        level5_count: 0,
        total_team_investment: 0,
        total_commission_earned: 0,
        current_level: 1,
        created_at: new Date().toISOString(),
      });

      // Create welcome notification
      await insertRow("notifications", {
        user_id: user.uid,
        title: "Welcome to BTCMine!",
        message: "Your account has been created successfully. Start exploring our BTC mining investment plans to start earning.",
        type: "system",
        is_read: false,
        created_at: new Date().toISOString(),
      });

      if (isAdmin) {
        await insertRow("roles_admin", {
          user_id: user.uid,
          email: values.email,
          display_name: values.name,
        });
      }

      // Process referral if valid referrer exists
      if (referrerId && user.uid) {
        try {
          await processNewReferral(
            referrerId,
            user.uid,
            values.email,
            values.username,
            0 // Initial investment is 0, will be updated when user makes first investment
          );
          toast({
            title: "Referral Applied!",
            description: `You were referred by a team member. They'll earn commission from your investments!`,
          });
        } catch (refError: any) {
          console.error("Error processing referral:", refError);
          // Don't fail registration if referral processing fails
        }
      }

      toast({
        title: "Registration Successful",
        description: `Your account has been created. ${isAdmin ? "You have been assigned admin privileges." : " Start investing to earn mining rewards!"}`,
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
    <Card className="w-full max-w-md mx-auto bg-slate-900 border-slate-800 shadow-2xl shadow-black/50">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Join BTCMine
        </CardTitle>
        <p className="text-sm text-muted-foreground text-center">
          Create your account and start mining BTC
        </p>

        {/* Show referral info if valid */}
        {referralValid.valid && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-green-400">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Referral code applied!</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              You'll earn mining rewards with your team
            </p>
          </div>
        )}
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your full name"
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:ring-orange-500 focus:border-orange-500"
                      {...field}
                      disabled={isLoading}
                    />
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
                  <FormLabel className="text-slate-300">Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your username"
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:ring-orange-500 focus:border-orange-500"
                      {...field}
                      disabled={isLoading}
                    />
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
                  <FormLabel className="text-slate-300">Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your email"
                      type="email"
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:ring-orange-500 focus:border-orange-500"
                      {...field}
                      disabled={isLoading}
                    />
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
                  <FormLabel className="text-slate-300">Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Create a password"
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:ring-orange-500 focus:border-orange-500"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hidden referral code field - auto-filled from URL */}
            <input type="hidden" {...form.register("referralCode")} value={referralCode} />
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              disabled={isLoading}
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>

            {/* Referral Benefits */}
            <div className="w-full p-4 bg-slate-800/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-orange-400">
                <Gift className="h-4 w-4" />
                <span className="text-sm font-medium">Referral Benefits</span>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3 text-green-400" />
                  <span>Earn 5% commission on direct referrals</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3 text-green-400" />
                  <span>Earn 4% on level 2 referrals</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3 text-green-400" />
                  <span>Earn 3% on level 3 referrals</span>
                </div>
              </div>
            </div>

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
