"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminOrg } from "@/lib/organizacao";
import { membroSchema } from "@/lib/validations/organizacao";
import type { ActionState } from "@/app/(auth)/actions";

/**
 * Toda action valida o par (organização, membro) e confirma que o membro
 * pertence mesmo àquela organização. Sem isso, um admin de uma empresa
 * poderia mexer no vínculo de outra passando um id qualquer no formulário.
 */
async function carregarVinculo(formData: FormData) {
  const parsed = membroSchema.safeParse({
    idOrganizacao: formData.get("idOrganizacao"),
    idMembro: formData.get("idMembro"),
  });
  if (!parsed.success) return { erro: "Dados inválidos." as const };

  const { idOrganizacao, idMembro } = parsed.data;
  const ctx = await requireAdminOrg(idOrganizacao);

  const vinculo = await prisma.organizacaoMembro.findFirst({
    where: { id: idMembro, idOrganizacao },
    include: { conta: { select: { nome: true, email: true } } },
  });
  if (!vinculo) return { erro: "Membro não encontrado." as const };

  return { ctx, vinculo, idOrganizacao };
}

/** Impede que a organização fique sem nenhum administrador. */
async function ehUltimoAdmin(idOrganizacao: number, idMembro: number) {
  const admins = await prisma.organizacaoMembro.count({
    where: { idOrganizacao, papel: "ADMIN" },
  });
  if (admins > 1) return false;
  const alvo = await prisma.organizacaoMembro.findUnique({
    where: { id: idMembro },
    select: { papel: true },
  });
  return alvo?.papel === "ADMIN";
}

export async function alternarPapel(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const r = await carregarVinculo(formData);
  if ("erro" in r) return { error: r.erro };
  const { vinculo, idOrganizacao } = r;

  const novoPapel = vinculo.papel === "ADMIN" ? "MEMBRO" : "ADMIN";

  if (novoPapel === "MEMBRO" && (await ehUltimoAdmin(idOrganizacao, vinculo.id))) {
    return {
      error:
        "A organização ficaria sem administrador. Promova outro membro antes.",
    };
  }

  await prisma.organizacaoMembro.update({
    where: { id: vinculo.id },
    data: { papel: novoPapel },
  });
  await prisma.logAuditoria.create({
    data: {
      idConta: r.ctx.conta.id,
      acao: "organizacao.papel",
      entidade: "OrganizacaoMembro",
      entidadeId: vinculo.id,
      detalhes: { de: vinculo.papel, para: novoPapel },
    },
  });

  revalidatePath(`/o/${idOrganizacao}/membros`);
  return {
    success: `${vinculo.conta.nome ?? vinculo.conta.email} agora é ${
      novoPapel === "ADMIN" ? "administrador" : "membro"
    }.`,
  };
}

export async function removerMembro(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const r = await carregarVinculo(formData);
  if ("erro" in r) return { error: r.erro };
  const { vinculo, idOrganizacao, ctx } = r;

  if (await ehUltimoAdmin(idOrganizacao, vinculo.id)) {
    return { error: "Não dá para remover o último administrador." };
  }

  await prisma.organizacaoMembro.delete({ where: { id: vinculo.id } });
  await prisma.logAuditoria.create({
    data: {
      idConta: ctx.conta.id,
      acao: "organizacao.remover_membro",
      entidade: "OrganizacaoMembro",
      entidadeId: vinculo.id,
      detalhes: { email: vinculo.conta.email },
    },
  });

  revalidatePath(`/o/${idOrganizacao}/membros`);
  return {
    success: `${vinculo.conta.nome ?? vinculo.conta.email} foi removido.`,
  };
}
