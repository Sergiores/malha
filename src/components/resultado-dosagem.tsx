import { AlertTriangle, Info } from "lucide-react";
import type { DosagemCaaResultado } from "@/core/calculators/dosagem-caa/calc";
import {
  BarraComposicao,
  GraficoBarras,
  GraficoRosca,
  fmtBRL,
  type Fatia,
} from "@/components/graficos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function num(v: number, casas = 3) {
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function ResultadoDosagem({
  r,
  compacto = false,
}: {
  r: DosagemCaaResultado;
  compacto?: boolean;
}) {
  const somaTraco = r.materiais.reduce((s, m) => s + m.traco, 0);

  const fatiasCusto: Fatia[] = r.materiais
    .map((m) => ({
      chave: m.chave,
      nome: m.nome,
      valor: m.custo,
      fracao: m.participacao,
    }))
    .sort((a, b) => b.valor - a.valor);

  const fatiasConsumo: Fatia[] = r.materiais.map((m) => ({
    chave: m.chave,
    nome: m.nome,
    valor: m.consumo,
    fracao: r.consumoTotal > 0 ? m.consumo / r.consumoTotal : 0,
  }));

  const fatiasTraco: Fatia[] = r.materiais.map((m) => ({
    chave: m.chave,
    nome: m.nome,
    valor: m.traco,
    fracao: somaTraco > 0 ? m.traco / somaTraco : 0,
  }));

  const erros = r.avisos.filter((a) => a.severidade === "erro");
  const alertas = r.avisos.filter((a) => a.severidade === "alerta");

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

      {/* Indicadores principais */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador rotulo="m — agregados secos" valor={num(r.m)} />
        <Indicador rotulo="α — miúdo + fíler" valor={num(r.alfa)} />
        <Indicador
          rotulo="Custo por m³"
          valor={fmtBRL(r.custoTotal)}
          destaque
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Traço unitário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="overflow-x-auto rounded bg-muted px-3 py-2 font-mono text-sm">
            {r.tracoUnitario}
          </p>
          <p className="text-xs text-muted-foreground">
            cimento : fíler : miúdo : graúdo : água : aditivo
          </p>
          <BarraComposicao fatias={fatiasTraco} />
        </CardContent>
      </Card>

      {/* Tabela detalhada */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Composição por m³</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Material</th>
                  <th className="px-4 py-2 text-right font-medium">Traço</th>
                  <th className="px-4 py-2 text-right font-medium">kg/m³</th>
                  <th className="px-4 py-2 text-right font-medium">R$/kg</th>
                  <th className="px-4 py-2 text-right font-medium">R$/m³</th>
                  <th className="px-4 py-2 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {r.materiais.map((m) => (
                  <tr key={m.chave} className="border-b last:border-0">
                    <td className="px-4 py-2">{m.nome}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {num(m.traco)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {num(m.consumo, 1)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {m.preco.toLocaleString("pt-BR", {
                        minimumFractionDigits: 4,
                        maximumFractionDigits: 4,
                      })}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {num(m.custo, 2)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {(m.participacao * 100).toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-medium">
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {num(somaTraco)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {num(r.consumoTotal, 1)}
                  </td>
                  <td className="px-4 py-2" />
                  <td className="px-4 py-2 text-right tabular-nums">
                    {num(r.custoTotal, 2)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">100,0</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {!compacto && (
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <GraficoRosca
                fatias={fatiasCusto}
                titulo="Participação no custo"
                total={fmtBRL(r.custoTotal)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <GraficoBarras
                fatias={fatiasConsumo}
                titulo="Consumo por material"
                unidade="kg/m³"
              />
            </CardContent>
          </Card>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Massa total calculada: {num(r.consumoTotal, 1)} kg/m³ — diferença de{" "}
        {num(r.diferencaMassa, 1)} kg/m³ em relação à massa específica
        informada. O método não inclui o aditivo no fechamento de massa, então
        essa diferença corresponde ao consumo de aditivo.
      </p>
    </div>
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
      className={`rounded-lg border p-4 ${
        destaque ? "border-primary/40 bg-primary/5" : "bg-background"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {rotulo}
      </p>
      <p
        className={`mt-1 text-2xl font-bold tabular-nums tracking-tight ${
          destaque ? "text-primary" : ""
        }`}
      >
        {valor}
      </p>
    </div>
  );
}
