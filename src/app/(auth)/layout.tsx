import Link from "next/link";
import { Ruler } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      {/* Halo suave atrás do cartão — dá profundidade sem competir com o
          formulário. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <Link href="/" className="surgir group relative mb-8 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 transition-colors group-hover:border-primary/60">
          <Ruler className="h-5 w-5 text-primary transition-transform duration-300 group-hover:rotate-45" />
        </span>
        <span className="flex flex-col leading-none">
          <span className="text-2xl font-bold tracking-tight">Malha</span>
          <span className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            cálculo estrutural
          </span>
        </span>
      </Link>

      <div className="surgir relative w-full max-w-sm [animation-delay:80ms]">
        {children}
      </div>

      <p className="surgir relative mt-8 text-xs text-muted-foreground [animation-delay:160ms]">
        Dosagem · Granulometria · Memorial técnico
      </p>
    </div>
  );
}
