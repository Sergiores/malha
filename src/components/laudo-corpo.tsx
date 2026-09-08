import type { ReactNode } from "react";
import type { DosagemCaaInput } from "@/core/calculators/dosagem-caa/schema";
import type { DosagemCaaResultado } from "@/core/calculators/dosagem-caa/calc";
import type { GranulometriaInput } from "@/core/calculators/granulometria-areias/schema";
import type { GranulometriaResultado } from "@/core/calculators/granulometria-areias/calc";
import type { IdadeConcretoInput } from "@/core/calculators/idade-concreto/schema";
import type { IdadeConcretoResultado } from "@/core/calculators/idade-concreto/calc";
import { CIMENTOS } from "@/core/calculators/idade-concreto/schema";
import { ResultadoDosagem } from "@/components/resultado-dosagem";
import { ResultadoGranulometria } from "@/components/resultado-granulometria";
import { ResultadoIdade } from "@/components/resultado-idade";
import { Card, CardContent } from "@/components/ui/card";

/**
 * O corpo do laudo, escolhido pelo slug da calculadora.
 *
 * Antes isto era um `ehDosagem ? A : B` dentro da página do laudo — que
 * funciona com duas calculadoras e deixa de funcionar na terceira. Aqui cada
 * calculadora registra as suas duas metades, e a página do laudo não precisa
 * saber quais existem.
 *
 * O `unknown` na fronteira é proposital: `Analise.entradas` e
 * `Analise.resultados` são Json no banco, e o snapshot gravado é a verdade do
 * laudo. O cast acontece uma vez, aqui, em vez de espalhado pelas páginas.
 */

export type CorpoLaudo = {
  /** As premissas — sem elas o laudo não é auditável. */
  Premissas: (p: { entradas: unknown }) => ReactNode;
  /** O resultado, exatamente como foi gravado. */
  Resultado: (p: { resultados: unknown }) => ReactNode;
};

const CORPOS: Record<string, CorpoLaudo> = {
  "dosagem-caa": {
    Premissas: ({ entradas }) => (
      <PremissasDosagem e={entradas as DosagemCaaInput} />
    ),
    Resultado: ({ resultados }) => (
      <ResultadoDosagem r={resultados as DosagemCaaResultado} />
    ),
  },

  "granulometria-areias": {
    Premissas: ({ entradas }) => (
      <PremissasGranulometria e={entradas as GranulometriaInput} />
    ),
    Resultado: ({ resultados }) => (
      <ResultadoGranulometria r={resultados as GranulometriaResultado} />
    ),
  },

  "idade-concreto": {
    Premissas: ({ entradas }) => (
      <PremissasIdade e={entradas as IdadeConcretoInput} />
    ),
    Resultado: ({ resultados }) => (
      <ResultadoIdade r={resultados as IdadeConcretoResultado} />
    ),
  },
};

export function corpoDoLaudo(slugCalculadora: string): CorpoLaudo | null {
  return CORPOS[slugCalculadora] ?? null;
}

/* ------------------------------------------------------------------ */
/* Premissas                                                           */
/* ------------------------------------------------------------------ */

function PremissasDosagem({ e }: { e: DosagemCaaInput }) {
  return (
    <GradePremissas>
      <Premissa rotulo="Consumo de cimento" valor={`${e.cimento} kg/m³`} />
      <Premissa rotulo="Fator a/c" valor={String(e.fatorAC)} />
      <Premissa rotulo="Teor de argamassa" valor={`${e.teorArgamassa}%`} />
      <Premissa rotulo="Teor de fíler" valor={`${e.teorFiler}%`} />
      <Premissa rotulo="Teor de aditivo" valor={`${e.teorAditivo}%`} />
      <Premissa
        rotulo="Massa específica"
        valor={`${e.massaEspecifica} kg/m³`}
      />
    </GradePremissas>
  );
}

function PremissasGranulometria({ e }: { e: GranulometriaInput }) {
  return (
    <GradePremissas>
      <Premissa rotulo="Areia A" valor={e.nomeAreiaA} />
      <Premissa rotulo="Areia B" valor={e.nomeAreiaB} />
      <Premissa
        rotulo="Teor de mistura"
        valor={`${e.teorMistura}% / ${100 - e.teorMistura}%`}
      />
    </GradePremissas>
  );
}

function PremissasIdade({ e }: { e: IdadeConcretoInput }) {
  const cimento = CIMENTOS.find((c) => c.chave === e.cimento);
  return (
    <GradePremissas>
      <Premissa rotulo="fck aos 28 dias" valor={`${e.fck28} MPa`} />
      <Premissa rotulo="Idade efetiva" valor={`${e.idade} dias`} />
      <Premissa
        rotulo="Cimento"
        valor={cimento ? `${cimento.nome} (s = ${cimento.s})` : e.cimento}
      />
      <Premissa
        rotulo="Carga de projeto"
        valor={e.carga > 0 ? `${e.carga} ${e.unidadeCarga}` : "não informada"}
      />
    </GradePremissas>
  );
}

/* ------------------------------------------------------------------ */

function GradePremissas({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardContent className="grid gap-x-6 gap-y-2 pt-6 sm:grid-cols-2 lg:grid-cols-3">
        {children}
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
