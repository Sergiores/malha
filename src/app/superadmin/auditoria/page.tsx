import { ScrollText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/superadmin";
import { Card, CardContent } from "@/components/ui/card";

const LIMITE = 200;

function dataHora(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export default async function AuditoriaPage() {
  await requireSuperadmin();

  const logs = await prisma.logAuditoria.findMany({
    orderBy: { createdAt: "desc" },
    take: LIMITE,
    include: { conta: { select: { email: true, nome: true } } },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ScrollText className="h-5 w-5 text-primary" />
          Auditoria
        </h2>
        <p className="text-sm text-muted-foreground">
          Últimos {LIMITE} registros. Quem concedeu ou revogou o quê, e quando.
        </p>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Nenhum registro ainda.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {logs.map((l) => (
              <div key={l.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{l.acao}</span>
                  <span className="text-xs text-muted-foreground">
                    {dataHora(l.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {l.conta?.nome ?? l.conta?.email ?? "sistema"} ·{" "}
                  {l.entidade}
                  {l.entidadeId !== null && ` #${l.entidadeId}`}
                </p>
                {l.detalhes !== null && (
                  <pre className="mt-1 overflow-x-auto rounded bg-muted px-2 py-1 text-xs">
                    {JSON.stringify(l.detalhes)}
                  </pre>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
