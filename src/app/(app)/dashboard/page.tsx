import Link from "next/link";
import {
  CalendarDays,
  FileText,
  Layers,
  Plus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { contaComOrganizacao } from "@/lib/organizacao";
import { meusModulos } from "@/lib/modulo";
import { STATUS_INFO, brl, dataHoraBr } from "@/lib/analise";
import { GraficoBarras, type Fatia } from "@/components/graficos";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Resultado = { custoTotal?: number; m?: number; alfa?: number };

export default async function DashboardPage() {
  const { organizacao } = await contaComOrganizacao();

  const [analises, modulos] = await Promise.all([
    prisma.analise.findMany({
      where: { idOrganizacao: organizacao.id },
      orderBy: { createdAt: "desc" },
      include: {
        calculadora: {
          select: { nome: true, slug: true, modulo: { select: { slug: true } } },
        },
      },
      take: 500,
    }),
    meusModulos(),
  ]);

  const custos = analises
    .map((a) => (a.resultados as Resultado | null)?.custoTotal)
    .filter((v): v is number => typeof v === "number");

  const media = custos.length
    ? custos.reduce((s, v) => s + v, 0) / custos.length
    : 0;
  const menor = custos.length ? Math.min(...custos) : 0;
  const maior = custos.length ? Math.max(...custos) : 0;

  const trintaDias = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const recentes = analises.filter((a) => a.createdAt >= trintaDias).length;

  // Distribuição por status
  const porStatus = analises.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  // Últimas análises com custo, para o gráfico comparativo
  const comparativo: Fatia[] = analises
    .filter((a) => typeof (a.resultados as Resultado | null)?.custoTotal === "number")
    .slice(0, 8)
    .reverse()
    .map((a, i) => ({
      chave: `a${a.id}`,
      nome: a.titulo.length > 28 ? `${a.titulo.slice(0, 28)}…` : a.titulo,
      valor: (a.resultados as Resultado).custoTotal!,
      fracao: i,
    }));

  const modulosLiberados = modulos.filter((m) => m.situacao === "vigente");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral das suas análises e módulos.
          </p>
        </div>
        <Link href="/m/concreto-fresco-endurecido/dosagem-caa">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Nova dosagem
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador
          Icone={FileText}
          rotulo="Análises salvas"
          valor={String(analises.length)}
        />
        <Indicador
          Icone={CalendarDays}
          rotulo="Últimos 30 dias"
          valor={String(recentes)}
        />
        <Indicador
          Icone={Layers}
          rotulo="Módulos liberados"
          valor={`${modulosLiberados.length} de ${modulos.length}`}
        />
        <Indicador
          Icone={TrendingUp}
          rotulo="Custo médio por m³"
          valor={custos.length ? brl(media) : "—"}
          destaque
        />
      </div>

      {custos.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Custo por m³ — últimas análises
              </CardTitle>
              <CardDescription>
                Comparação direta entre os traços calculados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GraficoBarras
                fatias={comparativo}
                titulo=""
                unidade="R$/m³"
              />
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Faixa de custo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Linha
                  Icone={TrendingDown}
                  rotulo="Menor custo"
                  valor={brl(menor)}
                />
                <Linha Icone={TrendingUp} rotulo="Maior custo" valor={brl(maior)} />
                <Linha
                  Icone={Layers}
                  rotulo="Diferença"
                  valor={brl(maior - menor)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Por status</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {Object.entries(porStatus).map(([st, qtd]) => {
                  const info = STATUS_INFO[st as keyof typeof STATUS_INFO];
                  return (
                    <span
                      key={st}
                      className={`rounded px-2.5 py-1 text-sm font-medium ${info?.classe ?? ""}`}
                    >
                      {info?.rotulo ?? st}: {qtd}
                    </span>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Análises recentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {analises.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              Nenhuma análise ainda. Faça um cálculo e salve para acompanhar
              aqui.
            </p>
          ) : (
            <div className="divide-y">
              {analises.slice(0, 6).map((a) => {
                const r = a.resultados as Resultado | null;
                const s = STATUS_INFO[a.status];
                return (
                  <Link
                    key={a.id}
                    href={`/m/${a.calculadora.modulo.slug}/analises/${a.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 transition-colors hover:bg-accent/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.calculadora.nome} · {dataHoraBr(a.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums">
                        {typeof r?.custoTotal === "number"
                          ? brl(r.custoTotal)
                          : "—"}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${s.classe}`}
                      >
                        {s.rotulo}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Indicador({
  Icone,
  rotulo,
  valor,
  destaque = false,
}: {
  Icone: typeof FileText;
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <Card className={destaque ? "border-primary/40 bg-primary/5" : ""}>
      <CardContent className="pt-6">
        <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
          <Icone className="h-3.5 w-3.5" />
          {rotulo}
        </p>
        <p
          className={`mt-1 text-2xl font-bold tabular-nums tracking-tight ${
            destaque ? "text-primary" : ""
          }`}
        >
          {valor}
        </p>
      </CardContent>
    </Card>
  );
}

function Linha({
  Icone,
  rotulo,
  valor,
}: {
  Icone: typeof FileText;
  rotulo: string;
  valor: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icone className="h-4 w-4" />
        {rotulo}
      </span>
      <span className="font-medium tabular-nums">{valor}</span>
    </div>
  );
}
