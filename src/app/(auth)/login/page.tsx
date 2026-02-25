import { LoginForm } from "@/components/auth/login-form";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | AscendFolio',
  description: 'Sign in to your AscendFolio account.',
};

export default function LoginPage() {
  return <LoginForm />;
}
