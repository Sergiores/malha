import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleOff, Pencil, Plus, Power, Users } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/modulo";
import { contaComOrganizacao } from "@/lib/organizacao";
import { apenasDigitos, formatarDocumento } from "@/lib/documento";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { FiltrosClientes } from "./filtros-clientes";
import { alternarAtivoCliente } from "./actions";

export default async function ClientesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    nome?: string;
    cpfCnpj?: string;
    cidade?: string;
    uf?: string;
  }>;
}) {
  const { slug } = await params;
  const { modulo } = await requireModulo(slug);

  const calc = await prisma.calculadora.findUnique({
    where: { slug: "clientes" },
    select: { idModulo: true, ativa: true },
  });
  if (!calc || !calc.ativa || calc.idModulo !== modulo.id) notFound();

  const { organizacao } = await contaComOrganizacao();
  const f = await searchParams;

  // O filtro por organização vem primeiro e sempre: é o isolamento entre
  // clientes do SaaS, não uma conveniência da busca.
  const where: Prisma.ClienteWhereInput = { idOrganizacao: organizacao.id };
  if (f.nome) where.nome = { contains: f.nome, mode: "insensitive" };
  // O documento é gravado só com dígitos, então a busca também tira a
  // máscara — quem digita "12.345" encontra "12345...".
  if (f.cpfCnpj) where.cpfCnpj = { contains: apenasDigitos(f.cpfCnpj) };
  if (f.cidade) where.cidade = { contains: f.cidade, mode: "insensitive" };
  if (f.uf) where.uf = f.uf.toUpperCase();

  const clientes = await prisma.cliente.findMany({
    where,
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    include: { _count: { select: { analises: true } } },
    take: 300,
  });

  const base = `/m/${slug}/clientes`;
  const filtrando = Boolean(f.nome || f.cpfCnpj || f.cidade || f.uf);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Cadastro de Clientes
          </h1>
          <p className="text-muted-foreground">
            Carteira da organização. Usada para identificar as análises.
          </p>
        </div>
        <Link href={`${base}/novo`}>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Incluir cliente
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Consulta</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <FiltrosClientes base={base} />
          </Suspense>
        </CardContent>
      </Card>

      {clientes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-muted-foreground" />
              {filtrando
                ? "Nenhum cliente encontrado"
                : "Nenhum cliente cadastrado"}
            </CardTitle>
            <CardDescription>
              {filtrando
                ? "Ajuste os filtros ou limpe a consulta."
                : "Clique em “Incluir cliente” para começar."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {clientes.length}{" "}
              {clientes.length === 1
                ? "cliente encontrado"
                : "clientes encontrados"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Nome</th>
                    <th className="px-4 py-2 font-medium">CPF / CNPJ</th>
                    <th className="px-4 py-2 font-medium">Cidade / UF</th>
                    <th className="px-4 py-2 font-medium">Contato</th>
                    <th className="px-4 py-2 text-right font-medium">
                      Análises
                    </th>
                    <th className="px-4 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c) => (
                    <tr
                      key={c.id}
                      className={`border-b last:border-0 ${c.ativo ? "" : "opacity-60"}`}
                    >
                      <td className="px-4 py-2">
                        <Link
                          href={`${base}/${c.id}`}
                          className="font-medium hover:underline"
                        >
                          {c.nome}
                        </Link>
                        {!c.ativo && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            <CircleOff className="h-3 w-3" />
                            inativo
                          </span>
                        )}
                        {c.email && (
                          <p className="truncate text-xs text-muted-foreground">
                            {c.email}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2 tabular-nums text-muted-foreground">
                        {formatarDocumento(c.cpfCnpj)}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {c.cidade ?? "—"}
                        {c.uf ? ` / ${c.uf}` : ""}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {c.contato ?? "—"}
                        {c.fone && (
                          <p className="text-xs">{c.fone}</p>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {c._count.analises}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1">
                          <Link href={`${base}/${c.id}`}>
                            <Button variant="ghost" size="sm">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <form action={alternarAtivoCliente}>
                            <input type="hidden" name="id" value={c.id} />
                            <SubmitButton variant="ghost" size="sm">
                              <Power className="h-4 w-4" />
                              {c.ativo ? "Inativar" : "Reativar"}
                            </SubmitButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
