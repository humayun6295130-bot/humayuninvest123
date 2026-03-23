import { LoginForm } from "@/components/auth/login-form";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | BTCMine',
  description: 'Sign in to your BTCMine account to start mining BTC.',
};

export default function LoginPage() {
  return <LoginForm />;
}
