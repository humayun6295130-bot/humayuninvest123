import { DollarSign } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <DollarSign className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold">AscendFolio</h1>
          <p className="text-muted-foreground">Your financial journey starts here.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
