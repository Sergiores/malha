import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/superadmin";
import { hojeUtc, situacaoDaLicenca } from "@/lib/modulo";
import { idSchema, isoDeData } from "@/lib/validations/superadmin";
import { Button } from "@/components/ui/button";
import { LicencaForm, type LicencaRow } from "./licenca-form";

const ROTULOS: Record<string, { rotulo: string; classe: string }> = {
  vigente: { rotulo: "Vigente", classe: "bg-primary/10 text-primary" },
  vencida: { rotulo: "Vencida", classe: "bg-destructive/10 text-destructive" },
  revogada: { rotulo: "Revogada", classe: "bg-destructive/10 text-destructive" },
  sem_licenca: { rotulo: "Sem licença", classe: "bg-muted text-muted-foreground" },
};

export default async function LicencasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperadmin();

  const { id } = await params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) notFound();
  const idOrg = parsed.data;

  const org = await prisma.organizacao.findUnique({
    where: { id: idOrg },
    include: { _count: { select: { membros: true } } },
  });
  if (!org) notFound();

  const modulos = await prisma.modulo.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
    include: { organizacoes: { where: { idOrganizacao: idOrg } } },
  });

  const linhas: LicencaRow[] = modulos.map((m) => {
    const l = m.organizacoes[0];
    const situacao = situacaoDaLicenca(l);
    return {
      idModulo: m.id,
      nome: m.nome,
      slug: m.slug,
      temLicenca: !!l,
      ativo: l?.ativo ?? false,
      validoDe: isoDeData(l?.validoDe),
      validoAte: isoDeData(l?.validoAte),
      observacao: l?.observacao ?? "",
      situacao,
      rotuloSituacao: ROTULOS[situacao].rotulo,
      classeSituacao: ROTULOS[situacao].classe,
    };
  });

  const hoje = isoDeData(hojeUtc());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/superadmin/organizacoes">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Organizações
            </Button>
          </Link>
          <h2 className="mt-2 flex items-center gap-2 text-lg font-semibold">
            <Building2 className="h-5 w-5 text-primary" />
            {org.nome}
          </h2>
          <p className="text-sm text-muted-foreground">
            {org._count.membros}{" "}
            {org._count.membros === 1 ? "membro" : "membros"} · código{" "}
            <code className="font-mono">{org.codigoConvite}</code>
            {!org.ativa && " · ORGANIZAÇÃO BLOQUEADA"}
          </p>
        </div>
      </div>

      {!org.ativa && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          A organização está bloqueada: nenhum membro acessa, mesmo com
          licença vigente. Desbloqueie na lista de organizações.
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {linhas.map((l) => (
          <LicencaForm
            key={l.idModulo}
            idOrganizacao={idOrg}
            licenca={l}
            hoje={hoje}
          />
        ))}
      </div>
    </div>
  );
}
