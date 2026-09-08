"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireModulo } from "@/lib/modulo";
import { contaComOrganizacao } from "@/lib/organizacao";
import { idClienteValido } from "@/lib/cliente";
import { gravarAnalise } from "@/lib/analise-comum";
import {
  idadeConcretoSchema,
  type IdadeConcretoInput,
} from "@/core/calculators/idade-concreto/schema";
import {
  calcularIdadeConcreto,
  type IdadeConcretoResultado,
} from "@/core/calculators/idade-concreto/calc";

const MODULO = "concreto-fresco-endurecido";
const CALCULADORA = "idade-concreto";

export type EstadoIdade =
  | {
      ok: true;
      entradas: IdadeConcretoInput;
      resultado: IdadeConcretoResultado;
      /** Devolvido para o select não se perder ao recalcular. */
      idCliente: number | null;
    }
  /**
   * O erro carrega de volta o que foi digitado — sem isso o formulário se
   * esvazia a cada validação recusada, por causa do `form.reset()` que o
   * React 19 dá quando a action termina.
   */
  | {
      ok: false;
      error: string;
      valores?: Record<string, unknown>;
      idCliente?: number | null;
    }
  | null;

function lerFormulario(formData: FormData) {
  return {
    fck28: formData.get("fck28"),
    idade: formData.get("idade"),
    cimento: formData.get("cimento"),
    carga: formData.get("carga"),
    unidadeCarga: formData.get("unidadeCarga"),
    titulo: formData.get("titulo"),
    observacao: formData.get("observacao"),
  };
}

/** Calcula sem gravar — o engenheiro itera antes de decidir salvar. */
export async function calcularIdade(
  _prev: EstadoIdade,
  formData: FormData
): Promise<EstadoIdade> {
  // Guard também na action: a página não é o único caminho até aqui.
  await requireModulo(MODULO);
  const { organizacao } = await contaComOrganizacao();

  const bruto = lerFormulario(formData);
  const idCliente = await idClienteValido(
    formData.get("idCliente"),
    organizacao.id
  );

  const parsed = idadeConcretoSchema.safeParse(bruto);
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
    resultado: calcularIdadeConcreto(parsed.data),
    idCliente,
  };
}

/**
 * Grava a análise com o snapshot dos resultados.
 *
 * O resultado é recalculado no servidor a partir das entradas — nunca aceito
 * do formulário.
 */
export async function salvarIdade(
  _prev: EstadoIdade,
  formData: FormData
): Promise<EstadoIdade> {
  await requireModulo(MODULO);

  const parsed = idadeConcretoSchema.safeParse(lerFormulario(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const r = await gravarAnalise({
    formData,
    slugCalculadora: CALCULADORA,
    tituloPadrao: "Idade do concreto sem título",
    entradas: parsed.data,
    resultados: calcularIdadeConcreto(parsed.data),
  });
  if (!r.ok) return { ok: false, error: r.error };

  // Inclui o laudo: salvar também pode ser editar um rascunho já existente.
  revalidatePath(`/m/${MODULO}/analises/${r.id}`);
  revalidatePath(`/m/${MODULO}/analises`);
  revalidatePath("/dashboard");
  redirect(`/m/${MODULO}/analises/${r.id}`);
}
