"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/superadmin";
import { registrar, idContaPorEmail } from "@/lib/auditoria";
import { idSchema } from "@/lib/validations/superadmin";
import type { ActionState } from "@/app/(auth)/actions";

const PATH = "/superadmin/organizacoes";

/**
 * Bloqueio comercial. `Organizacao.ativa = false` corta o acesso de todos os
 * membros de uma vez, independentemente das licenças de módulo — é o
 * instrumento para inadimplência.
 *
 * Não há criação manual: enquanto o sistema é monousuário, a organização
 * nasce sozinha no primeiro acesso de cada conta (`organizacaoPessoal()`).
 */
export async function alternarAtivaOrg(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user } = await requireSuperadmin();

  const parsed = idSchema.safeParse(formData.get("idOrganizacao"));
  if (!parsed.success) return { error: "Dados inválidos." };

  const org = await prisma.organizacao.findUnique({
    where: { id: parsed.data },
    select: { nome: true, ativa: true },
  });
  if (!org) return { error: "Organização não encontrada." };

  await prisma.organizacao.update({
    where: { id: parsed.data },
    data: { ativa: !org.ativa },
  });

  await registrar({
    idConta: await idContaPorEmail(user.email),
    acao: org.ativa ? "organizacao.bloquear" : "organizacao.desbloquear",
    entidade: "Organizacao",
    entidadeId: parsed.data,
    detalhes: { nome: org.nome },
  });

  revalidatePath(PATH);
  return {
    success: org.ativa
      ? `${org.nome} bloqueada — perde o acesso a tudo.`
      : `${org.nome} desbloqueada.`,
  };
}
