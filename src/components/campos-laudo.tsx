"use client";

import { useState } from "react";
import { CalendarClock, PenLine, Pencil, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type ModoFormulario =
  | { tipo: "novo" }
  | { tipo: "editar"; id: number; titulo: string }
  | { tipo: "copia"; deTitulo: string };

/**
 * Faixa que avisa de onde vieram os valores da tela.
 *
 * Sem isso o engenheiro não distingue "estou corrigindo o laudo 12" de
 * "estou criando o laudo 13 a partir do 12" — e os dois começam com a tela
 * idêntica, preenchida.
 */
export function AvisoModo({ modo }: { modo: ModoFormulario }) {
  if (modo.tipo === "novo") return null;

  const editando = modo.tipo === "editar";
  const Icone = editando ? Pencil : Copy;

  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${
        editando
          ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
          : "border-primary/40 bg-primary/5 text-primary"
      }`}
    >
      <Icone className="mt-0.5 h-4 w-4 shrink-0" />
      {editando ? (
        <span>
          Editando o rascunho <strong>{modo.titulo}</strong>. Salvar substitui
          os valores desta análise.
        </span>
      ) : (
        <span>
          Cópia de <strong>{modo.deTitulo}</strong>. Ao salvar, nasce uma
          análise nova — a original fica intacta.
        </span>
      )}
      {editando && <input type="hidden" name="editarId" value={modo.id} />}
    </div>
  );
}

/**
 * Parecer técnico e validade.
 *
 * O parecer é o que separa cálculo de laudo: os números saem da fórmula, a
 * conclusão sai de quem assina.
 */
export function CamposLaudo({
  parecer,
  validoAte,
}: {
  parecer: string;
  validoAte: string;
}) {
  // Controlados de propósito. O botão "Calcular" reenvia o formulário e o
  // parecer é texto longo — perdê-lo num recálculo seria o pior defeito
  // possível deste campo. Com estado, sobrevive a qualquer re-render.
  const [texto, setTexto] = useState(parecer);
  const [prazo, setPrazo] = useState(validoAte);

  return (
    <Card className="card-tec">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <PenLine className="h-5 w-5 text-primary" />
          Parecer técnico
        </CardTitle>
        <CardDescription>
          Sua leitura do resultado. Sai no laudo, abaixo dos números.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="parecer" className="sr-only">
            Parecer técnico
          </Label>
          <textarea
            id="parecer"
            name="parecer"
            rows={4}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ex.: Traço atende à resistência especificada. Recomenda-se ensaio de espalhamento antes da concretagem, conforme NBR 15823."
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="w-full sm:w-56">
          <Label
            htmlFor="validoAte"
            className="flex items-center gap-1.5 pb-1.5"
          >
            <CalendarClock className="h-3.5 w-3.5" />
            Validade do laudo
          </Label>
          <Input
            id="validoAte"
            name="validoAte"
            type="date"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
          />
          <p className="pt-1 text-xs text-muted-foreground">
            Em branco = sem prazo definido.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
