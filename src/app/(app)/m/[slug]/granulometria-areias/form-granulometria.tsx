"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Calculator, Save, Wand2 } from "lucide-react";
import {
  calcularGranul,
  salvarGranul,
  type EstadoGranulometria,
} from "./actions";
import {
  PENEIRAS,
  VAZIO,
} from "@/core/calculators/granulometria-areias/schema";
import { ResultadoGranulometria } from "@/components/resultado-granulometria";
import {
  SeletorCliente,
  type ClienteOpcao,
} from "@/components/seletor-cliente";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function FormGranulometria({
  clientes,
}: {
  clientes: ClienteOpcao[];
}) {
  const [estado, acaoCalcular] = useActionState<EstadoGranulometria, FormData>(
    calcularGranul,
    null
  );
  const [estadoSalvar, acaoSalvar] = useActionState<
    EstadoGranulometria,
    FormData
  >(salvarGranul, null);

  // Controlado só para o botão "aplicar teor sugerido" conseguir mexer nele.
  // Começa vazio: análise nova não deve trazer teor de exemplo.
  const [teor, setTeor] = useState<number | "">(VAZIO.teorMistura as "");

  const erro =
    (estado && !estado.ok && estado.error) ||
    (estadoSalvar && !estadoSalvar.ok && estadoSalvar.error);

  // Análise nova abre em branco; depois de calcular, reexibe o que foi
  // digitado para não perder a iteração.
  const v: {
    nomeAreiaA: string;
    nomeAreiaB: string;
    areiaA1: Array<number | string>;
    areiaA2: Array<number | string>;
    areiaB1: Array<number | string>;
    areiaB2: Array<number | string>;
    titulo?: string;
    observacao?: string;
  } = estado?.ok ? estado.entradas : VAZIO;

  return (
    <div className="space-y-4">
      <form id="granul" action={acaoCalcular} className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Identificação</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                name="titulo"
                defaultValue={v.titulo}
                placeholder="Ex.: Mescla areia fina + regular — Obra Centro"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="observacao">Observação</Label>
              <Input
                id="observacao"
                name="observacao"
                defaultValue={v.observacao}
                placeholder="Jazida, lote, data do ensaio…"
              />
            </div>
          </CardContent>
        </Card>

        <SeletorCliente
          clientes={clientes}
          idSelecionado={estado?.ok ? estado.idCliente : null}
        />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Massa retida por peneira (g)
            </CardTitle>
            <CardDescription>
              Dois ensaios por areia, conforme NBR NM 248. Deixe zero nas
              peneiras sem material retido.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nomeAreiaA">Nome da areia A</Label>
                <Input
                  id="nomeAreiaA"
                  name="nomeAreiaA"
                  defaultValue={v.nomeAreiaA}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nomeAreiaB">Nome da areia B</Label>
                <Input
                  id="nomeAreiaB"
                  name="nomeAreiaB"
                  defaultValue={v.nomeAreiaB}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 text-left font-medium">Peneira</th>
                    <th className="px-1 py-2 font-medium">A — ens. 1</th>
                    <th className="px-1 py-2 font-medium">A — ens. 2</th>
                    <th className="px-1 py-2 font-medium">B — ens. 1</th>
                    <th className="px-1 py-2 font-medium">B — ens. 2</th>
                  </tr>
                </thead>
                <tbody>
                  {PENEIRAS.map((p, i) => (
                    <tr key={p.abertura} className="border-b last:border-0">
                      <td className="py-1 pr-2 tabular-nums">
                        {p.abertura.toLocaleString("pt-BR", {
                          maximumFractionDigits: 4,
                        })}{" "}
                        <span className="text-xs text-muted-foreground">mm</span>
                      </td>
                      {(["a1", "a2", "b1", "b2"] as const).map((pref) => {
                        const origem = {
                          a1: v.areiaA1,
                          a2: v.areiaA2,
                          b1: v.areiaB1,
                          b2: v.areiaB2,
                        }[pref];
                        return (
                          <td key={pref} className="px-1 py-1">
                            <Input
                              name={`${pref}_${i}`}
                              type="number"
                              step="0.1"
                              min="0"
                              inputMode="decimal"
                              defaultValue={origem[i] ?? ""}
                              placeholder="0"
                              className="h-8 text-right tabular-nums"
                              aria-label={`${pref} peneira ${p.abertura} mm`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Teor de mistura</CardTitle>
            <CardDescription>
              Percentual da areia A na mescla. O restante é areia B.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-40 space-y-1.5">
                <Label htmlFor="teorMistura">Areia A (%)</Label>
                <Input
                  id="teorMistura"
                  name="teorMistura"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={teor}
                  placeholder="0"
                  onChange={(ev) =>
                    setTeor(ev.target.value === "" ? "" : Number(ev.target.value))
                  }
                  required
                />
              </div>
              <p className="pb-2 text-sm text-muted-foreground">
                Areia B: {teor === "" ? 100 : 100 - teor}%
              </p>

              {estado?.ok && estado.sugestao.teor !== teor && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mb-0.5"
                  onClick={() => setTeor(estado.sugestao.teor)}
                >
                  <Wand2 className="h-4 w-4" />
                  Usar {estado.sugestao.teor}% (melhor enquadramento)
                </Button>
              )}
            </div>

            {estado?.ok && (
              <p className="text-xs text-muted-foreground">
                Varredura de 0 a 100%: o teor de {estado.sugestao.teor}% deixa{" "}
                {estado.sugestao.otimas} peneira(s) na zona ótima.
              </p>
            )}
          </CardContent>
        </Card>

        {erro && (
          <p className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {erro}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <SubmitButton>
            <Calculator className="h-4 w-4" />
            Calcular
          </SubmitButton>
          {estado?.ok && (
            <SubmitButton formAction={acaoSalvar} variant="outline">
              <Save className="h-4 w-4" />
              Salvar análise
            </SubmitButton>
          )}
        </div>
      </form>

      {estado?.ok && (
        <div className="space-y-4 border-t pt-4">
          <h2 className="text-lg font-semibold">Resultado</h2>
          <ResultadoGranulometria r={estado.resultado} />
        </div>
      )}
    </div>
  );
}
