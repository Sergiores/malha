"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireConta } from "@/lib/auth";
import { gerarCodigoConviteUnico } from "@/lib/organizacao";
import {
  entrarOrganizacaoSchema,
  novaOrganizacaoSchema,
} from "@/lib/validations/organizacao";
import type { ActionState } from "@/app/(auth)/actions";

export async function criarOrganizacao(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { conta } = await requireConta();

  const parsed = novaOrganizacaoSchema.safeParse({
    nome: formData.get("nome"),
    cnpj: formData.get("cnpj"),
    telefone: formData.get("telefone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const cnpj = parsed.data.cnpj?.replace(/\D/g, "") || null;
  if (cnpj) {
    const jaExiste = await prisma.organizacao.findUnique({
      where: { cnpj },
      select: { id: true },
    });
    if (jaExiste) return { error: "Já existe uma organização com esse CNPJ." };
  }

  const codigoConvite = await gerarCodigoConviteUnico();

  // Transação: organização sem admin seria uma organização órfã.
  const org = await prisma.$transaction(async (tx) => {
    const criada = await tx.organizacao.create({
      data: {
        nome: parsed.data.nome,
        cnpj,
        telefone: parsed.data.telefone || null,
        codigoConvite,
      },
    });
    await tx.organizacaoMembro.create({
      data: {
        idOrganizacao: criada.id,
        idConta: conta.id,
        papel: "ADMIN",
      },
    });
    await tx.logAuditoria.create({
      data: {
        idConta: conta.id,
        acao: "organizacao.criar",
        entidade: "Organizacao",
        entidadeId: criada.id,
        detalhes: { nome: criada.nome },
      },
    });
    return criada;
  });

  revalidatePath("/app");
  redirect(`/o/${org.id}`);
}

export async function entrarOrganizacao(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { conta } = await requireConta();

  const parsed = entrarOrganizacaoSchema.safeParse({
    codigo: formData.get("codigo"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Código inválido." };
  }

  const org = await prisma.organizacao.findUnique({
    where: { codigoConvite: parsed.data.codigo },
  });
  // Mesma mensagem para código inexistente e organização bloqueada — não
  // serve como oráculo de quais códigos existem.
  if (!org || !org.ativa) return { error: "Código não encontrado." };

  const jaMembro = await prisma.organizacaoMembro.findUnique({
    where: {
      idOrganizacao_idConta: { idOrganizacao: org.id, idConta: conta.id },
    },
    select: { id: true },
  });

  if (!jaMembro) {
    await prisma.organizacaoMembro.create({
      data: { idOrganizacao: org.id, idConta: conta.id, papel: "MEMBRO" },
    });
    await prisma.logAuditoria.create({
      data: {
        idConta: conta.id,
        acao: "organizacao.entrar",
        entidade: "Organizacao",
        entidadeId: org.id,
      },
    });
  }

  revalidatePath("/app");
  redirect(`/o/${org.id}`);
}
