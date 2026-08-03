"use server";

import { revalidatePath } from "next/cache";
import { requireConta } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { perfilSchema } from "@/lib/validations/auth";
import type { ActionState } from "@/app/(auth)/actions";

export async function salvarPerfil(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  // Guard também na action — a página não é o único caminho até aqui.
  const { conta } = await requireConta();

  const parsed = perfilSchema.safeParse({
    nome: formData.get("nome"),
    telefone: formData.get("telefone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.conta.update({
    where: { id: conta.id },
    data: {
      nome: parsed.data.nome,
      telefone: parsed.data.telefone || null,
    },
  });

  revalidatePath("/perfil");
  revalidatePath("/", "layout");
  return { success: "Perfil atualizado." };
}
