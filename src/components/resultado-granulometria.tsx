import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { GranulometriaResultado } from "@/core/calculators/granulometria-areias/calc";
import { CurvaGranulometrica } from "@/components/curva-granulometrica";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ENQUADRAMENTO = {
  otima: {
    rotulo: "Zona ótima",
    texto: "A mescla está inteiramente na zona ótima da NBR 7211.",
    classe: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
    Icone: CheckCircle2,
  },
  utilizavel: {
    rotulo: "Zona utilizável",
    texto:
      "A mescla está dentro da zona utilizável da NBR 7211, mas não inteiramente na ótima.",
    classe: "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-300",
    Icone: Info,
  },
  fora: {
    rotulo: "Fora da zona",
    texto: "A mescla sai da zona utilizável da NBR 7211 em uma ou mais peneiras.",
    classe: "border-destructive/40 bg-destructive/10 text-destructive",
    Icone: AlertTriangle,
  },
} as const;

function n(v: number, casas = 1) {
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

function mm(v: number) {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
}

export function ResultadoGranulometria({
  r,
  compacto = false,
}: {
  r: GranulometriaResultado;
  compacto?: boolean;
}) {
  const e = ENQUADRAMENTO[r.enquadramento];

  return (
    <div className="space-y-4">
      <div className={`rounded-md border p-3 ${e.classe}`}>
        <p className="flex items-start gap-2 text-sm font-medium">
          <e.Icone className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {e.rotulo} — {e.texto}
          </span>
        </p>
      </div>

      {r.avisos.map((a, i) => (
        <p
          key={i}
          className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          {a.mensagem}
        </p>
      ))}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador
          rotulo={`MF ${r.areiaA.nome}`}
          valor={n(r.areiaA.moduloFinura, 2)}
        />
        <Indicador
          rotulo={`MF ${r.areiaB.nome}`}
          valor={n(r.areiaB.moduloFinura, 2)}
        />
        <Indicador
          rotulo="MF da mescla"
          valor={n(r.moduloFinuraMescla, 2)}
          destaque
        />
        <Indicador
          rotulo="Diâmetro máximo"
          valor={`${mm(r.diametroMaximo)} mm`}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Mescla granulométrica das areias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CurvaGranulometrica mescla={r.mescla} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Porcentagem retida acumulada
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Peneira (mm)</th>
                  <th className="px-3 py-2 text-right font-medium">
                    {r.areiaA.nome}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    {r.areiaB.nome}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">Mescla</th>
                  <th className="px-3 py-2 text-right font-medium">Zona útil</th>
                  <th className="px-3 py-2 text-right font-medium">Zona ótima</th>
                  <th className="px-3 py-2 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {r.mescla.map((m, i) => {
                  const semLimite =
                    m.utilSuperior === 100 && m.utilInferior === 100;
                  return (
                    <tr key={m.abertura} className="border-b last:border-0">
                      <td className="px-3 py-1.5 tabular-nums">
                        {mm(m.abertura)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                        {n(r.areiaA.linhas[i].acumulado)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                        {n(r.areiaB.linhas[i].acumulado)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                        {n(m.acumulado)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                        {semLimite ? "—" : `${m.utilInferior}–${m.utilSuperior}`}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                        {semLimite
                          ? "—"
                          : `${m.otimaInferior}–${m.otimaSuperior}`}
                      </td>
                      <td className="px-3 py-1.5">
                        {semLimite ? (
                          <span className="text-xs text-muted-foreground">
                            sem limite
                          </span>
                        ) : (
                          <SituacaoBadge situacao={m.situacao} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {!compacto && (
        <div className="grid gap-3 lg:grid-cols-2">
          <TabelaAreia areia={r.areiaA} />
          <TabelaAreia areia={r.areiaB} />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Limites conforme NBR 7211. Abaixo de 0,15 mm a norma não define zona,
        por isso essas peneiras entram na curva mas não no enquadramento. O
        módulo de finura usa apenas as peneiras da série normal.
      </p>
    </div>
  );
}

function SituacaoBadge({ situacao }: { situacao: "otima" | "utilizavel" | "fora" }) {
  const mapa = {
    otima: { t: "Ótima", c: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
    utilizavel: { t: "Utilizável", c: "bg-sky-500/15 text-sky-700 dark:text-sky-400" },
    fora: { t: "Fora", c: "bg-destructive/10 text-destructive" },
  } as const;
  const s = mapa[situacao];
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${s.c}`}>
      {s.t}
    </span>
  );
}

function TabelaAreia({
  areia,
}: {
  areia: GranulometriaResultado["areiaA"];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{areia.nome}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {n(areia.fracao * 100, 0)}% da mistura · massa {n(areia.massaTotal)} g
          · MF {n(areia.moduloFinura, 2)}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">mm</th>
                <th className="px-3 py-2 text-right font-medium">Ens. 1</th>
                <th className="px-3 py-2 text-right font-medium">Ens. 2</th>
                <th className="px-3 py-2 text-right font-medium">Média</th>
                <th className="px-3 py-2 text-right font-medium">Ret. %</th>
                <th className="px-3 py-2 text-right font-medium">Acum. %</th>
              </tr>
            </thead>
            <tbody>
              {areia.linhas.map((l) => (
                <tr key={l.abertura} className="border-b last:border-0">
                  <td className="px-3 py-1.5 tabular-nums">{mm(l.abertura)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {n(l.ensaio1, 0)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {n(l.ensaio2, 0)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {n(l.media)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {n(l.retido)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {n(l.acumulado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function Indicador({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string;
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
      <p className="truncate text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
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
