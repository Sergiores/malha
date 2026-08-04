import Link from "next/link";
import { Ruler, Shield, UserRound } from "lucide-react";
import { requireConta } from "@/lib/auth";
import { isSuperadmin } from "@/lib/superadmin";
import { calculadorasPorModulo, meusModulos } from "@/lib/modulo";
import { MODULOS_SEM_ANALISE } from "@/core/registry";
import { sair } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { MenuModulos, type ItemMenu } from "@/components/menu-modulos";
import { AlternadorTema } from "@/components/alternador-tema";

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
    <div className="min-h-screen">
      {/* Cabeçalho fixo e translúcido: a malha do fundo corre por baixo
          enquanto a página rola. */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        {/* Fio de luz superior — detalhe de instrumento. */}
        <div
          aria-hidden
          className="h-px w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent"
        />
        <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/app" className="group flex items-center gap-2.5">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 transition-colors group-hover:border-primary/60">
              <Ruler className="h-4 w-4 text-primary transition-transform duration-300 group-hover:rotate-45" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-bold tracking-tight">Malha</span>
              <span className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                cálculo estrutural
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1.5">
            <span className="hidden text-xs text-muted-foreground lg:inline">
              {conta.nome ?? conta.email}
            </span>
            <AlternadorTema />
            {ehSuper && (
              <Link href="/superadmin/contas">
                <Button variant="ghost" size="sm" className="varredura">
                  <Shield className="h-4 w-4 text-amber-500" />
                  <span className="hidden sm:inline">Superadmin</span>
                </Button>
              </Link>
            )}
            <Link href="/perfil">
              <Button variant="ghost" size="sm" className="varredura">
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
        <aside className="hidden w-60 shrink-0 md:block">
          <div className="card-tec sticky top-20 rounded-xl p-2 shadow-sm">
            <MenuModulos itens={itens} />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
