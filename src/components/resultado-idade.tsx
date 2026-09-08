import type { ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";
import type { IdadeConcretoResultado } from "@/core/calculators/idade-concreto/calc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function num(v: number, casas = 2) {
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function ResultadoIdade({
  r,
  idade,
}: {
  r: IdadeConcretoResultado;
  /** Dia a destacar na curva. Vem das entradas, não do resultado. */
  idade?: number;
}) {
  const erros = r.avisos.filter((a) => a.severidade === "erro");
  const alertas = r.avisos.filter((a) => a.severidade === "alerta");

  // O dia destacado sai da curva quando não foi passado — a curva vai até 28
  // e a análise pode ter sido feita numa idade maior.
  const diaFoco =
    idade ?? r.curva.find((p) => Math.abs(p.beta1 - r.beta1) < 1e-9)?.dia;

  return (
    <div className="space-y-4">
      {erros.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
          {erros.map((a, i) => (
            <p
              key={i}
              className="flex items-start gap-2 text-sm text-destructive"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {a.mensagem}
            </p>
          ))}
        </div>
      )}

      {alertas.length > 0 && (
        <div className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
          {alertas.map((a, i) => (
            <p
              key={i}
              className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              {a.mensagem}
            </p>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador
          // `normal-case` no símbolo: o uppercase do rótulo transformaria o
          // β minúsculo em Β maiúsculo, que é outra letra.
          rotulo={
            <>
              <span className="normal-case">β₁</span> — crescimento
            </>
          }
          valor={num(r.beta1, 4)}
        />
        <Indicador
          rotulo="Resistência efetiva"
          valor={`${num(r.fckEfetivo)} MPa`}
          destaque
        />
        <Indicador
          rotulo="Carga efetiva"
          valor={
            r.cargaEfetiva > 0
              ? `${num(r.cargaEfetiva)} ${r.unidadeCarga}`
              : "—"
          }
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Evolução da resistência até os 28 dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CurvaIdade r={r} diaFoco={diaFoco} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Leitura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Linha
            rotulo="Cimento adotado"
            valor={`${r.nomeCimento} · s = ${num(r.s, 2)}`}
          />
          <Linha
            rotulo="Fração do fck de projeto"
            valor={`${num(r.fracaoAtingida * 100, 1)}%`}
          />
          <Linha
            rotulo="Falta para o fck de projeto"
            valor={
              r.faltaPara28 > 0.005 ? `${num(r.faltaPara28)} MPa` : "nada"
            }
          />
          <p className="pt-2 text-muted-foreground">
            {r.faltaPara28 > 0.005
              ? `Nesta idade o concreto tem ${num(r.fckEfetivo)} MPa, ${num(
                  r.fracaoAtingida * 100,
                  1
                )}% do fck de projeto.`
              : `Nesta idade o concreto já atingiu o fck de projeto de ${num(
                  r.fckEfetivo
                )} MPa.`}
            {r.cargaEfetiva > 0 &&
              ` Proporcionalmente, resiste a ${num(r.cargaEfetiva)} ${
                r.unidadeCarga
              } da carga informada.`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Curva de β₁·fck do 1º ao 28º dia.
 *
 * SVG puro, sem lib de charting: economiza dezenas de kB num app aberto no
 * canteiro, e imprime bem no laudo — canvas não.
 */
function CurvaIdade({
  r,
  diaFoco,
}: {
  r: IdadeConcretoResultado;
  diaFoco?: number;
}) {
  // O topo reserva espaço para o rótulo "MPa" ficar acima da maior marca, e a
  // base reserva duas linhas: os dias e a palavra "dias" embaixo deles.
  const L = 44;
  const T = 26;
  const W = 640;
  const H = 264;
  const largura = W - L - 16;
  const altura = H - T - 46;

  const fckMax = r.curva[r.curva.length - 1]?.fck ?? 1;
  const teto = fckMax > 0 ? fckMax : 1;

  const x = (dia: number) => L + ((dia - 1) / 27) * largura;
  const y = (fck: number) => T + altura - (fck / teto) * altura;

  const linha = r.curva
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.dia).toFixed(1)},${y(p.fck).toFixed(1)}`)
    .join(" ");

  const area = `${linha} L${x(28).toFixed(1)},${(T + altura).toFixed(1)} L${x(1).toFixed(1)},${(
    T + altura
  ).toFixed(1)} Z`;

  const focoPonto =
    diaFoco !== undefined && diaFoco >= 1 && diaFoco <= 28
      ? r.curva.find((p) => p.dia === Math.round(diaFoco))
      : undefined;

  const diasEixo = [1, 7, 14, 21, 28];
  const marcasY = [0, teto / 2, teto];

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[420px]"
        role="img"
        aria-label={`Curva de resistência do concreto do primeiro ao vigésimo oitavo dia, atingindo ${num(
          r.fckEfetivo
        )} megapascal na idade analisada`}
      >
        {marcasY.map((v, i) => (
          <g key={i}>
            <line
              x1={L}
              x2={W - 16}
              y1={y(v)}
              y2={y(v)}
              className="stroke-border"
              strokeWidth="1"
            />
            <text
              x={L - 8}
              y={y(v) + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[10px] tabular-nums"
            >
              {num(v, 0)}
            </text>
          </g>
        ))}

        <path d={area} className="fill-primary/10" />
        <path
          d={linha}
          fill="none"
          className="stroke-primary"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {focoPonto && (
          <g>
            <line
              x1={x(focoPonto.dia)}
              x2={x(focoPonto.dia)}
              y1={y(focoPonto.fck)}
              y2={T + altura}
              className="stroke-primary"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle
              cx={x(focoPonto.dia)}
              cy={y(focoPonto.fck)}
              r="4.5"
              className="fill-primary"
            />
            <text
              x={Math.min(x(focoPonto.dia) + 9, W - 90)}
              y={Math.max(y(focoPonto.fck) - 8, T + 10)}
              className="fill-primary text-[11px] font-medium tabular-nums"
            >
              {num(focoPonto.fck)} MPa
            </text>
          </g>
        )}

        {diasEixo.map((d) => (
          <text
            key={d}
            x={x(d)}
            y={H - 22}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px] tabular-nums"
          >
            {d}
          </text>
        ))}
        <text
          x={L + largura / 2}
          y={H - 6}
          textAnchor="middle"
          className="fill-muted-foreground text-[10px]"
        >
          dias
        </text>
        <text
          x={L - 8}
          y={T - 10}
          textAnchor="end"
          className="fill-muted-foreground text-[10px]"
        >
          MPa
        </text>
      </svg>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b py-1 last:border-0">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="font-medium tabular-nums">{valor}</span>
    </div>
  );
}

function Indicador({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: ReactNode;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`canto-tecnico rounded-lg border p-4 transition-colors ${
        destaque
          ? "border-primary/40 bg-primary/5"
          : "bg-card/60 hover:border-primary/30"
      }`}
    >
      <p className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
        {rotulo}
      </p>
      <p
        className={`mt-1 font-mono text-2xl font-medium tabular-nums tracking-tight ${
          destaque ? "text-primary" : ""
        }`}
      >
        {valor}
      </p>
    </div>
  );
}
