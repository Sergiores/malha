"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Calculator, Save } from "lucide-react";
import {
  calcularConsoloAction,
  salvarConsolo,
  type EstadoConsolo,
} from "./actions";
import {
  ANCORAGENS,
  APOIOS,
  BITOLAS,
  CLASSES_ACO,
  CLASSES_CONCRETO,
  CONCRETAGENS,
  VAZIO,
} from "@/core/calculators/consolo-nbr9062/schema";
import { ResultadoConsolo } from "@/components/resultado-consolo";
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

type Valores = Record<string, unknown>;

export function FormConsolo({
  clientes,
  modo = { tipo: "novo" },
  iniciais,
  idClienteInicial,
  parecerInicial = "",
  validadeInicial = "",
}: {
  clientes: ClienteOpcao[];
  modo?: ModoFormulario;
  iniciais?: Valores;
  idClienteInicial?: number | null;
  parecerInicial?: string;
  validadeInicial?: string;
}) {
  const [estado, acaoCalcular] = useActionState<EstadoConsolo, FormData>(
    calcularConsoloAction,
    null
  );
  const [estadoSalvar, acaoSalvar] = useActionState<EstadoConsolo, FormData>(
    salvarConsolo,
    null
  );

  // Ordem de precedência: o que acabou de ser calculado > o que veio da
  // análise carregada > formulário em branco.
  const v = (estado?.ok ? estado.entradas : (iniciais ?? VAZIO)) as Valores;

  const txt = (k: string) => (v[k] === undefined || v[k] === null ? "" : String(v[k]));

  // Controlados porque são `<select>`: ver o comentário em SelectCampo.
  const [fck, setFck] = useState(txt("fck") || "25");
  const [aco, setAco] = useState(txt("aco") || "CA50");
  const [concretagem, setConcretagem] = useState(txt("concretagem") || "PRIMEIRA");
  const [bitola, setBitola] = useState(txt("bitola") || "10");
  const [apoio, setApoio] = useState(txt("apoio") || "JUNTA_SECO");
  const [ancoragem, setAncoragem] = useState(txt("ancoragem") || "LACO");

  const erro =
    (estado && !estado.ok && estado.error) ||
    (estadoSalvar && !estadoSalvar.ok && estadoSalvar.error);

  const clienteSelecionado = estado?.ok
    ? estado.idCliente
    : (idClienteInicial ?? null);

  // A-01: peça fora do domínio de consolo não vira laudo.
  const podeSalvar = estado?.ok && !estado.resultado.foraDeEscopo;

  return (
    <div className="space-y-4">
      <form id="consolo" action={acaoCalcular} className="space-y-4">
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
                defaultValue={txt("titulo")}
                placeholder="Ex.: Consolo P12 — Galpão Industrial"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="observacao">Observação</Label>
              <Input
                id="observacao"
                name="observacao"
                defaultValue={txt("observacao")}
                placeholder="Peça, eixo, projeto…"
              />
            </div>
          </CardContent>
        </Card>

        <SeletorCliente clientes={clientes} idSelecionado={clienteSelecionado} />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Materiais e execução</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="fck">Classe do concreto</Label>
              <SelectCampo id="fck" name="fck" value={fck} onChange={setFck}>
                {CLASSES_CONCRETO.map((c) => (
                  <option key={c} value={c}>
                    C{c} — fck {c} MPa
                  </option>
                ))}
              </SelectCampo>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aco">Classe do aço</Label>
              <SelectCampo id="aco" name="aco" value={aco} onChange={setAco}>
                {CLASSES_ACO.map((a) => (
                  <option key={a.chave} value={a.chave}>
                    {a.nome} — fyk {a.fyk} MPa
                  </option>
                ))}
              </SelectCampo>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="concretagem">Concretagem</Label>
              <SelectCampo
                id="concretagem"
                name="concretagem"
                value={concretagem}
                onChange={setConcretagem}
              >
                {CONCRETAGENS.map((c) => (
                  <option key={c.chave} value={c.chave}>
                    {c.nome} — γn {c.gamaN.toLocaleString("pt-BR")}
                  </option>
                ))}
              </SelectCampo>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Geometria</CardTitle>
            <CardDescription>
              Medidas em centímetros. O croqui do resultado redesenha a peça com
              estes valores.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Campo nome="b" rotulo="Largura b" valor={txt("b")} passo="1" />
            <Campo nome="h" rotulo="Altura h" valor={txt("h")} passo="1" />
            <Campo nome="l" rotulo="Avanço l" valor={txt("l")} passo="1" />
            <Campo
              nome="a"
              rotulo="Balanço a"
              valor={txt("a")}
              passo="0.5"
              ajuda="Da face do pilar ao ponto de aplicação da carga."
            />
            <Campo
              nome="c"
              rotulo="Cobrimento c"
              valor={txt("c")}
              passo="0.5"
            />
            <div className="space-y-1.5">
              <Label htmlFor="bitola" className="flex items-baseline gap-1">
                Bitola do tirante
                <span className="text-xs font-normal text-muted-foreground">
                  (mm)
                </span>
              </Label>
              <SelectCampo
                id="bitola"
                name="bitola"
                value={bitola}
                onChange={setBitola}
              >
                {BITOLAS.map((b) => (
                  <option key={b} value={b}>
                    ø {b.toLocaleString("pt-BR")} mm
                  </option>
                ))}
              </SelectCampo>
              <p className="text-xs text-muted-foreground">
                Entra na geometria e em d′ = c + ø/2.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Apoio e ancoragem</CardTitle>
            <CardDescription>
              O tipo de apoio define quanta força horizontal chega ao consolo.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5 lg:col-span-2">
              <Label htmlFor="apoio">Aparelho de apoio</Label>
              <SelectCampo
                id="apoio"
                name="apoio"
                value={apoio}
                onChange={setApoio}
              >
                {APOIOS.map((a) => (
                  <option key={a.chave} value={a.chave}>
                    {a.nome} — Hsd = {a.fator.toLocaleString("pt-BR")} × Fsd
                  </option>
                ))}
              </SelectCampo>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ancoragem">Ancoragem do tirante</Label>
              <SelectCampo
                id="ancoragem"
                name="ancoragem"
                value={ancoragem}
                onChange={setAncoragem}
              >
                {ANCORAGENS.map((a) => (
                  <option key={a.chave} value={a.chave}>
                    {a.nome}
                  </option>
                ))}
              </SelectCampo>
            </div>
            <Campo
              nome="an"
              rotulo="Comprimento aₙ"
              valor={txt("an")}
              passo="0.5"
            />
            <Campo
              nome="bn"
              rotulo="Largura bₙ"
              valor={txt("bn")}
              passo="0.5"
              ajuda="Não pode passar da largura b do consolo."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Carregamento</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Campo
              nome="fk"
              rotulo="Força vertical Fk"
              valor={txt("fk")}
              passo="0.5"
              unidade="kN"
              ajuda="Valor característico."
            />
          </CardContent>
        </Card>

        <CamposLaudo parecer={parecerInicial} validoAte={validadeInicial} />

        {erro && (
          <p className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {erro}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <SubmitButton>
            <Calculator className="h-4 w-4" />
            Calcular
          </SubmitButton>
          {podeSalvar && (
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
          <ResultadoConsolo r={estado.resultado} e={estado.entradas} />
        </div>
      )}
    </div>
  );
}

function Campo({
  nome,
  rotulo,
  valor,
  passo,
  unidade = "cm",
  ajuda,
}: {
  nome: string;
  rotulo: string;
  valor: string;
  passo: string;
  unidade?: string;
  ajuda?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={nome} className="flex items-baseline gap-1">
        {rotulo}
        <span className="text-xs font-normal text-muted-foreground">
          ({unidade})
        </span>
      </Label>
      <Input
        id={nome}
        name={nome}
        type="number"
        step={passo}
        min="0"
        inputMode="decimal"
        defaultValue={valor}
        placeholder="0"
        required
      />
      {ajuda && <p className="text-xs text-muted-foreground">{ajuda}</p>}
    </div>
  );
}
