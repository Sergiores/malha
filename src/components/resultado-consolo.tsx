import { AlertTriangle, Ban, Check, Info, X } from "lucide-react";
import type { ConsoloResultado, Verificacao } from "@/core/calculators/consolo-nbr9062/calc";
import type { ConsoloInput } from "@/core/calculators/consolo-nbr9062/schema";
import { AuditoriaConsolo } from "@/components/auditoria-consolo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Formata tolerando o que o snapshot pode trazer.
 *
 * `Analise.resultados` é JSON: um `Infinity` gravado por engano vira `null`
 * no banco, e `null.toLocaleString()` derruba a página inteira com exceção
 * no cliente. Já aconteceu. O motor não produz mais esses valores, mas as
 * análises gravadas antes continuam lá — e um laudo antigo tem de abrir.
 */
function num(v: number | null | undefined, casas = 2) {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function ResultadoConsolo({
  r,
  e,
}: {
  r: ConsoloResultado;
  /** A geometria vem das entradas — o croqui desenha a peça informada. */
  e?: ConsoloInput;
}) {
  const erros = r.avisos.filter((a) => a.severidade === "erro");
  const alertas = r.avisos.filter((a) => a.severidade === "alerta");

  return (
    <div className="space-y-4">
      {/* Veredito global — o que a lista de análises também mostra */}
      <VereditoGlobal r={r} />

      {erros.length > 0 && (
        <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/10 p-3">
          {erros.map((a, i) => (
            <p key={i} className="flex items-start gap-2 text-sm text-destructive">
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

      {e && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Esquema da peça</CardTitle>
          </CardHeader>
          <CardContent>
            <Croqui e={e} dLinha={r.dLinha} />
          </CardContent>
        </Card>
      )}

      {/* ⚠️ TEMPORÁRIO — auditoria para conferência contra a planilha.
          Remover este bloco, o auditoria-consolo.tsx e o auditoria.ts
          quando a validação com o cliente terminar. */}
      {e && <AuditoriaConsolo e={e} r={r} />}

      {/* Fora de escopo para por aqui: sem verificações, sem armaduras. */}
      {!r.foraDeEscopo && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Verificações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {r.verificacoes.map((v) => (
                <LinhaVerificacao key={v.chave} v={v} />
              ))}
            </CardContent>
          </Card>

          {r.armaduras && <Armaduras r={r} />}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Memória de cálculo</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              <Item rotulo="Classificação" valor={r.nomeClassificacao} />
              <Item rotulo="a / d" valor={num(r.razaoAD, 3)} />
              <Item rotulo="d′" valor={`${num(r.dLinha)} cm`} />
              <Item rotulo="d = h − d′" valor={`${num(r.d)} cm`} />
              <Item rotulo="γn" valor={num(r.gamaN, 1)} />
              <Item rotulo="Fsd" valor={`${num(r.fsd)} kN`} />
              <Item
                rotulo="Hsd"
                valor={`${num(r.hsd)} kN`}
                nota={`${num(r.fatorApoio, 2)} × Fsd · ${r.nomeApoio}`}
              />
              <Item rotulo="fcd" valor={`${num(r.fcd)} MPa`} />
              <Item rotulo="fyd" valor={`${num(r.fyd)} MPa`} />

              {r.geometria && (
                <>
                  <Item rotulo="α" valor={`${num(r.geometria.alfa)}°`} />
                  <Item rotulo="θ (biela)" valor={`${num(r.geometria.theta)}°`} />
                  <Item rotulo="Segmento BD" valor={`${num(r.geometria.bd)} cm`} />
                  <Item rotulo="Segmento AB" valor={`${num(r.geometria.ab)} cm`} />
                  <Item rotulo="Segmento AD" valor={`${num(r.geometria.ad)} cm`} />
                  <Item rotulo="Segmento AC" valor={`${num(r.geometria.ac)} cm`} />
                  <Item rotulo="h_bie" valor={`${num(r.geometria.hbie)} cm`} />
                  <Item rotulo="A_bie" valor={`${num(r.geometria.abie)} cm²`} />
                  <Item rotulo="Rcd" valor={`${num(r.geometria.rcd)} kN`} />
                </>
              )}

              {r.cisalhamento && (
                <>
                  <Item rotulo="μ" valor={num(r.cisalhamento.mu, 1)} />
                  <Item rotulo="τwd" valor={`${num(r.cisalhamento.tauWd)} MPa`} />
                  <Item rotulo="τwu,1" valor={`${num(r.cisalhamento.tauWu1)} MPa`} />
                  <Item rotulo="τwu,2" valor={`${num(r.cisalhamento.tauWu2)} MPa`} />
                  <Item rotulo="τwu,3" valor={`${num(r.cisalhamento.tauWu3)} MPa`} />
                  <Item rotulo="τwu adotado" valor={`${num(r.cisalhamento.tauWu)} MPa`} />
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function VereditoGlobal({ r }: { r: ConsoloResultado }) {
  if (r.foraDeEscopo) {
    return (
      <div className="canto-tecnico rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
        <p className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.12em] text-amber-700 dark:text-amber-400">
          <Ban className="h-4 w-4" />
          {r.nomeClassificacao}
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-amber-900 dark:text-amber-200">
          {r.mensagemEscopo}
        </p>
      </div>
    );
  }

  const ok = r.veredito === "ATENDE";
  return (
    <div
      className={`canto-tecnico flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 ${
        ok
          ? "border-emerald-500/50 bg-emerald-500/10"
          : "border-destructive/50 bg-destructive/10"
      }`}
    >
      <div>
        <p className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
          {r.nomeClassificacao} · a/d = {num(r.razaoAD, 3)}
        </p>
        <p
          className={`mt-1 font-mono text-2xl font-medium tracking-tight ${
            ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
          }`}
        >
          {ok ? "ATENDE" : "NÃO ATENDE"}
        </p>
      </div>
      {ok ? (
        <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <X className="h-8 w-8 text-destructive" />
      )}
    </div>
  );
}

function LinhaVerificacao({ v }: { v: Verificacao }) {
  // A barra satura em 100%: o que passa do limite já está dito no número.
  // O `?? 0` cobre snapshot antigo com aproveitamento nulo.
  const aprov = Number.isFinite(v.aproveitamento) ? v.aproveitamento : 0;
  const preenchido = Math.min(Math.max(aprov, 0), 1) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-medium">{v.nome}</span>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            v.atende
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              : "bg-destructive/15 text-destructive"
          }`}
        >
          {v.atende ? "ATENDE" : "NÃO ATENDE"}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${
            v.atende ? "bg-emerald-500" : "bg-destructive"
          }`}
          style={{ width: `${preenchido}%` }}
        />
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {num(v.atuante)} de {num(v.limite)} {v.unidade}
          {Number.isFinite(v.aproveitamento) && (
            <>
              {" · "}
              {num(v.aproveitamento * 100, 1)}% do limite ·{" "}
              {v.folga >= 0
                ? `folga de ${num(v.folga * 100, 1)}%`
                : `excede em ${num(-v.folga * 100, 1)}%`}
            </>
          )}
        </span>
        <span>{v.criterio}</span>
      </div>
    </div>
  );
}

function Armaduras({ r }: { r: ConsoloResultado }) {
  const a = r.armaduras!;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Armaduras</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 font-medium">Armadura</th>
                <th className="px-4 py-2 text-right font-medium">cm²</th>
                <th className="px-4 py-2 font-medium">Origem</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b bg-primary/5">
                <td className="px-4 py-2 font-medium">Tirante — As,tir</td>
                <td className="px-4 py-2 text-right font-medium tabular-nums">
                  {num(a.asTir, 3)}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {/* Não é veredito: é qual dos dois valores mandou. */}
                  {a.governa === "calculado"
                    ? `governa o calculado (mínima seria ${num(a.asTirMin, 3)})`
                    : `governa a mínima (calculado seria ${num(a.asTirCalculado, 3)})`}
                </td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-2">Costura — As,cost</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {num(a.asCost, 3)}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  distribuída na altura do consolo
                </td>
              </tr>
              <tr className="border-b last:border-0">
                <td className="px-4 py-2">Transversal — Asw</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {num(a.asw, 3)}
                </td>
                <td className="px-4 py-2 text-muted-foreground">0,15% · b · h</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="grid gap-x-6 gap-y-1 border-t px-4 py-3 sm:grid-cols-2">
          <Item rotulo="Asv (parcela vertical)" valor={`${num(a.asv, 3)} cm²`} />
          <Item rotulo="As,tir,mín" valor={`${num(a.asTirMin, 3)} cm²`} />
          <Item rotulo="ρ (taxa de armadura)" valor={num(a.rho * 100, 3) + "%"} />
          <Item rotulo="ω (taxa mecânica)" valor={num(a.omega, 4)} />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Croqui do consolo com as cotas informadas.
 *
 * SVG puro, redesenhado a cada cálculo. O desenho é esquemático — o chanfro
 * inferior é convenção de traço —, mas **as cotas são as reais**: é o que
 * permite conferir a geometria antes de olhar qualquer número.
 */
function Croqui({
  e,
  dLinha,
}: {
  e: Pick<ConsoloInput, "b" | "h" | "l" | "a" | "an" | "bn">;
  dLinha: number;
}) {
  const W = 470;
  const H = 380;
  const x0 = 150; // face do pilar
  const y0 = 120; // topo do consolo

  // Escala única para os dois eixos, senão o desenho mente sobre a proporção.
  const esc = Math.min(230 / e.l, 165 / e.h);

  const px = (cm: number) => x0 + cm * esc;
  const py = (cm: number) => y0 + cm * esc;

  const xPonta = px(e.l);
  const yBase = py(e.h);
  const yPonta = py(e.h * 0.55);
  const xCarga = px(e.a);
  const yTirante = py(dLinha);

  const apoioIni = px(Math.max(0, e.a - e.an / 2));
  const apoioFim = px(Math.min(e.l, e.a + e.an / 2));

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[380px]"
        role="img"
        aria-label={`Croqui do consolo com avanço ${num(e.l)} cm, altura ${num(e.h)} cm e balanço ${num(e.a)} cm`}
      >
        {/* pilar */}
        <g className="stroke-border" strokeWidth="1">
          {Array.from({ length: 14 }, (_, i) => (
            <line
              key={i}
              x1={x0 - 46}
              x2={x0}
              y1={30 + i * 24}
              y2={30 + i * 24}
            />
          ))}
        </g>
        <g fill="none" className="stroke-foreground" strokeWidth="2.2">
          <path d={`M${x0 - 46} 26 L${x0 - 46} ${H - 34}`} />
          <path d={`M${x0} 26 L${x0} ${y0}`} />
          <path d={`M${x0} ${yBase} L${x0} ${H - 34}`} />
        </g>

        {/* consolo */}
        <path
          d={`M${x0} ${y0} L${xPonta} ${y0} L${xPonta} ${yPonta} L${x0} ${yBase} Z`}
          className="fill-primary/5 stroke-foreground"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* aparelho de apoio */}
        <rect
          x={apoioIni}
          y={y0 - 7}
          width={Math.max(apoioFim - apoioIni, 4)}
          height="7"
          className="fill-primary/20 stroke-primary"
          strokeWidth="1.5"
        />

        {/* tirante, com o laço */}
        <path
          d={`M${xPonta - 8} ${yTirante} L${x0 + 14} ${yTirante} A7 7 0 0 0 ${x0 + 14} ${yTirante + 14} L${xPonta - 8} ${yTirante + 14}`}
          fill="none"
          className="stroke-primary"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Dentro da peça: à direita da ponta ele bateria nas cotas d′ e h. */}
        <text
          x={x0 + 26}
          y={yTirante + 30}
          className="fill-primary text-[10px]"
        >
          As,tir
        </text>

        {/* força */}
        <g className="stroke-destructive fill-destructive" strokeWidth="2">
          <path d={`M${xCarga} ${y0 - 62} L${xCarga} ${y0 - 14}`} />
          <path
            d={`M${xCarga} ${y0 - 8} L${xCarga - 5} ${y0 - 18} L${xCarga + 5} ${y0 - 18} Z`}
            stroke="none"
          />
        </g>
        <text
          x={xCarga + 8}
          y={y0 - 48}
          className="fill-destructive text-[11px]"
        >
          Fsd
        </text>

        {/* cota a */}
        <Cota
          x1={x0}
          x2={xCarga}
          y={54}
          rotulo={`a = ${num(e.a)}`}
          guias={[
            [x0, 58, x0, y0 - 4],
            [xCarga, 58, xCarga, y0 - 62],
          ]}
        />

        {/* cota l */}
        <Cota
          x1={x0}
          x2={xPonta}
          y={H - 26}
          rotulo={`l = ${num(e.l)}`}
          guias={[
            [x0, yBase, x0, H - 22],
            [xPonta, yPonta, xPonta, H - 22],
          ]}
        />

        {/* cota h */}
        <CotaV
          y1={y0}
          y2={yBase}
          x={xPonta + 60}
          rotulo={`h = ${num(e.h)}`}
          guias={[
            [xPonta + 2, y0, xPonta + 66, y0],
            [x0, yBase, xPonta + 66, yBase],
          ]}
        />

        {/* cota d′ */}
        <CotaV
          y1={y0}
          y2={yTirante}
          x={xPonta + 26}
          rotulo={`d′ ${num(dLinha)}`}
          guias={[[xPonta + 2, yTirante, xPonta + 32, yTirante]]}
          compacta
        />

        <text x={8} y={20} className="fill-muted-foreground text-[10px]">
          cotas em cm · b = {num(e.b)} (largura do consolo) · bₙ = {num(e.bn)}
        </text>
        <text
          x={x0 - 23}
          y={H - 14}
          textAnchor="middle"
          className="fill-muted-foreground text-[10px]"
        >
          pilar
        </text>
      </svg>
    </div>
  );
}

type Guia = [number, number, number, number];

function Cota({
  x1,
  x2,
  y,
  rotulo,
  guias,
}: {
  x1: number;
  x2: number;
  y: number;
  rotulo: string;
  guias: Guia[];
}) {
  return (
    <g className="stroke-muted-foreground fill-muted-foreground" strokeWidth="1">
      {guias.map((g, i) => (
        <line
          key={i}
          x1={g[0]}
          y1={g[1]}
          x2={g[2]}
          y2={g[3]}
          strokeDasharray="3 3"
        />
      ))}
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <path d={`M${x1} ${y} L${x1 + 7} ${y - 3.4} L${x1 + 7} ${y + 3.4} Z`} stroke="none" />
      <path d={`M${x2} ${y} L${x2 - 7} ${y - 3.4} L${x2 - 7} ${y + 3.4} Z`} stroke="none" />
      <text
        x={(x1 + x2) / 2}
        y={y - 6}
        textAnchor="middle"
        stroke="none"
        className="fill-muted-foreground text-[11px]"
      >
        {rotulo}
      </text>
    </g>
  );
}

function CotaV({
  y1,
  y2,
  x,
  rotulo,
  guias,
  compacta = false,
}: {
  y1: number;
  y2: number;
  x: number;
  rotulo: string;
  guias: Guia[];
  compacta?: boolean;
}) {
  return (
    <g className="stroke-muted-foreground fill-muted-foreground" strokeWidth="1">
      {guias.map((g, i) => (
        <line
          key={i}
          x1={g[0]}
          y1={g[1]}
          x2={g[2]}
          y2={g[3]}
          strokeDasharray="3 3"
        />
      ))}
      <line x1={x} y1={y1} x2={x} y2={y2} />
      <path d={`M${x} ${y1} L${x - 3.4} ${y1 + 7} L${x + 3.4} ${y1 + 7} Z`} stroke="none" />
      <path d={`M${x} ${y2} L${x - 3.4} ${y2 - 7} L${x + 3.4} ${y2 - 7} Z`} stroke="none" />
      <text
        x={x + 5}
        y={(y1 + y2) / 2 + 3}
        stroke="none"
        className={`fill-muted-foreground ${compacta ? "text-[9px]" : "text-[11px]"}`}
      >
        {rotulo}
      </text>
    </g>
  );
}

function Item({
  rotulo,
  valor,
  nota,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b py-1 text-sm last:border-0">
      <span className="text-muted-foreground">
        {rotulo}
        {nota && <span className="block text-xs opacity-70">{nota}</span>}
      </span>
      <span className="font-medium tabular-nums">{valor}</span>
    </div>
  );
}
