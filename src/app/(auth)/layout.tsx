import { Bitcoin } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/30">
            <Bitcoin className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">BTCMine</h1>
          <p className="text-slate-400 mt-1">Professional BTC Mining Platform</p>
        </div>
        {children}
      </div>
    </div>
  );
}
