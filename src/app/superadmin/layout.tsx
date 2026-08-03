import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { requireSuperadmin } from "@/lib/superadmin";
import { sair } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

const ABAS = [
  { href: "/superadmin/contas", rotulo: "Contas" },
  { href: "/superadmin/organizacoes", rotulo: "Organizações" },
  { href: "/superadmin/modulos", rotulo: "Módulos" },
  { href: "/superadmin/auditoria", rotulo: "Auditoria" },
];

/**
 * Guard no layout — é o que garante que uma sub-rota criada meses depois
 * não vaze o painel por esquecimento. As pages e actions repetem.
 */
export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireSuperadmin();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-amber-500/10">
        <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link
            href="/superadmin/contas"
            className="flex items-center gap-2"
          >
            <Shield className="h-6 w-6 text-amber-700 dark:text-amber-400" />
            <span className="font-bold tracking-tight">Superadmin Malha</span>
          </Link>
          <nav className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {user.email}
            </span>
            <Link href="/app">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">App normal</span>
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

      <div className="border-b bg-background">
        <div className="container mx-auto flex max-w-6xl gap-1 px-4 py-2 text-sm">
          {ABAS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="rounded-md px-3 py-1.5 hover:bg-accent"
            >
              {a.rotulo}
            </Link>
          ))}
        </div>
      </div>

      <main className="container mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
