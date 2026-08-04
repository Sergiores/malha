import type { LinhaMescla } from "@/core/calculators/granulometria-areias/calc";

/**
 * Curva granulométrica — SVG puro.
 *
 * Duas convenções do ensaio que precisam ser respeitadas, senão o gráfico
 * fica irreconhecível para quem lê curva granulométrica todo dia:
 *
 *  - eixo X em escala LOGARÍTMICA (as peneiras dobram de abertura);
 *  - eixo Y INVERTIDO — 0% de retido acumulado no topo, 100% embaixo.
 *
 * As quatro curvas de zona vêm da NBR 7211; a curva cheia vermelha é a
 * mescla. A faixa da zona ótima recebe um preenchimento suave para o olho
 * achar o alvo antes de ler os números.
 */

const L = 56; // margem esquerda (rótulos do Y)
const R = 16;
const T = 14;
const B = 46; // margem inferior (rótulos do X)
const W = 640;
const H = 340;

const X_MIN = 0.03;
const X_MAX = 10;

function px(abertura: number): number {
  const t =
    (Math.log10(abertura) - Math.log10(X_MIN)) /
    (Math.log10(X_MAX) - Math.log10(X_MIN));
  return L + t * (W - L - R);
}

function py(pct: number): number {
  // Invertido: 0 no topo.
  return T + (pct / 100) * (H - T - B);
}

function caminho(pontos: Array<[number, number]>): string {
  return pontos
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${px(x).toFixed(1)},${py(y).toFixed(1)}`)
    .join(" ");
}

export function CurvaGranulometrica({
  mescla,
  titulo = "Mescla granulométrica das areias",
}: {
  mescla: LinhaMescla[];
  titulo?: string;
}) {
  // Só as peneiras com limite normativo entram nas curvas de zona.
  const comLimite = mescla.filter(
    (m) => m.utilSuperior > 0 || m.abertura >= 4.75
  );

  const serie = (chave: keyof LinhaMescla) =>
    comLimite.map((m) => [m.abertura, m[chave] as number] as [number, number]);

  const curvaMescla = mescla.map(
    (m) => [m.abertura, m.acumulado] as [number, number]
  );

  const areaOtima = [
    ...comLimite.map((m) => [m.abertura, m.otimaInferior] as [number, number]),
    ...[...comLimite]
      .reverse()
      .map((m) => [m.abertura, m.otimaSuperior] as [number, number]),
  ];

  const marcasX = [0.0375, 0.075, 0.15, 0.3, 0.6, 1.18, 2.36, 4.75, 9.5];
  const marcasY = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  return (
    <figure className="space-y-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={titulo}
      >
        {/* grade horizontal */}
        {marcasY.map((v) => (
          <g key={`y${v}`}>
            <line
              x1={L}
              x2={W - R}
              y1={py(v)}
              y2={py(v)}
              stroke="currentColor"
              className="text-border"
              strokeWidth="0.5"
            />
            <text
              x={L - 8}
              y={py(v) + 3.5}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize="10"
            >
              {v}
            </text>
          </g>
        ))}

        {/* grade vertical nas peneiras */}
        {marcasX.map((v) => (
          <g key={`x${v}`}>
            <line
              x1={px(v)}
              x2={px(v)}
              y1={T}
              y2={H - B}
              stroke="currentColor"
              className="text-border"
              strokeWidth="0.5"
            />
            <text
              x={px(v)}
              y={H - B + 14}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize="9"
            >
              {v.toLocaleString("pt-BR")}
            </text>
          </g>
        ))}

        {/* faixa da zona ótima */}
        <path
          d={`${caminho(areaOtima)} Z`}
          fill="currentColor"
          className="text-primary"
          opacity="0.08"
        />

        {/* zonas utilizáveis — linha cheia */}
        <path
          d={caminho(serie("utilInferior"))}
          fill="none"
          stroke="currentColor"
          className="text-foreground"
          strokeWidth="1.4"
        />
        <path
          d={caminho(serie("utilSuperior"))}
          fill="none"
          stroke="currentColor"
          className="text-foreground"
          strokeWidth="1.4"
        />

        {/* zonas ótimas — tracejada */}
        <path
          d={caminho(serie("otimaInferior"))}
          fill="none"
          stroke="currentColor"
          className="text-foreground"
          strokeWidth="1.2"
          strokeDasharray="5 4"
        />
        <path
          d={caminho(serie("otimaSuperior"))}
          fill="none"
          stroke="currentColor"
          className="text-foreground"
          strokeWidth="1.2"
          strokeDasharray="5 4"
        />

        {/* mescla */}
        <path
          d={caminho(curvaMescla)}
          fill="none"
          stroke="#dc2626"
          strokeWidth="2.2"
        />
        {curvaMescla.map(([x, y]) => (
          <circle key={x} cx={px(x)} cy={py(y)} r="3" fill="#dc2626" />
        ))}

        {/* eixos */}
        <line
          x1={L}
          x2={L}
          y1={T}
          y2={H - B}
          stroke="currentColor"
          className="text-foreground"
        />
        <line
          x1={L}
          x2={W - R}
          y1={H - B}
          y2={H - B}
          stroke="currentColor"
          className="text-foreground"
        />

        <text
          x={14}
          y={H / 2}
          transform={`rotate(-90 14 ${H / 2})`}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="10"
        >
          PORCENTAGEM ACUMULADA (%)
        </text>
        <text
          x={(L + W - R) / 2}
          y={H - 8}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="10"
        >
          ABERTURA DAS PENEIRAS (mm)
        </text>
      </svg>

      <figcaption className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <Legenda cor="#dc2626" tipo="cheia" rotulo="Mescla" />
        <Legenda cor="currentColor" tipo="cheia" rotulo="Zona utilizável" />
        <Legenda cor="currentColor" tipo="tracejada" rotulo="Zona ótima" />
      </figcaption>
    </figure>
  );
}

function Legenda({
  cor,
  tipo,
  rotulo,
}: {
  cor: string;
  tipo: "cheia" | "tracejada";
  rotulo: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <svg width="22" height="8" aria-hidden>
        <line
          x1="0"
          x2="22"
          y1="4"
          y2="4"
          stroke={cor}
          strokeWidth="2"
          strokeDasharray={tipo === "tracejada" ? "4 3" : undefined}
        />
      </svg>
      {rotulo}
    </span>
  );
}
