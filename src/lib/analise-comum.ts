import { prisma } from "@/lib/prisma";
import { contaComOrganizacao } from "@/lib/organizacao";
import { idClienteValido } from "@/lib/cliente";
import { dataUtc } from "@/lib/validations/superadmin";
import type { Prisma, StatusAnalise } from "@prisma/client";

/**
 * Regras compartilhadas pelas calculadoras ao gravar uma análise.
 *
 * Duas coisas que não podem variar entre calculadoras:
 *  - só RASCUNHO aceita alteração; qualquer outro status é imutável;
 *  - o resultado é sempre recalculado no servidor, nunca aceito do formulário.
 */

/** Campos que toda análise tem, independentemente da calculadora. */
export function camposComuns(formData: FormData) {
  const validoAte = String(formData.get("validoAte") ?? "").trim();
  return {
    parecer: String(formData.get("parecer") ?? "").trim() || null,
    validoAte: /^\d{4}-\d{2}-\d{2}$/.test(validoAte) ? dataUtc(validoAte) : null,
  };
}

/** `editarId` vindo do formulário, validado. */
export function idParaEditar(formData: FormData): number | null {
  const v = formData.get("editarId");
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export type ResultadoGravacao =
  | { ok: true; id: number }
  | { ok: false; error: string };

/**
 * Cria ou atualiza a análise.
 *
 * Quando `editarId` vem preenchido, exige que a análise seja da organização
 * E esteja em RASCUNHO — laudo concluído não se reescreve, se copia.
 */
export async function gravarAnalise(params: {
  formData: FormData;
  slugCalculadora: string;
  tituloPadrao: string;
  entradas: unknown;
  resultados: unknown;
}): Promise<ResultadoGravacao> {
  const { conta, organizacao } = await contaComOrganizacao();

  const calculadora = await prisma.calculadora.findUnique({
    where: { slug: params.slugCalculadora },
    select: { id: true },
  });
  if (!calculadora) return { ok: false, error: "Calculadora não encontrada." };

  const titulo =
    String(params.formData.get("titulo") ?? "").trim() || params.tituloPadrao;
  const observacao =
    String(params.formData.get("observacao") ?? "").trim() || null;
  const comuns = camposComuns(params.formData);
  const idCliente = await idClienteValido(
    params.formData.get("idCliente"),
    organizacao.id
  );

  const dados = {
    titulo,
    observacao,
    idCliente,
    ...comuns,
    entradas: params.entradas as Prisma.InputJsonValue,
    resultados: params.resultados as Prisma.InputJsonValue,
  };

  const editarId = idParaEditar(params.formData);

  if (editarId !== null) {
    const atual = await prisma.analise.findFirst({
      where: { id: editarId, idOrganizacao: organizacao.id },
      select: { status: true },
    });
    if (!atual) return { ok: false, error: "Análise não encontrada." };
    if (atual.status !== "RASCUNHO") {
      return {
        ok: false,
        error:
          "Só rascunho pode ser alterado. Use “Copiar” para partir desta análise sem mexer no laudo original.",
      };
    }

    await prisma.analise.update({ where: { id: editarId }, data: dados });
    return { ok: true, id: editarId };
  }

  // Nova análise nasce como rascunho: o engenheiro ainda vai escrever o
  // parecer e conferir antes de concluir.
  const criada = await prisma.analise.create({
    data: {
      ...dados,
      idOrganizacao: organizacao.id,
      idConta: conta.id,
      idCalculadora: calculadora.id,
      status: "RASCUNHO" as StatusAnalise,
    },
  });
  return { ok: true, id: criada.id };
}

/** Carrega uma análise da organização, para editar ou copiar. */
export async function carregarAnalise(id: number) {
  const { organizacao } = await contaComOrganizacao();
  return prisma.analise.findFirst({
    where: { id, idOrganizacao: organizacao.id },
    include: { calculadora: { select: { slug: true } } },
  });
}
