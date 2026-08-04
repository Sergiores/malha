import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/modulo";
import { contaComOrganizacao } from "@/lib/organizacao";
import { dataHoraBr } from "@/lib/analise";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClienteForm } from "../cliente-form";

export default async function EditarClientePage({
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

  // Filtro por organização: id de outra carteira dá 404, não 403.
  const cliente = await prisma.cliente.findFirst({
    where: { id: idNum, idOrganizacao: organizacao.id },
    include: {
      analises: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          calculadora: {
            select: { nome: true, modulo: { select: { slug: true } } },
          },
        },
      },
    },
  });
  if (!cliente) notFound();

  const base = `/m/${slug}/clientes`;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
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
          Cadastrado em {dataHoraBr(cliente.createdAt)}
          {!cliente.ativo && " · inativo"}
        </p>
      </div>

      <ClienteForm
        voltarPara={base}
        valores={{
          id: cliente.id,
          nome: cliente.nome,
          cpfCnpj: cliente.cpfCnpj ?? "",
          endereco: cliente.endereco ?? "",
          bairro: cliente.bairro ?? "",
          cidade: cliente.cidade ?? "",
          uf: cliente.uf ?? "",
          cep: cliente.cep ?? "",
          fone: cliente.fone ?? "",
          email: cliente.email ?? "",
          contato: cliente.contato ?? "",
        }}
      />

      {cliente.analises.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-muted-foreground" />
              Análises deste cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {cliente.analises.map((a) => (
              <Link
                key={a.id}
                href={`/m/${a.calculadora.modulo.slug}/analises/${a.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-6 py-2.5 text-sm transition-colors hover:bg-accent/50"
              >
                <span className="font-medium">{a.titulo}</span>
                <span className="text-xs text-muted-foreground">
                  {a.calculadora.nome} · {dataHoraBr(a.createdAt)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
