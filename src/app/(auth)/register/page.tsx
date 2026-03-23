import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register | BTCMine',
  description: 'Create a new BTCMine account and start mining BTC today.',
};

function RegisterFormWithParams() {
  return <RegisterForm />;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-8 bg-orange-500 rounded-full"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <RegisterFormWithParams />
    </Suspense>
  );
}
