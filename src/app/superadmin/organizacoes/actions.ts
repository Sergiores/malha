"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/superadmin";
import { gerarCodigoConviteUnico } from "@/lib/organizacao";
import { registrar, idContaPorEmail } from "@/lib/auditoria";
import {
  idSchema,
  novaOrganizacaoAdminSchema,
} from "@/lib/validations/superadmin";
import type { ActionState } from "@/app/(auth)/actions";

const PATH = "/superadmin/organizacoes";

/**
 * Cria a organização. Se `emailAdmin` for de uma conta existente, ela já
 * entra como ADMIN — é o fluxo de venda: o cliente se cadastra, você cria
 * a empresa dele e concede os módulos.
 */
export async function criarOrganizacaoAdmin(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user } = await requireSuperadmin();

  const parsed = novaOrganizacaoAdminSchema.safeParse({
    nome: formData.get("nome"),
    cnpj: formData.get("cnpj"),
    emailAdmin: formData.get("emailAdmin"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const cnpj = parsed.data.cnpj?.replace(/\D/g, "") || null;
  if (cnpj) {
    const dup = await prisma.organizacao.findUnique({
      where: { cnpj },
      select: { id: true },
    });
    if (dup) return { error: "Já existe organização com esse CNPJ." };
  }

  let idAdmin: number | null = null;
  if (parsed.data.emailAdmin) {
    const c = await prisma.conta.findUnique({
      where: { email: parsed.data.emailAdmin.toLowerCase() },
      select: { id: true },
    });
    if (!c) {
      return {
        error:
          "Nenhuma conta com esse e-mail. A pessoa precisa se cadastrar antes.",
      };
    }
    idAdmin = c.id;
  }

  const codigoConvite = await gerarCodigoConviteUnico();

  const org = await prisma.$transaction(async (tx) => {
    const criada = await tx.organizacao.create({
      data: { nome: parsed.data.nome, cnpj, codigoConvite },
    });
    if (idAdmin) {
      await tx.organizacaoMembro.create({
        data: {
          idOrganizacao: criada.id,
          idConta: idAdmin,
          papel: "ADMIN",
        },
      });
    }
    return criada;
  });

  await registrar({
    idConta: await idContaPorEmail(user.email),
    acao: "organizacao.criar_admin",
    entidade: "Organizacao",
    entidadeId: org.id,
    detalhes: { nome: org.nome, admin: parsed.data.emailAdmin || null },
  });

  revalidatePath(PATH);
  redirect(`${PATH}/${org.id}/modulos`);
}

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
      ? `${org.nome} bloqueada — nenhum membro acessa.`
      : `${org.nome} desbloqueada.`,
  };
}
