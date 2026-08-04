"use client";

import { useActionState } from "react";
import { AlertCircle, Calculator, Save } from "lucide-react";
import { calcular, salvarAnalise, type EstadoCalculo } from "./actions";
import { VAZIO } from "@/core/calculators/dosagem-caa/schema";
import type { DosagemCaaInput } from "@/core/calculators/dosagem-caa/schema";
import { ResultadoDosagem } from "@/components/resultado-dosagem";
import {
  SeletorCliente,
  type ClienteOpcao,
} from "@/components/seletor-cliente";
import {
  AvisoModo,
  CamposLaudo,
  type ModoFormulario,
} from "@/components/campos-laudo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Campo = {
  nome: keyof DosagemCaaInput;
  rotulo: string;
  unidade?: string;
  passo: string;
  ajuda?: string;
};

const DADOS: Campo[] = [
  { nome: "cimento", rotulo: "Consumo de cimento", unidade: "kg/m³", passo: "1" },
  { nome: "fatorAC", rotulo: "Fator água/cimento", passo: "0.01" },
  { nome: "teorArgamassa", rotulo: "Teor de argamassa", unidade: "%", passo: "0.1" },
  { nome: "teorFiler", rotulo: "Teor de fíler", unidade: "%", passo: "0.1", ajuda: "Fração do agregado miúdo substituída por fíler." },
  { nome: "teorAditivo", rotulo: "Teor de aditivo", unidade: "%", passo: "0.01", ajuda: "Sobre a massa de cimento." },
  { nome: "massaEspecifica", rotulo: "Massa específica do concreto", unidade: "kg/m³", passo: "10" },
];

const PRECOS: Campo[] = [
  { nome: "precoCimento", rotulo: "Cimento", unidade: "R$/kg", passo: "0.0001" },
  { nome: "precoFiler", rotulo: "Fíler", unidade: "R$/kg", passo: "0.0001" },
  { nome: "precoMiudo", rotulo: "Agregado miúdo", unidade: "R$/kg", passo: "0.0001" },
  { nome: "precoGraudo", rotulo: "Agregado graúdo", unidade: "R$/kg", passo: "0.0001" },
  { nome: "precoAgua", rotulo: "Água", unidade: "R$/kg", passo: "0.0001" },
  { nome: "precoAditivo", rotulo: "Aditivo", unidade: "R$/kg", passo: "0.01" },
];

export function FormDosagem({
  clientes,
  modo = { tipo: "novo" },
  iniciais,
  idClienteInicial,
  parecerInicial = "",
  validadeInicial = "",
}: {
  clientes: ClienteOpcao[];
  modo?: ModoFormulario;
  /** Valores vindos de uma análise carregada para editar ou copiar. */
  iniciais?: Partial<Record<keyof DosagemCaaInput, string | number>>;
  idClienteInicial?: number | null;
  parecerInicial?: string;
  validadeInicial?: string;
}) {
  const [estado, acaoCalcular] = useActionState<EstadoCalculo, FormData>(
    calcular,
    null
  );
  const [estadoSalvar, acaoSalvar] = useActionState<EstadoCalculo, FormData>(
    salvarAnalise,
    null
  );

  const erro =
    (estado && !estado.ok && estado.error) ||
    (estadoSalvar && !estadoSalvar.ok && estadoSalvar.error);

  // Ordem de precedência: o que o usuário acabou de calcular > o que veio da
  // análise carregada > formulário em branco.
  const v: Partial<Record<keyof DosagemCaaInput, string | number>> =
    estado?.ok ? estado.entradas : (iniciais ?? VAZIO);

  // Numa cópia, o cliente também vem preenchido — mas continua trocável.
  const clienteSelecionado = estado?.ok
    ? estado.idCliente
    : (idClienteInicial ?? null);

  return (
    <div className="space-y-4">
      <form id="dosagem" action={acaoCalcular} className="space-y-4">
        <AvisoModo modo={modo} />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Identificação</CardTitle>
            <CardDescription>
              Usado no laudo e na lista de análises.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                name="titulo"
                defaultValue={v.titulo}
                placeholder="Ex.: CAA 40 MPa — Obra Centro"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="observacao">Observação</Label>
              <Input
                id="observacao"
                name="observacao"
                defaultValue={v.observacao}
                placeholder="Referência do traço, lote, responsável…"
              />
            </div>
          </CardContent>
        </Card>

        <SeletorCliente clientes={clientes} idSelecionado={clienteSelecionado} />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dados da dosagem</CardTitle>
            <CardDescription>Método Tutikian.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DADOS.map((c) => (
              <CampoNumerico key={c.nome} campo={c} valor={v[c.nome]} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Preços dos insumos</CardTitle>
            <CardDescription>
              Entram no cálculo do custo. Ajuste conforme sua praça — os valores
              iniciais são apenas referência.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PRECOS.map((c) => (
              <CampoNumerico key={c.nome} campo={c} valor={v[c.nome]} />
            ))}
          </CardContent>
        </Card>

        <CamposLaudo parecer={parecerInicial} validoAte={validadeInicial} />

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
              {modo.tipo === "editar" ? "Salvar alterações" : "Salvar análise"}
            </SubmitButton>
          )}
        </div>
      </form>

      {estado?.ok && (
        <div className="space-y-4 border-t pt-4">
          <h2 className="text-lg font-semibold">Resultado</h2>
          <ResultadoDosagem r={estado.resultado} />
        </div>
      )}
    </div>
  );
}

function CampoNumerico({
  campo,
  valor,
}: {
  campo: Campo;
  valor: string | number | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={campo.nome} className="flex items-baseline gap-1">
        {campo.rotulo}
        {campo.unidade && (
          <span className="text-xs font-normal text-muted-foreground">
            ({campo.unidade})
          </span>
        )}
      </Label>
      <Input
        id={campo.nome}
        name={campo.nome}
        type="number"
        step={campo.passo}
        inputMode="decimal"
        defaultValue={valor ?? ""}
        placeholder="0"
        required
      />
      {campo.ajuda && (
        <p className="text-xs text-muted-foreground">{campo.ajuda}</p>
      )}
    </div>
  );
}
