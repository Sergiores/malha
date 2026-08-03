import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { contaComOrganizacao } from "@/lib/organizacao";
import { STATUS_INFO, brl, dataHoraBr } from "@/lib/analise";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ResumoResultado = { custoTotal?: number; m?: number; alfa?: number };

export default async function AnalisesPage() {
  const { organizacao } = await contaComOrganizacao();

  const analises = await prisma.analise.findMany({
    where: { idOrganizacao: organizacao.id },
    orderBy: { createdAt: "desc" },
    include: { calculadora: { select: { nome: true, slug: true } } },
    take: 200,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Análises</h1>
          <p className="text-muted-foreground">
            Cada cálculo salvo vira um registro com data, status e laudo.
          </p>
        </div>
        <Link href="/m/concreto-fresco-endurecido/dosagem-caa">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Nova dosagem
          </Button>
        </Link>
      </div>

      {analises.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-muted-foreground" />
              Nenhuma análise ainda
            </CardTitle>
            <CardDescription>
              Faça um cálculo e clique em “Salvar análise”.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Título</th>
                    <th className="px-4 py-2 font-medium">Calculadora</th>
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-4 py-2 text-right font-medium">
                      Custo/m³
                    </th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analises.map((a) => {
                    const r = a.resultados as ResumoResultado | null;
                    const s = STATUS_INFO[a.status];
                    return (
                      <tr
                        key={a.id}
                        className="border-b transition-colors last:border-0 hover:bg-accent/50"
                      >
                        <td className="px-4 py-2">
                          <Link
                            href={`/analises/${a.id}`}
                            className="font-medium hover:underline"
                          >
                            {a.titulo}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {a.calculadora.nome}
                        </td>
                        <td className="px-4 py-2 tabular-nums text-muted-foreground">
                          {dataHoraBr(a.createdAt)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {typeof r?.custoTotal === "number"
                            ? brl(r.custoTotal)
                            : "—"}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${s.classe}`}
                          >
                            {s.rotulo}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
