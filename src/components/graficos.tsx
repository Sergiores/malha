/**
 * Gráficos em SVG puro.
 *
 * Sem biblioteca de charting de propósito: são formas simples, e uma lib
 * custaria dezenas de kB no bundle de um app que o engenheiro abre no
 * canteiro, muitas vezes em 4G. SVG também imprime bem no laudo — canvas
 * não.
 *
 * A paleta é fixa e ordenada por material, para que a mesma cor signifique
 * o mesmo insumo em todos os gráficos e no laudo.
 */

export const CORES: Record<string, string> = {
  cimento: "#1d4ed8",
  filer: "#0891b2",
  miudo: "#f59e0b",
  graudo: "#78716c",
  agua: "#38bdf8",
  aditivo: "#a855f7",
};

const COR_PADRAO = "#94a3b8";

export type Fatia = {
  chave: string;
  nome: string;
  valor: number;
  /** 0 a 1 */
  fracao: number;
};

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Rosca de participação. Desenhada com `stroke-dasharray` sobre um círculo:
 * bem mais simples de acertar que arcos em path, e sem risco de erro de
 * ângulo quando uma fatia é muito pequena.
 */
export function GraficoRosca({
  fatias,
  titulo,
  total,
}: {
  fatias: Fatia[];
  titulo: string;
  total: string;
}) {
  const raio = 70;
  const circunferencia = 2 * Math.PI * raio;
  let acumulado = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg
        viewBox="0 0 200 200"
        className="h-44 w-44 shrink-0 -rotate-90"
        role="img"
        aria-label={titulo}
      >
        <circle
          cx="100"
          cy="100"
          r={raio}
          fill="none"
          stroke="currentColor"
          className="text-muted"
          strokeWidth="28"
        />
        {fatias.map((f) => {
          const traco = f.fracao * circunferencia;
          const offset = -acumulado * circunferencia;
          acumulado += f.fracao;
          if (f.fracao <= 0) return null;
          return (
            <circle
              key={f.chave}
              cx="100"
              cy="100"
              r={raio}
              fill="none"
              stroke={CORES[f.chave] ?? COR_PADRAO}
              strokeWidth="28"
              strokeDasharray={`${traco} ${circunferencia - traco}`}
              strokeDashoffset={offset}
            />
          );
        })}
      </svg>

      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm font-medium">{titulo}</p>
        <p className="text-2xl font-bold tracking-tight">{total}</p>
        <ul className="space-y-1 pt-1">
          {fatias.map((f) => (
            <li
              key={f.chave}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: CORES[f.chave] ?? COR_PADRAO }}
                />
                <span className="truncate text-muted-foreground">{f.nome}</span>
              </span>
              <span className="shrink-0 tabular-nums">
                {(f.fracao * 100).toLocaleString("pt-BR", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
                %
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Barras horizontais — boas para comparar consumos de ordens diferentes. */
export function GraficoBarras({
  fatias,
  titulo,
  unidade,
}: {
  fatias: Fatia[];
  titulo: string;
  unidade: string;
}) {
  const maior = Math.max(...fatias.map((f) => f.valor), 0);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{titulo}</p>
      <div className="space-y-2">
        {fatias.map((f) => (
          <div key={f.chave} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-muted-foreground">{f.nome}</span>
              <span className="shrink-0 tabular-nums">
                {f.valor.toLocaleString("pt-BR", {
                  maximumFractionDigits: 2,
                })}{" "}
                <span className="text-xs text-muted-foreground">{unidade}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: maior > 0 ? `${(f.valor / maior) * 100}%` : "0%",
                  background: CORES[f.chave] ?? COR_PADRAO,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Diagrama do traço unitário: uma faixa proporcional que mostra, de relance,
 * quanto de cada material entra por kg de cimento.
 */
export function BarraComposicao({ fatias }: { fatias: Fatia[] }) {
  return (
    <div className="space-y-2">
      <div className="flex h-8 w-full overflow-hidden rounded-md">
        {fatias.map((f) =>
          f.fracao > 0 ? (
            <div
              key={f.chave}
              title={`${f.nome}: ${(f.fracao * 100).toFixed(1)}%`}
              style={{
                width: `${f.fracao * 100}%`,
                background: CORES[f.chave] ?? COR_PADRAO,
              }}
            />
          ) : null
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {fatias.map((f) => (
          <span
            key={f.chave}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              className="h-2 w-2 rounded-sm"
              style={{ background: CORES[f.chave] ?? COR_PADRAO }}
            />
            {f.nome}
          </span>
        ))}
      </div>
    </div>
  );
}

export { fmtBRL };
