"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/modulo";
import { contaComOrganizacao } from "@/lib/organizacao";
import {
  dosagemCaaSchema,
  type DosagemCaaInput,
} from "@/core/calculators/dosagem-caa/schema";
import {
  calcularDosagemCaa,
  type DosagemCaaResultado,
} from "@/core/calculators/dosagem-caa/calc";
import type { Prisma, StatusAnalise } from "@prisma/client";

const MODULO = "concreto-fresco-endurecido";
const CALCULADORA = "dosagem-caa";

export type EstadoCalculo =
  | { ok: true; entradas: DosagemCaaInput; resultado: DosagemCaaResultado }
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

  const parsed = dosagemCaaSchema.safeParse(lerFormulario(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  return {
    ok: true,
    entradas: parsed.data,
    resultado: calcularDosagemCaa(parsed.data),
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
  const { conta, organizacao } = await contaComOrganizacao();

  const parsed = dosagemCaaSchema.safeParse(lerFormulario(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const resultado = calcularDosagemCaa(parsed.data);

  const calculadora = await prisma.calculadora.findUnique({
    where: { slug: CALCULADORA },
    select: { id: true },
  });
  if (!calculadora) return { ok: false, error: "Calculadora não encontrada." };

  const analise = await prisma.analise.create({
    data: {
      idOrganizacao: organizacao.id,
      idConta: conta.id,
      idCalculadora: calculadora.id,
      titulo: parsed.data.titulo?.trim() || "Dosagem CAA sem título",
      observacao: parsed.data.observacao || null,
      status: "CONCLUIDA",
      entradas: parsed.data as unknown as Prisma.InputJsonValue,
      resultados: resultado as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath(`/m/${MODULO}/analises`);
  revalidatePath("/dashboard");
  redirect(`/m/${MODULO}/analises/${analise.id}`);
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

  // O filtro por organização é o que impede alterar análise de outro cliente
  // passando um id qualquer no formulário.
  await prisma.analise.updateMany({
    where: { id, idOrganizacao: organizacao.id },
    data: { status },
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
