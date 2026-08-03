import { Ruler } from "lucide-react";

export default function Home() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-16">
      <div className="mb-6 flex items-center gap-3">
        <Ruler className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Malha</h1>
      </div>
      <p className="max-w-2xl text-lg text-muted-foreground">
        Plataforma de cálculo, verificação normativa e memorial técnico para
        engenharia estrutural.
      </p>
      <p className="mt-8 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Fase 0 — fundação. Autenticação e módulos entram nas fases seguintes.
      </p>
    </main>
  );
}
