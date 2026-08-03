"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/superadmin";
import { registrar, idContaPorEmail } from "@/lib/auditoria";
import {
  dataUtc,
  idSchema,
  licencaSchema,
} from "@/lib/validations/superadmin";
import type { ActionState } from "@/app/(auth)/actions";

/**
 * Concede ou renova a licença de um módulo para uma organização.
 *
 * É um upsert sobre a chave (organizacao, modulo): conceder de novo é
 * renovar. Reativa uma licença revogada, o que é o comportamento esperado
 * quando o cliente volta a pagar.
 */
export async function salvarLicenca(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user } = await requireSuperadmin();

  const parsed = licencaSchema.safeParse({
    idOrganizacao: formData.get("idOrganizacao"),
    idModulo: formData.get("idModulo"),
    validoDe: formData.get("validoDe"),
    validoAte: formData.get("validoAte"),
    observacao: formData.get("observacao"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { idOrganizacao, idModulo, validoDe, validoAte, observacao } =
    parsed.data;

  const [org, modulo] = await Promise.all([
    prisma.organizacao.findUnique({
      where: { id: idOrganizacao },
      select: { nome: true },
    }),
    prisma.modulo.findUnique({
      where: { id: idModulo },
      select: { nome: true, slug: true },
    }),
  ]);
  if (!org || !modulo) return { error: "Organização ou módulo inexistente." };

  await prisma.organizacaoModulo.upsert({
    where: {
      idOrganizacao_idModulo: { idOrganizacao, idModulo },
    },
    update: {
      validoDe: dataUtc(validoDe),
      validoAte: validoAte ? dataUtc(validoAte) : null,
      observacao: observacao || null,
      ativo: true,
    },
    create: {
      idOrganizacao,
      idModulo,
      validoDe: dataUtc(validoDe),
      validoAte: validoAte ? dataUtc(validoAte) : null,
      observacao: observacao || null,
    },
  });

  await registrar({
    idConta: await idContaPorEmail(user.email),
    acao: "licenca.conceder",
    entidade: "OrganizacaoModulo",
    entidadeId: idOrganizacao,
    detalhes: {
      organizacao: org.nome,
      modulo: modulo.slug,
      validoDe,
      validoAte: validoAte || null,
    },
  });

  revalidatePath(`/superadmin/organizacoes/${idOrganizacao}/modulos`);
  revalidatePath(`/o/${idOrganizacao}`);
  return {
    success: `${modulo.nome} liberado até ${validoAte || "sem prazo"}.`,
  };
}

/**
 * Revoga sem apagar: `ativo = false` preserva as datas e o histórico de
 * que a licença existiu. Apagar esconderia que o cliente já teve acesso.
 */
export async function revogarLicenca(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user } = await requireSuperadmin();

  const idOrg = idSchema.safeParse(formData.get("idOrganizacao"));
  const idMod = idSchema.safeParse(formData.get("idModulo"));
  if (!idOrg.success || !idMod.success) return { error: "Dados inválidos." };

  const licenca = await prisma.organizacaoModulo.findUnique({
    where: {
      idOrganizacao_idModulo: {
        idOrganizacao: idOrg.data,
        idModulo: idMod.data,
      },
    },
    include: { modulo: { select: { nome: true, slug: true } } },
  });
  if (!licenca) return { error: "Licença não encontrada." };

  await prisma.organizacaoModulo.update({
    where: { id: licenca.id },
    data: { ativo: !licenca.ativo },
  });

  await registrar({
    idConta: await idContaPorEmail(user.email),
    acao: licenca.ativo ? "licenca.revogar" : "licenca.reativar",
    entidade: "OrganizacaoModulo",
    entidadeId: licenca.id,
    detalhes: { modulo: licenca.modulo.slug },
  });

  revalidatePath(`/superadmin/organizacoes/${idOrg.data}/modulos`);
  revalidatePath(`/o/${idOrg.data}`);
  return {
    success: licenca.ativo
      ? `${licenca.modulo.nome} revogado — acesso cortado agora.`
      : `${licenca.modulo.nome} reativado.`,
  };
}
