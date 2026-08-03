import { ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireMembroOrg, parseIdOrg } from "@/lib/organizacao";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import { MembroAcoes, type MembroRow } from "./membro-acoes";

export default async function MembrosPage({
  params,
}: {
  params: Promise<{ idOrg: string }>;
}) {
  const { idOrg } = await params;
  const id = parseIdOrg(idOrg);
  const { organizacao, papel, conta } = await requireMembroOrg(id);
  const ehAdmin = papel === "ADMIN";

  const membros = await prisma.organizacaoMembro.findMany({
    where: { idOrganizacao: id },
    include: { conta: { select: { id: true, nome: true, email: true } } },
    orderBy: [{ papel: "asc" }, { conta: { nome: "asc" } }],
  });

  const linhas: MembroRow[] = membros.map((m) => ({
    id: m.id,
    nome: m.conta.nome ?? "—",
    email: m.conta.email ?? "—",
    papel: m.papel,
    ehVoce: m.conta.id === conta.id,
  }));

  return (
    <div className="space-y-4">
      {ehAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Código de convite</CardTitle>
            <CardDescription>
              Quem entrar com este código vira membro da organização.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <code className="rounded bg-muted px-3 py-1.5 font-mono text-lg tracking-widest">
              {organizacao.codigoConvite}
            </code>
            <CopyButton texto={organizacao.codigoConvite} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Membros ({linhas.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {linhas.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  {m.nome}
                  {m.ehVoce && (
                    <span className="text-xs text-muted-foreground">
                      (você)
                    </span>
                  )}
                  {m.papel === "ADMIN" && (
                    <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <ShieldCheck className="h-3 w-3" />
                      Admin
                    </span>
                  )}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {m.email}
                </p>
              </div>
              {ehAdmin && <MembroAcoes idOrganizacao={id} membro={m} />}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
