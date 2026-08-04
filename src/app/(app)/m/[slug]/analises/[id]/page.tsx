import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ruler } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { contaComOrganizacao } from "@/lib/organizacao";
import { requireModulo } from "@/lib/modulo";
import { STATUS_INFO, dataHoraBr } from "@/lib/analise";
import type { DosagemCaaResultado } from "@/core/calculators/dosagem-caa/calc";
import type { DosagemCaaInput } from "@/core/calculators/dosagem-caa/schema";
import type { GranulometriaResultado } from "@/core/calculators/granulometria-areias/calc";
import type { GranulometriaInput } from "@/core/calculators/granulometria-areias/schema";
import { ResultadoDosagem } from "@/components/resultado-dosagem";
import { ResultadoGranulometria } from "@/components/resultado-granulometria";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AcoesAnalise } from "./acoes-analise";

export default async function LaudoPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum)) notFound();

  const { modulo } = await requireModulo(slug);
  const { organizacao } = await contaComOrganizacao();

  // Dois filtros, dois propósitos: `idOrganizacao` isola o cliente,
  // `idModulo` impede abrir a análise de um módulo pela URL de outro.
  const analise = await prisma.analise.findFirst({
    where: {
      id: idNum,
      idOrganizacao: organizacao.id,
      calculadora: { idModulo: modulo.id },
    },
    include: {
      calculadora: { select: { nome: true, slug: true } },
      conta: { select: { nome: true, email: true } },
    },
  });
  if (!analise) notFound();

  const s = STATUS_INFO[analise.status];
  // Snapshot: exibimos o que foi gravado, não um recálculo. Um laudo emitido
  // em março tem de mostrar os mesmos números em dezembro. Por isso o corpo
  // do laudo é escolhido pelo slug da calculadora, e não por um formato
  // único de resultado.
  const ehDosagem = analise.calculadora.slug === "dosagem-caa";

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <Link href={`/m/${slug}/analises`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Análises
          </Button>
        </Link>
      </div>

      {/* Cabeçalho do laudo — some na tela, aparece na impressão */}
      <div className="hidden items-center gap-2 border-b pb-3 print:flex">
        <Ruler className="h-6 w-6" />
        <span className="text-lg font-bold">Malha</span>
        <span className="ml-auto text-sm">Laudo de dosagem</span>
      </div>

      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${s.classe}`}>
            {s.rotulo}
          </span>
          <span className="text-xs text-muted-foreground">
            Análise #{analise.id}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{analise.titulo}</h1>
        <p className="text-sm text-muted-foreground">
          {analise.calculadora.nome} · {dataHoraBr(analise.createdAt)} ·{" "}
          {analise.conta.nome ?? analise.conta.email}
        </p>
        {analise.observacao && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {analise.observacao}
          </p>
        )}
      </div>

      <AcoesAnalise
        id={analise.id}
        status={analise.status}
        slugModulo={slug}
      />

      {/* Entradas — um laudo sem as premissas não é auditável */}
      {ehDosagem ? (
        <PremissasDosagem
          e={analise.entradas as unknown as DosagemCaaInput}
        />
      ) : (
        <PremissasGranulometria
          e={analise.entradas as unknown as GranulometriaInput}
        />
      )}

      {ehDosagem ? (
        <ResultadoDosagem
          r={analise.resultados as unknown as DosagemCaaResultado}
        />
      ) : (
        <ResultadoGranulometria
          r={analise.resultados as unknown as GranulometriaResultado}
        />
      )}

      <p className="pt-4 text-xs text-muted-foreground">
        Documento gerado pelo Malha a partir das premissas registradas nesta
        análise. Os valores refletem o momento do cálculo e não são
        recalculados na exibição. A conferência do resultado e a
        responsabilidade técnica são do engenheiro responsável.
      </p>
    </div>
  );
}

function PremissasDosagem({ e }: { e: DosagemCaaInput }) {
  return (
    <Card>
      <CardContent className="grid gap-x-6 gap-y-2 pt-6 sm:grid-cols-2 lg:grid-cols-3">
        <Premissa rotulo="Consumo de cimento" valor={`${e.cimento} kg/m³`} />
        <Premissa rotulo="Fator a/c" valor={String(e.fatorAC)} />
        <Premissa rotulo="Teor de argamassa" valor={`${e.teorArgamassa}%`} />
        <Premissa rotulo="Teor de fíler" valor={`${e.teorFiler}%`} />
        <Premissa rotulo="Teor de aditivo" valor={`${e.teorAditivo}%`} />
        <Premissa
          rotulo="Massa específica"
          valor={`${e.massaEspecifica} kg/m³`}
        />
      </CardContent>
    </Card>
  );
}

function PremissasGranulometria({ e }: { e: GranulometriaInput }) {
  return (
    <Card>
      <CardContent className="grid gap-x-6 gap-y-2 pt-6 sm:grid-cols-2 lg:grid-cols-3">
        <Premissa rotulo="Areia A" valor={e.nomeAreiaA} />
        <Premissa rotulo="Areia B" valor={e.nomeAreiaB} />
        <Premissa
          rotulo="Teor de mistura"
          valor={`${e.teorMistura}% / ${100 - e.teorMistura}%`}
        />
      </CardContent>
    </Card>
  );
}

function Premissa({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b py-1 text-sm last:border-0">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="font-medium tabular-nums">{valor}</span>
    </div>
  );
}
