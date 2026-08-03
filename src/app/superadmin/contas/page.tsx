import { CircleOff, ShieldAlert, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin, isSuperadmin } from "@/lib/superadmin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ContaAcoes, type ContaRow } from "./conta-acoes";

export default async function SuperadminContasPage() {
  await requireSuperadmin();

  const contas = await prisma.conta.findMany({
    orderBy: [{ ativa: "desc" }, { email: "asc" }],
    include: { _count: { select: { organizacoes: true } } },
  });

  const linhas: ContaRow[] = contas.map((c) => ({
    id: c.id,
    nome: c.nome ?? "",
    email: c.email ?? "—",
    telefone: c.telefone ?? "",
    ativa: c.ativa,
    trocarSenha: c.trocarSenha,
    organizacoes: c._count.organizacoes,
    ehSuperadmin: isSuperadmin(c.email),
  }));

  const inativas = linhas.filter((l) => !l.ativa).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            Contas ({linhas.length})
          </CardTitle>
          <CardDescription>
            {inativas > 0
              ? `${inativas} inativa(s) — login bloqueado.`
              : "Todas ativas."}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {linhas.map((c) => (
          <Card key={c.id} className={c.ativa ? "" : "border-destructive/40"}>
            <CardContent className="flex flex-wrap items-start justify-between gap-4 pt-6">
              <div className="min-w-0 space-y-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {c.nome || "(sem nome)"}
                  {c.ehSuperadmin && (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                      <ShieldAlert className="h-3 w-3" />
                      Superadmin
                    </span>
                  )}
                  {!c.ativa && (
                    <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                      <CircleOff className="h-3 w-3" />
                      Inativa
                    </span>
                  )}
                  {c.trocarSenha && (
                    <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      troca de senha pendente
                    </span>
                  )}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {c.email}
                  {c.telefone && ` · ${c.telefone}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.organizacoes}{" "}
                  {c.organizacoes === 1 ? "organização" : "organizações"}
                </p>
              </div>
              <ContaAcoes conta={c} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
