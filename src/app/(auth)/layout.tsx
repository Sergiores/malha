import Link from "next/link";
import { Ruler } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <Ruler className="h-7 w-7 text-primary" />
        <span className="text-2xl font-bold tracking-tight">Malha</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
