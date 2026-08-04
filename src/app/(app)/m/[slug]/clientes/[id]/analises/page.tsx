import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModulo, hojeUtc } from "@/lib/modulo";
import { contaComOrganizacao } from "@/lib/organizacao";
import { STATUS_INFO, brl, dataHoraBr } from "@/lib/analise";
import { dataBr } from "@/lib/utils";
import { formatarDocumento } from "@/lib/documento";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ResumoResultado = { custoTotal?: number };

/**
 * Análises de um cliente — atravessa os módulos de propósito.
 *
 * A carteira mora no módulo Geral, mas as análises são de dosagem, de
 * granulometria, do que vier. Quem abre a ficha do cliente quer o histórico
 * dele inteiro, não o recorte de um módulo. Por isso cada linha aponta para
 * o módulo da própria análise (`calculadora.modulo.slug`) — e é lá que o
 * `requireModulo()` decide se aquela licença ainda vale.
 */
export default async function AnalisesDoClientePage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum)) notFound();

  const { modulo } = await requireModulo(slug);
  const calc = await prisma.calculadora.findUnique({
    where: { slug: "clientes" },
    select: { idModulo: true, ativa: true },
  });
  if (!calc || !calc.ativa || calc.idModulo !== modulo.id) notFound();

  const { organizacao } = await contaComOrganizacao();

  // O filtro por organização vale para o cliente e, por tabela, para as
  // análises — id de outra carteira dá 404, não 403.
  const cliente = await prisma.cliente.findFirst({
    where: { id: idNum, idOrganizacao: organizacao.id },
    include: {
      analises: {
        orderBy: { createdAt: "desc" },
        take: 300,
        include: {
          calculadora: {
            select: { nome: true, modulo: { select: { slug: true, nome: true } } },
          },
        },
      },
    },
  });
  if (!cliente) notFound();

  const base = `/m/${slug}/clientes`;
  const hoje = hojeUtc();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={base}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Clientes
            </Button>
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {cliente.nome}
          </h1>
          <p className="text-sm text-muted-foreground">
            {cliente.cpfCnpj && `${formatarDocumento(cliente.cpfCnpj)} · `}
            {cliente.analises.length}{" "}
            {cliente.analises.length === 1
              ? "análise registrada"
              : "análises registradas"}
            {!cliente.ativo && " · cliente inativo"}
          </p>
        </div>
        <Link href={`${base}/${cliente.id}`}>
          <Button variant="outline" size="sm" className="varredura">
            <Pencil className="h-4 w-4" />
            Editar cadastro
          </Button>
        </Link>
      </div>

      {cliente.analises.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-muted-foreground" />
              Nenhuma análise para este cliente
            </CardTitle>
            <CardDescription>
              O cliente é informado na tela da calculadora, antes de salvar a
              análise.
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
                    <th className="px-4 py-2 font-medium">Validade</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cliente.analises.map((a) => {
                    const r = a.resultados as ResumoResultado | null;
                    const s = STATUS_INFO[a.status];
                    const vencido = a.validoAte !== null && a.validoAte < hoje;
                    return (
                      <tr
                        key={a.id}
                        className="border-b transition-colors last:border-0 hover:bg-accent/50"
                      >
                        <td className="px-4 py-2">
                          <Link
                            href={`/m/${a.calculadora.modulo.slug}/analises/${a.id}`}
                            className="font-medium hover:underline"
                          >
                            {a.titulo}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {a.calculadora.nome}
                          <p className="text-xs">{a.calculadora.modulo.nome}</p>
                        </td>
                        <td className="px-4 py-2 tabular-nums text-muted-foreground">
                          {dataHoraBr(a.createdAt)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {typeof r?.custoTotal === "number"
                            ? brl(r.custoTotal)
                            : "—"}
                        </td>
                        <td
                          className={`px-4 py-2 tabular-nums ${
                            vencido
                              ? "font-medium text-destructive"
                              : "text-muted-foreground"
                          }`}
                        >
                          {a.validoAte ? dataBr(a.validoAte) : "—"}
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
