import Link from "next/link";
import { CircleOff, PackageCheck, Settings2, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/superadmin";
import { situacaoDaLicenca } from "@/lib/modulo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BotaoBloquear } from "./org-acoes";

export default async function SuperadminOrganizacoesPage() {
  await requireSuperadmin();

  const orgs = await prisma.organizacao.findMany({
    orderBy: [{ ativa: "desc" }, { nome: "asc" }],
    include: {
      membros: {
        include: { conta: { select: { email: true, nome: true } } },
        orderBy: { id: "asc" },
        take: 1,
      },
      modulos: { select: { ativo: true, validoDe: true, validoAte: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Clientes ({orgs.length})</h2>
        <p className="text-sm text-muted-foreground">
          Cada conta ganha a sua no primeiro acesso — não há criação manual.
          Quando o multiusuário entrar, é aqui que a empresa passa a ter vários
          membros.
        </p>
      </div>

      {orgs.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Nenhum cliente ainda. A organização aparece quando a pessoa entra
            pela primeira vez.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {orgs.map((o) => {
          const vigentes = o.modulos.filter(
            (m) => situacaoDaLicenca(m) === "vigente"
          ).length;
          const dono = o.membros[0]?.conta;
          return (
            <Card key={o.id} className={o.ativa ? "" : "border-destructive/40"}>
              <CardContent className="flex flex-wrap items-start justify-between gap-4 pt-6">
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    <UserRound className="h-4 w-4 text-primary" />
                    {o.nome}
                    {!o.ativa && (
                      <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                        <CircleOff className="h-3 w-3" />
                        Bloqueado
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {dono?.email ?? "sem conta vinculada"}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <PackageCheck className="h-3 w-3" />
                    {vigentes} de {o.modulos.length} licença(s) vigente(s)
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <Link href={`/superadmin/organizacoes/${o.id}/modulos`}>
                    <Button variant="outline" size="sm">
                      <Settings2 className="h-4 w-4" />
                      Licenças
                    </Button>
                  </Link>
                  <BotaoBloquear idOrganizacao={o.id} ativa={o.ativa} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
