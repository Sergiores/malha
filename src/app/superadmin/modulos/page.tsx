import { Boxes, CircleOff } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/superadmin";
import { situacaoDaLicenca } from "@/lib/modulo";
import { Card, CardContent } from "@/components/ui/card";
import { SincronizarButton } from "./sincronizar-button";

export default async function SuperadminModulosPage() {
  await requireSuperadmin();

  const modulos = await prisma.modulo.findMany({
    orderBy: [{ ativo: "desc" }, { ordem: "asc" }],
    include: {
      _count: { select: { calculadoras: true } },
      organizacoes: { select: { ativo: true, validoDe: true, validoAte: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Módulos ({modulos.length})</h2>
          <p className="text-sm text-muted-foreground">
            Definidos em <code>src/core/registry.ts</code>. Módulo removido
            do código é desativado, nunca apagado — as licenças históricas
            continuam apontando para ele.
          </p>
        </div>
        <SincronizarButton />
      </div>

      <div className="space-y-3">
        {modulos.map((m) => {
          const vigentes = m.organizacoes.filter(
            (l) => situacaoDaLicenca(l) === "vigente"
          ).length;
          return (
            <Card key={m.id} className={m.ativo ? "" : "border-destructive/40"}>
              <CardContent className="flex flex-wrap items-start justify-between gap-4 pt-6">
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    <Boxes className="h-4 w-4 text-primary" />
                    {m.nome}
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {m.slug}
                    </code>
                    {!m.ativo && (
                      <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                        <CircleOff className="h-3 w-3" />
                        Desativado
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {m.descricao}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>
                    {m._count.calculadoras} calculadora(s)
                  </p>
                  <p>
                    {vigentes} licença(s) vigente(s) de{" "}
                    {m.organizacoes.length}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
