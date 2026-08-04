"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/superadmin";
import { sincronizarModulos } from "@/core/sincronizar-modulos";
import { TAG_CATALOGO } from "@/lib/modulo";
import { registrar, idContaPorEmail } from "@/lib/auditoria";
import type { ActionState } from "@/app/(auth)/actions";

/**
 * Espelha o registry do código no banco. É o que faz um módulo novo
 * aparecer aqui sem ninguém rodar INSERT em produção.
 */
export async function sincronizar(
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const { user } = await requireSuperadmin();

  const r = await sincronizarModulos(prisma);

  await registrar({
    idConta: await idContaPorEmail(user.email),
    acao: "modulo.sincronizar",
    entidade: "Modulo",
    detalhes: { ...r },
  });

  // O menu lateral lê o catálogo de um cache entre requisições — sem isto,
  // um módulo novo demoraria até uma hora para aparecer.
  revalidateTag(TAG_CATALOGO);
  revalidatePath("/superadmin/modulos");
  return {
    success: `${r.modulos} módulo(s) sincronizado(s), ${r.modulosDesativados} desativado(s).`,
  };
}
