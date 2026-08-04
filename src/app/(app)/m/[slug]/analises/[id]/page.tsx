import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Pencil,
  PenLine,
  Ruler,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { contaComOrganizacao } from "@/lib/organizacao";
import { requireModulo, hojeUtc } from "@/lib/modulo";
import { STATUS_INFO, dataHoraBr } from "@/lib/analise";
import { formatarDocumento } from "@/lib/documento";
import { dataBr } from "@/lib/utils";
import { linkWhatsApp, textoWhatsApp } from "@/lib/whatsapp";
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
      cliente: {
        select: {
          id: true,
          nome: true,
          cpfCnpj: true,
          endereco: true,
          bairro: true,
          cidade: true,
          uf: true,
          contato: true,
          fone: true,
        },
      },
    },
  });
  if (!analise) notFound();

  const s = STATUS_INFO[analise.status];
  // Snapshot: exibimos o que foi gravado, não um recálculo. Um laudo emitido
  // em março tem de mostrar os mesmos números em dezembro. Por isso o corpo
  // do laudo é escolhido pelo slug da calculadora, e não por um formato
  // único de resultado.
  const ehDosagem = analise.calculadora.slug === "dosagem-caa";

  // Envio por WhatsApp só de análise aprovada — o que circula por mensagem
  // costuma virar decisão de obra, e rascunho não deve virar.
  const linkZap =
    analise.status === "APROVADA"
      ? linkWhatsApp(
          textoWhatsApp({
            id: analise.id,
            titulo: analise.titulo,
            calculadoraSlug: analise.calculadora.slug,
            calculadoraNome: analise.calculadora.nome,
            clienteNome: analise.cliente?.nome ?? null,
            parecer: analise.parecer,
            validoAte: analise.validoAte,
            aprovadaEm: analise.aprovadaEm,
            resultados: analise.resultados,
          })
        )
      : null;

  const vencido =
    analise.validoAte !== null && analise.validoAte < hojeUtc();

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

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {analise.aprovadaEm && (
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Aprovada em {dataHoraBr(analise.aprovadaEm)}
            </span>
          )}
          {analise.validoAte && (
            <span
              className={`flex items-center gap-1.5 ${
                vencido
                  ? "font-medium text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              <CalendarClock className="h-4 w-4" />
              {vencido ? "Venceu" : "Válida até"} {dataBr(analise.validoAte)}
            </span>
          )}
        </div>
      </div>

      {analise.status === "RASCUNHO" && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 print:hidden dark:text-amber-300">
          <Pencil className="mt-0.5 h-4 w-4 shrink-0" />
          Rascunho — ainda pode ser alterado. Ao concluir ou aprovar, os
          valores ficam travados e novas versões passam a ser feitas por cópia.
        </p>
      )}

      <AcoesAnalise
        id={analise.id}
        status={analise.status}
        slugModulo={slug}
        slugCalculadora={analise.calculadora.slug}
        linkZap={linkZap}
      />

      {analise.cliente && (
        <Card>
          <CardContent className="pt-6">
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              Cliente
            </p>
            <p className="font-medium">
              {analise.cliente.nome}
              {analise.cliente.cpfCnpj && (
                <span className="ml-2 font-normal text-muted-foreground">
                  {formatarDocumento(analise.cliente.cpfCnpj)}
                </span>
              )}
            </p>
            {(analise.cliente.endereco ||
              analise.cliente.cidade ||
              analise.cliente.bairro) && (
              <p className="text-sm text-muted-foreground">
                {[
                  analise.cliente.endereco,
                  analise.cliente.bairro,
                  analise.cliente.cidade &&
                    `${analise.cliente.cidade}${analise.cliente.uf ? `/${analise.cliente.uf}` : ""}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {(analise.cliente.contato || analise.cliente.fone) && (
              <p className="text-sm text-muted-foreground">
                {[analise.cliente.contato, analise.cliente.fone]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

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

      {analise.parecer && (
        <Card className="card-tec border-primary/30">
          <CardContent className="pt-6">
            <p className="mb-2 flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.12em] text-primary">
              <PenLine className="h-3.5 w-3.5" />
              Parecer técnico
            </p>
            {/* whitespace-pre-line preserva os parágrafos que o engenheiro
                escreveu — o parecer é texto corrido, não um campo curto. */}
            <p className="whitespace-pre-line text-sm leading-relaxed">
              {analise.parecer}
            </p>
            <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
              {analise.conta.nome ?? analise.conta.email}
              {analise.aprovadaEm &&
                ` · aprovado em ${dataHoraBr(analise.aprovadaEm)}`}
            </p>
          </CardContent>
        </Card>
      )}

      <p className="pt-4 text-xs text-muted-foreground">
        Documento gerado pelo Malha a partir das premissas registradas nesta
        análise. Os valores refletem o momento do cálculo e não são
        recalculados na exibição.
        {analise.validoAte &&
          ` Válido até ${dataBr(analise.validoAte)} — após essa data, refaça a análise com os materiais em uso.`}{" "}
        A conferência do resultado e a responsabilidade técnica são do
        engenheiro responsável.
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
