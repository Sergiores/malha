"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireModulo } from "@/lib/modulo";
import { contaComOrganizacao } from "@/lib/organizacao";
import { idClienteValido } from "@/lib/cliente";
import { gravarAnalise } from "@/lib/analise-comum";
import {
  consoloSchema,
  type ConsoloInput,
} from "@/core/calculators/consolo-nbr9062/schema";
import {
  calcularConsolo,
  type ConsoloResultado,
} from "@/core/calculators/consolo-nbr9062/calc";

const MODULO = "estrutura-concreto";
const CALCULADORA = "consolo-nbr9062";

export type EstadoConsolo =
  | {
      ok: true;
      entradas: ConsoloInput;
      resultado: ConsoloResultado;
      /** Devolvido para o select não se perder ao recalcular. */
      idCliente: number | null;
    }
  /**
   * O erro carrega de volta o que foi digitado.
   *
   * Sem isso o formulário se esvazia a cada validação recusada: o React 19
   * dá `form.reset()` quando a action termina, e os campos voltam ao
   * `defaultValue` — que, sem `entradas` no estado, é o formulário em branco.
   * Errar uma medida apagava as outras treze.
   */
  | {
      ok: false;
      error: string;
      /** Ausente quando o erro vem do salvar: ali o estado do cálculo, que
          já tem as entradas válidas, é quem repovoa a tela. */
      valores?: Record<string, unknown>;
      idCliente?: number | null;
    }
  | null;

function lerFormulario(formData: FormData) {
  const campos = [
    "fck",
    "aco",
    "concretagem",
    "b",
    "h",
    "l",
    "a",
    "c",
    "bitola",
    "apoio",
    "an",
    "bn",
    "ancoragem",
    "fk",
    "titulo",
    "observacao",
  ] as const;
  return Object.fromEntries(campos.map((c) => [c, formData.get(c)]));
}

/** Calcula sem gravar — o engenheiro itera antes de decidir salvar. */
export async function calcularConsoloAction(
  _prev: EstadoConsolo,
  formData: FormData
): Promise<EstadoConsolo> {
  // Guard também na action: a página não é o único caminho até aqui.
  await requireModulo(MODULO);
  const { organizacao } = await contaComOrganizacao();

  const bruto = lerFormulario(formData);
  const idCliente = await idClienteValido(
    formData.get("idCliente"),
    organizacao.id
  );

  const parsed = consoloSchema.safeParse(bruto);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      valores: bruto,
      idCliente,
    };
  }

  return {
    ok: true,
    entradas: parsed.data,
    resultado: calcularConsolo(parsed.data),
    idCliente,
  };
}

/**
 * Grava a análise com o snapshot dos resultados.
 *
 * O resultado é recalculado no servidor a partir das entradas — nunca aceito
 * do formulário.
 */
export async function salvarConsolo(
  _prev: EstadoConsolo,
  formData: FormData
): Promise<EstadoConsolo> {
  await requireModulo(MODULO);

  const parsed = consoloSchema.safeParse(lerFormulario(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const resultado = calcularConsolo(parsed.data);

  // A-01: peça fora do domínio de consolo não produz laudo. O laudo é o
  // snapshot de um dimensionamento, e aqui não houve nenhum.
  if (resultado.foraDeEscopo) {
    return {
      ok: false,
      error:
        resultado.mensagemEscopo ??
        "A peça está fora do domínio de consolo e não pode ser salva como laudo.",
    };
  }

  const r = await gravarAnalise({
    formData,
    slugCalculadora: CALCULADORA,
    tituloPadrao: "Consolo sem título",
    entradas: parsed.data,
    resultados: resultado,
  });
  if (!r.ok) return { ok: false, error: r.error };

  // Inclui o laudo: salvar também pode ser editar um rascunho já existente.
  revalidatePath(`/m/${MODULO}/analises/${r.id}`);
  revalidatePath(`/m/${MODULO}/analises`);
  revalidatePath("/dashboard");
  redirect(`/m/${MODULO}/analises/${r.id}`);
}
