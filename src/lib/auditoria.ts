import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Registra uma ação no log de auditoria.
 *
 * Nunca deixa a falha do log derrubar a operação principal: perder uma
 * linha de auditoria é ruim, mas abortar uma concessão de licença já
 * gravada seria pior.
 */
export async function registrar(entrada: {
  idConta?: number | null;
  acao: string;
  entidade: string;
  entidadeId?: number | null;
  detalhes?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.logAuditoria.create({
      data: {
        idConta: entrada.idConta ?? null,
        acao: entrada.acao,
        entidade: entrada.entidade,
        entidadeId: entrada.entidadeId ?? null,
        detalhes: entrada.detalhes,
      },
    });
  } catch (e) {
    console.error("Falha ao gravar auditoria:", e);
  }
}

/** Conta do superadmin logado, para carimbar o log. */
export async function idContaPorEmail(
  email: string | null | undefined
): Promise<number | null> {
  if (!email) return null;
  const c = await prisma.conta.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });
  return c?.id ?? null;
}
