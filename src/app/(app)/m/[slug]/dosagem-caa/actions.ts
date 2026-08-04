"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/modulo";
import { contaComOrganizacao } from "@/lib/organizacao";
import { idClienteValido } from "@/lib/cliente";
import { gravarAnalise } from "@/lib/analise-comum";
import {
  dosagemCaaSchema,
  type DosagemCaaInput,
} from "@/core/calculators/dosagem-caa/schema";
import {
  calcularDosagemCaa,
  type DosagemCaaResultado,
} from "@/core/calculators/dosagem-caa/calc";
import type { StatusAnalise } from "@prisma/client";

const MODULO = "concreto-fresco-endurecido";
const CALCULADORA = "dosagem-caa";

export type EstadoCalculo =
  | {
      ok: true;
      entradas: DosagemCaaInput;
      resultado: DosagemCaaResultado;
      /** Devolvido para o select não se perder ao recalcular. */
      idCliente: number | null;
    }
  | { ok: false; error: string }
  | null;

function lerFormulario(formData: FormData) {
  const campos = [
    "cimento",
    "fatorAC",
    "teorArgamassa",
    "teorFiler",
    "teorAditivo",
    "massaEspecifica",
    "precoCimento",
    "precoFiler",
    "precoMiudo",
    "precoGraudo",
    "precoAgua",
    "precoAditivo",
    "titulo",
    "observacao",
  ] as const;
  return Object.fromEntries(campos.map((c) => [c, formData.get(c)]));
}

/** Calcula sem gravar — o engenheiro itera antes de decidir salvar. */
export async function calcular(
  _prev: EstadoCalculo,
  formData: FormData
): Promise<EstadoCalculo> {
  // Guard também na action: a página não é o único caminho até aqui.
  await requireModulo(MODULO);
  const { organizacao } = await contaComOrganizacao();

  const parsed = dosagemCaaSchema.safeParse(lerFormulario(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  return {
    ok: true,
    entradas: parsed.data,
    resultado: calcularDosagemCaa(parsed.data),
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
 * aceito do formulário. Caso contrário daria para forjar um laudo com
 * números que a fórmula não produz.
 */
export async function salvarAnalise(
  _prev: EstadoCalculo,
  formData: FormData
): Promise<EstadoCalculo> {
  await requireModulo(MODULO);

  const parsed = dosagemCaaSchema.safeParse(lerFormulario(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const resultado = calcularDosagemCaa(parsed.data);

  const r = await gravarAnalise({
    formData,
    slugCalculadora: CALCULADORA,
    tituloPadrao: "Dosagem CAA sem título",
    entradas: parsed.data,
    resultados: resultado,
  });
  if (!r.ok) return { ok: false, error: r.error };

  // O laudo entra aqui porque salvar também pode ser *editar* um rascunho —
  // sem isso o engenheiro salvaria a correção e cairia nos números antigos.
  revalidatePath(`/m/${MODULO}/analises/${r.id}`);
  revalidatePath(`/m/${MODULO}/analises`);
  revalidatePath("/dashboard");
  redirect(`/m/${MODULO}/analises/${r.id}`);
}

const STATUS_VALIDOS: StatusAnalise[] = [
  "RASCUNHO",
  "CONCLUIDA",
  "APROVADA",
  "ARQUIVADA",
];

/** Slug do módulo vindo do formulário, restrito ao que existe no registry. */
function slugSeguro(formData: FormData): string {
  const s = String(formData.get("slugModulo") ?? "");
  return /^[a-z0-9-]{1,60}$/.test(s) ? s : MODULO;
}

export async function alterarStatus(formData: FormData): Promise<void> {
  const { organizacao } = await contaComOrganizacao();

  const id = Number(formData.get("id"));
  const status = String(formData.get("status")) as StatusAnalise;
  if (!Number.isInteger(id) || !STATUS_VALIDOS.includes(status)) return;

  // A data de aprovação é carimbada pelo sistema, nunca digitada — é o que
  // dá fé à data no laudo. Sair de APROVADA a limpa: manter o carimbo de uma
  // aprovação desfeita seria mentira no documento.
  const data =
    status === "APROVADA"
      ? { status, aprovadaEm: new Date() }
      : { status, aprovadaEm: null };

  // O filtro por organização é o que impede alterar análise de outro cliente
  // passando um id qualquer no formulário.
  await prisma.analise.updateMany({
    where: { id, idOrganizacao: organizacao.id },
    data,
  });

  const slug = slugSeguro(formData);
  revalidatePath(`/m/${slug}/analises/${id}`);
  revalidatePath(`/m/${slug}/analises`);
  revalidatePath("/dashboard");
}

export async function excluirAnalise(formData: FormData): Promise<void> {
  const { organizacao } = await contaComOrganizacao();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await prisma.analise.deleteMany({
    where: { id, idOrganizacao: organizacao.id },
  });

  const slug = slugSeguro(formData);
  revalidatePath(`/m/${slug}/analises`);
  revalidatePath("/dashboard");
  redirect(`/m/${slug}/analises`);
}
