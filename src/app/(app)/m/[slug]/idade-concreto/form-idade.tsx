"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Calculator, Save } from "lucide-react";
import { calcularIdade, salvarIdade, type EstadoIdade } from "./actions";
import {
  CIMENTOS,
  UNIDADES_CARGA,
  VAZIO,
} from "@/core/calculators/idade-concreto/schema";
import { ResultadoIdade } from "@/components/resultado-idade";
import {
  SeletorCliente,
  type ClienteOpcao,
} from "@/components/seletor-cliente";
import {
  AvisoModo,
  CamposLaudo,
  type ModoFormulario,
} from "@/components/campos-laudo";
import { SelectCampo } from "@/components/select-campo";
import { useFormSujo } from "@/components/form-sujo";
import { AvisoRecalcular } from "@/components/aviso-recalcular";
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

export function FormIdade({
  clientes,
  modo = { tipo: "novo" },
  iniciais,
  idClienteInicial,
  parecerInicial = "",
  validadeInicial = "",
}: {
  clientes: ClienteOpcao[];
  modo?: ModoFormulario;
  iniciais?: Record<string, unknown>;
  idClienteInicial?: number | null;
  parecerInicial?: string;
  validadeInicial?: string;
}) {
  const [estado, acaoCalcular] = useActionState<EstadoIdade, FormData>(
    calcularIdade,
    null
  );
  const [estadoSalvar, acaoSalvar] = useActionState<EstadoIdade, FormData>(
    salvarIdade,
    null
  );

  // Ordem: o que acabou de ser calculado > o que foi digitado e recusado na
  // validação > o que veio da análise carregada > em branco. O segundo caso
  // impede o formulário de se esvaziar quando um valor é recusado.
  const v = (
    estado?.ok ? estado.entradas : (estado?.valores ?? iniciais ?? VAZIO)
  ) as {
    fck28?: number | string;
    idade?: number | string;
    cimento?: string;
    carga?: number | string;
    unidadeCarga?: string;
    titulo?: string;
    observacao?: string;
  };

  // Controlados porque são `<select>`: ver o comentário em SelectCampo.
  const [cimento, setCimento] = useState(
    typeof v.cimento === "string" ? v.cimento : "CP_II"
  );
  const [unidade, setUnidade] = useState(
    typeof v.unidadeCarga === "string" ? v.unidadeCarga : "kN"
  );

  const erro =
    (estado && !estado.ok && estado.error) ||
    (estadoSalvar && !estadoSalvar.ok && estadoSalvar.error);

  // Também no erro: o cliente não pode se perder junto com a validação.
  const clienteSelecionado = estado
    ? (estado.idCliente ?? null)
    : (idClienteInicial ?? null);

  const sAtual = CIMENTOS.find((c) => c.chave === cimento)?.s;

  // Só se salva o que foi calculado: mexer num campo esconde o Salvar.
  const { sujo, aoMudar } = useFormSujo(estado);

  return (
    <div className="space-y-4">
      <form
        id="idade"
        action={acaoCalcular}
        onInput={aoMudar}
        onChange={aoMudar}
        className="space-y-4"
      >
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
                placeholder="Ex.: Desforma da laje L3 — Obra Centro"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="observacao">Observação</Label>
              <Input
                id="observacao"
                name="observacao"
                defaultValue={v.observacao}
                placeholder="Peça, data da concretagem, responsável…"
              />
            </div>
          </CardContent>
        </Card>

        <SeletorCliente clientes={clientes} idSelecionado={clienteSelecionado} />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Concreto</CardTitle>
            <CardDescription>
              A resistência de projeto e a idade em que a peça está sendo
              verificada.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="fck28" className="flex items-baseline gap-1">
                fck aos 28 dias
                <span className="text-xs font-normal text-muted-foreground">
                  (MPa)
                </span>
              </Label>
              <Input
                id="fck28"
                name="fck28"
                type="number"
                step="0.5"
                min="0"
                inputMode="decimal"
                defaultValue={v.fck28 ?? ""}
                placeholder="0"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="idade" className="flex items-baseline gap-1">
                Idade efetiva
                <span className="text-xs font-normal text-muted-foreground">
                  (dias)
                </span>
              </Label>
              <Input
                id="idade"
                name="idade"
                type="number"
                step="1"
                min="1"
                inputMode="numeric"
                defaultValue={v.idade ?? ""}
                placeholder="0"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cimento">Tipo de cimento</Label>
              <SelectCampo
                id="cimento"
                name="cimento"
                value={cimento}
                onChange={setCimento}
              >
                {CIMENTOS.map((c) => (
                  <option key={c.chave} value={c.chave}>
                    {c.nome} — {c.descricao}
                  </option>
                ))}
              </SelectCampo>
              <p className="text-xs text-muted-foreground">
                Coeficiente s = {sAtual?.toLocaleString("pt-BR") ?? "—"}. Quanto
                menor, mais cedo o concreto chega perto da resistência final.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Carga de projeto</CardTitle>
            <CardDescription>
              Opcional. Informe para saber quanto da carga a peça já suporta
              nesta idade.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="carga">Carga</Label>
              <Input
                id="carga"
                name="carga"
                type="number"
                step="0.1"
                min="0"
                inputMode="decimal"
                defaultValue={v.carga ?? ""}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unidadeCarga">Unidade</Label>
              <SelectCampo
                id="unidadeCarga"
                name="unidadeCarga"
                value={unidade}
                onChange={setUnidade}
              >
                {UNIDADES_CARGA.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </SelectCampo>
            </div>
          </CardContent>
        </Card>

        <CamposLaudo parecer={parecerInicial} validoAte={validadeInicial} />

        {erro && (
          <p className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {erro}
          </p>
        )}

        {estado?.ok && sujo && <AvisoRecalcular />}

        <div className="flex flex-wrap gap-2">
          <SubmitButton>
            <Calculator className="h-4 w-4" />
            Calcular
          </SubmitButton>
          {estado?.ok && !sujo && (
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
          <ResultadoIdade r={estado.resultado} idade={estado.entradas.idade} />
        </div>
      )}
    </div>
  );
}
