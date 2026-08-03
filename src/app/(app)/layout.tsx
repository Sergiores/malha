import Link from "next/link";
import { Ruler, UserRound } from "lucide-react";
import { requireConta } from "@/lib/auth";
import { sair } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard no layout: toda rota nova sob (app) já nasce protegida.
  const { conta } = await requireConta();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/app" className="flex items-center gap-2">
            <Ruler className="h-6 w-6 text-primary" />
            <span className="font-bold tracking-tight">Malha</span>
          </Link>
          <nav className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {conta.nome ?? conta.email}
            </span>
            <Link href="/perfil">
              <Button variant="ghost" size="sm">
                <UserRound className="h-4 w-4" />
                <span className="hidden sm:inline">Perfil</span>
              </Button>
            </Link>
            <form action={sair}>
              <Button variant="outline" size="sm" type="submit">
                Sair
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="container mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
