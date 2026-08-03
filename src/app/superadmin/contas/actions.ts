"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin, isSuperadmin } from "@/lib/superadmin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { registrar, idContaPorEmail } from "@/lib/auditoria";
import {
  editarContaSchema,
  senhaContaSchema,
  idSchema,
} from "@/lib/validations/superadmin";
import type { ActionState } from "@/app/(auth)/actions";

const PATH = "/superadmin/contas";

export async function editarConta(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user } = await requireSuperadmin();

  const parsed = editarContaSchema.safeParse({
    idConta: formData.get("idConta"),
    nome: formData.get("nome"),
    telefone: formData.get("telefone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.conta.update({
    where: { id: parsed.data.idConta },
    data: {
      nome: parsed.data.nome || null,
      telefone: parsed.data.telefone || null,
    },
  });

  await registrar({
    idConta: await idContaPorEmail(user.email),
    acao: "conta.editar",
    entidade: "Conta",
    entidadeId: parsed.data.idConta,
  });

  revalidatePath(PATH);
  return { success: "Dados atualizados." };
}

export async function alterarSenha(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user } = await requireSuperadmin();

  const parsed = senhaContaSchema.safeParse({
    idConta: formData.get("idConta"),
    novaSenha: formData.get("novaSenha"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const conta = await prisma.conta.findUnique({
    where: { id: parsed.data.idConta },
    select: { authUserId: true, email: true },
  });
  if (!conta?.authUserId) {
    return { error: "Conta sem vínculo no Auth." };
  }

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.auth.admin.updateUserById(conta.authUserId, {
      password: parsed.data.novaSenha,
    });
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao alterar senha." };
  }

  // Senha definida por terceiro -> o dono troca no próximo acesso.
  await prisma.conta.update({
    where: { id: parsed.data.idConta },
    data: { trocarSenha: true },
  });

  await registrar({
    idConta: await idContaPorEmail(user.email),
    acao: "conta.senha",
    entidade: "Conta",
    entidadeId: parsed.data.idConta,
    detalhes: { email: conta.email },
  });

  revalidatePath(PATH);
  return {
    success: `Senha alterada. ${conta.email} terá de trocá-la no próximo acesso.`,
  };
}

export async function alternarAtivo(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user } = await requireSuperadmin();

  const parsed = idSchema.safeParse(formData.get("idConta"));
  if (!parsed.success) return { error: "Dados inválidos." };

  const conta = await prisma.conta.findUnique({
    where: { id: parsed.data },
    select: { email: true, ativa: true },
  });
  if (!conta) return { error: "Conta não encontrada." };

  // Trancar a si mesmo para fora seria irreversível pela interface.
  if (conta.ativa && isSuperadmin(conta.email)) {
    return { error: "Não dá para inativar o próprio superadmin." };
  }

  await prisma.conta.update({
    where: { id: parsed.data },
    data: { ativa: !conta.ativa },
  });

  await registrar({
    idConta: await idContaPorEmail(user.email),
    acao: conta.ativa ? "conta.inativar" : "conta.reativar",
    entidade: "Conta",
    entidadeId: parsed.data,
    detalhes: { email: conta.email },
  });

  revalidatePath(PATH);
  return {
    success: conta.ativa
      ? `${conta.email} inativada — login bloqueado.`
      : `${conta.email} reativada.`,
  };
}
