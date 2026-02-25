import { RegisterForm } from "@/components/auth/register-form";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register | AscendFolio',
  description: 'Create a new AscendFolio account.',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
    