"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireModulo } from "@/lib/modulo";
import { contaComOrganizacao } from "@/lib/organizacao";
import { idClienteValido } from "@/lib/cliente";
import { gravarAnalise } from "@/lib/analise-comum";
import {
  granulometriaSchema,
  PENEIRAS,
  type GranulometriaInput,
} from "@/core/calculators/granulometria-areias/schema";
import {
  calcularGranulometria,
  melhorTeor,
  type GranulometriaResultado,
} from "@/core/calculators/granulometria-areias/calc";

const MODULO = "concreto-fresco-endurecido";
const CALCULADORA = "granulometria-areias";

export type EstadoGranulometria =
  | {
      ok: true;
      entradas: GranulometriaInput;
      resultado: GranulometriaResultado;
      sugestao: { teor: number; otimas: number };
      /** Devolvido para o select não se perder ao recalcular. */
      idCliente: number | null;
    }
  | { ok: false; error: string }
  | null;

/** Lê as 10 massas de uma série do formulário. */
function serie(formData: FormData, prefixo: string): number[] {
  return PENEIRAS.map((_, i) => {
    const v = formData.get(`${prefixo}_${i}`);
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  });
}

function lerFormulario(formData: FormData) {
  return {
    nomeAreiaA: formData.get("nomeAreiaA") || "Areia fina",
    nomeAreiaB: formData.get("nomeAreiaB") || "Areia regular",
    areiaA1: serie(formData, "a1"),
    areiaA2: serie(formData, "a2"),
    areiaB1: serie(formData, "b1"),
    areiaB2: serie(formData, "b2"),
    teorMistura: formData.get("teorMistura"),
    titulo: formData.get("titulo"),
    observacao: formData.get("observacao"),
  };
}

export async function calcularGranul(
  _prev: EstadoGranulometria,
  formData: FormData
): Promise<EstadoGranulometria> {
  await requireModulo(MODULO);
  const { organizacao } = await contaComOrganizacao();

  const parsed = granulometriaSchema.safeParse(lerFormulario(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const melhor = melhorTeor(parsed.data);
  return {
    ok: true,
    entradas: parsed.data,
    resultado: calcularGranulometria(parsed.data),
    sugestao: { teor: melhor.teor, otimas: melhor.otimas },
    idCliente: await idClienteValido(
      formData.get("idCliente"),
      organizacao.id
    ),
  };
}

/**
 * Grava a análise com o snapshot dos resultados.
 *
 * O resultado é recalculado no servidor a partir das entradas — nunca
 * aceito do formulário.
 */
export async function salvarGranul(
  _prev: EstadoGranulometria,
  formData: FormData
): Promise<EstadoGranulometria> {
  await requireModulo(MODULO);

  const parsed = granulometriaSchema.safeParse(lerFormulario(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const resultado = calcularGranulometria(parsed.data);

  const r = await gravarAnalise({
    formData,
    slugCalculadora: CALCULADORA,
    tituloPadrao: "Granulometria sem título",
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
