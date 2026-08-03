import Link from "next/link";
import { Building2, CircleOff, PackageCheck, Settings2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/superadmin";
import { situacaoDaLicenca } from "@/lib/modulo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NovaOrganizacaoAdmin, BotaoBloquear } from "./org-acoes";

export default async function SuperadminOrganizacoesPage() {
  await requireSuperadmin();

  const orgs = await prisma.organizacao.findMany({
    orderBy: [{ ativa: "desc" }, { nome: "asc" }],
    include: {
      _count: { select: { membros: true } },
      modulos: { select: { ativo: true, validoDe: true, validoAte: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          Organizações ({orgs.length})
        </h2>
        <NovaOrganizacaoAdmin />
      </div>

      {orgs.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Nenhuma organização cadastrada.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {orgs.map((o) => {
          const vigentes = o.modulos.filter(
            (m) => situacaoDaLicenca(m) === "vigente"
          ).length;
          return (
            <Card key={o.id} className={o.ativa ? "" : "border-destructive/40"}>
              <CardContent className="flex flex-wrap items-start justify-between gap-4 pt-6">
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    <Building2 className="h-4 w-4 text-primary" />
                    {o.nome}
                    {!o.ativa && (
                      <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                        <CircleOff className="h-3 w-3" />
                        Bloqueada
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {o.cnpj && `CNPJ ${o.cnpj} · `}
                    código <code className="font-mono">{o.codigoConvite}</code>
                  </p>
                  <p className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {o._count.membros}{" "}
                      {o._count.membros === 1 ? "membro" : "membros"}
                    </span>
                    <span className="flex items-center gap-1">
                      <PackageCheck className="h-3 w-3" />
                      {vigentes} de {o.modulos.length} licença(s) vigente(s)
                    </span>
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
