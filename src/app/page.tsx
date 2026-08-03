import Link from "next/link";
import { Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-16">
      <div className="mb-6 flex items-center gap-3">
        <Ruler className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Malha</h1>
      </div>
      <p className="mb-8 max-w-2xl text-lg text-muted-foreground">
        Plataforma de cálculo, verificação normativa e memorial técnico para
        engenharia estrutural.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/cadastro">
          <Button size="lg">Criar conta</Button>
        </Link>
        <Link href="/login">
          <Button size="lg" variant="outline">
            Entrar
          </Button>
        </Link>
      </div>
    </main>
  );
}
