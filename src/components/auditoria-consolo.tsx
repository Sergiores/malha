"use client";

import { useState } from "react";
import { ChevronDown, FileSearch } from "lucide-react";
import { auditoriaConsolo } from "@/core/calculators/consolo-nbr9062/auditoria";
import type { ConsoloResultado } from "@/core/calculators/consolo-nbr9062/calc";
import type { ConsoloInput } from "@/core/calculators/consolo-nbr9062/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * ⚠️ **TEMPORÁRIO — sai da tela depois da validação com o cliente.**
 *
 * Mostra a trilha completa do cálculo: fórmula, números substituídos,
 * resultado e a célula equivalente na planilha de origem. Serve para conferir
 * o motor contra a planilha linha a linha.
 *
 * Para remover: apagar este arquivo, o
 * `src/core/calculators/consolo-nbr9062/auditoria.ts` e o bloco marcado em
 * `resultado-consolo.tsx`.
 */
export function AuditoriaConsolo({
  e,
  r,
}: {
  e: ConsoloInput;
  r: ConsoloResultado;
}) {
  const [aberta, setAberta] = useState(false);
  const blocos = auditoriaConsolo(e, r);

  return (
    <div className="print:hidden">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="varredura"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
      >
        <FileSearch className="h-4 w-4" />
        {aberta ? "Ocultar auditoria" : "Auditar o cálculo"}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${aberta ? "rotate-180" : ""}`}
        />
      </Button>

      {aberta && (
        <Card className="mt-3 border-primary/30">
          <CardContent className="space-y-6 pt-6">
            <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              Cada linha traz a fórmula, os números desta análise e a célula
              equivalente na planilha de origem, para conferência direta. Os
              valores são os que ficaram gravados no laudo — nada é
              recalculado aqui.
            </p>

            {blocos.map((b) => (
              <div key={b.titulo} className="space-y-2">
                <div>
                  <h4 className="text-sm font-semibold">{b.titulo}</h4>
                  {b.nota && (
                    <p className="text-xs text-muted-foreground">{b.nota}</p>
                  )}
                </div>

                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[720px] text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Símbolo</th>
                        <th className="px-3 py-2 font-medium">Fórmula</th>
                        <th className="px-3 py-2 font-medium">Substituindo</th>
                        <th className="px-3 py-2 text-right font-medium">
                          Resultado
                        </th>
                        <th className="px-3 py-2 font-medium">Na planilha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.passos.map((p, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-3 py-2 align-top">
                            <span className="font-mono font-medium">
                              {p.simbolo}
                            </span>
                            <p className="text-muted-foreground">
                              {p.descricao}
                            </p>
                          </td>
                          <td className="px-3 py-2 align-top font-mono text-muted-foreground">
                            {p.formula}
                          </td>
                          <td className="px-3 py-2 align-top font-mono">
                            {p.substituicao}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right align-top font-mono font-medium tabular-nums">
                            {p.valor}
                            {p.unidade && (
                              <span className="ml-1 font-normal text-muted-foreground">
                                {p.unidade}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top font-mono text-[0.7rem] text-muted-foreground">
                            {p.celula}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
