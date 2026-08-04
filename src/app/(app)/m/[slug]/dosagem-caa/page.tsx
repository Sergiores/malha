import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { requireModulo } from "@/lib/modulo";
import { prisma } from "@/lib/prisma";
import { contaComOrganizacao } from "@/lib/organizacao";
import { Button } from "@/components/ui/button";
import { FormDosagem } from "./form-dosagem";

export default async function DosagemCaaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { modulo } = await requireModulo(slug);

  // A calculadora pertence a este módulo — evita que ela abra por um slug
  // de módulo que o usuário licenciou mas que não a contém.
  const calc = await prisma.calculadora.findUnique({
    where: { slug: "dosagem-caa" },
    select: { idModulo: true, nome: true, descricao: true, ativa: true },
  });
  if (!calc || !calc.ativa || calc.idModulo !== modulo.id) notFound();

  const { organizacao } = await contaComOrganizacao();
  const recentes = await prisma.analise.count({
    where: {
      idOrganizacao: organizacao.id,
      calculadora: { idModulo: modulo.id },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/m/${slug}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              {modulo.nome}
            </Button>
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {calc.nome}
          </h1>
          <p className="max-w-2xl text-muted-foreground">{calc.descricao}</p>
        </div>
        {recentes > 0 && (
          <Link href="/analises">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4" />
              {recentes} análise(s)
            </Button>
          </Link>
        )}
      </div>

      <FormDosagem />
    </div>
  );
}
