import Link from "next/link";
import { Ruler, Shield, UserRound } from "lucide-react";
import { requireConta } from "@/lib/auth";
import { isSuperadmin } from "@/lib/superadmin";
import { calculadorasPorModulo, meusModulos } from "@/lib/modulo";
import { MODULOS_SEM_ANALISE } from "@/core/registry";
import { sair } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { MenuModulos, type ItemMenu } from "@/components/menu-modulos";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard no layout: toda rota nova sob (app) já nasce protegida.
  const { conta } = await requireConta();
  const ehSuper = isSuperadmin(conta.email);

  const [modulos, calcs] = await Promise.all([
    meusModulos(),
    calculadorasPorModulo(),
  ]);

  const itens: ItemMenu[] = modulos.map((m) => {
    const liberado = m.situacao === "vigente";
    return {
      slug: m.slug,
      nome: m.nome,
      liberado,
      situacao: m.situacao,
      // Sub-itens só de módulo liberado. As análises são específicas do
      // módulo, então vivem aqui — não num menu global. Módulos que são só
      // cadastro não ganham o item, senão a lista abriria sempre vazia.
      filhos: liberado
        ? [
            ...(calcs.get(m.slug) ?? []).map((c) => ({
              href: `/m/${m.slug}/${c.slug}`,
              rotulo: c.nome,
            })),
            ...(MODULOS_SEM_ANALISE.includes(m.slug)
              ? []
              : [{ href: `/m/${m.slug}/analises`, rotulo: "Análises" }]),
          ]
        : [],
    };
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/app" className="flex items-center gap-2">
            <Ruler className="h-6 w-6 text-primary" />
            <span className="font-bold tracking-tight">Malha</span>
          </Link>
          <nav className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {conta.nome ?? conta.email}
            </span>
            {ehSuper && (
              <Link href="/superadmin/contas">
                <Button variant="ghost" size="sm">
                  <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="hidden sm:inline">Superadmin</span>
                </Button>
              </Link>
            )}
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

      <div className="container mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-6 rounded-lg border bg-background p-2">
            <MenuModulos itens={itens} />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
