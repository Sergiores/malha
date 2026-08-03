import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * E-mail com acesso a /superadmin.
 *
 * Vem do ambiente, não hard-coded: é produto vendido e trocar o dono do
 * sistema não deveria exigir deploy.
 */
export const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? "";

export function isSuperadmin(email: string | null | undefined): boolean {
  if (!SUPERADMIN_EMAIL) return false;
  return email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
}

/**
 * Exige o superadmin. Sem sessão -> /login. Outro usuário -> notFound(),
 * que não confirma sequer que a rota existe.
 */
export const requireSuperadmin = cache(async function requireSuperadmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!isSuperadmin(user.email)) notFound();

  // Mesma regra da área logada: senha inicial pendente trava tudo, e o
  // painel que controla o licenciamento de todos os clientes é o último
  // lugar onde abrir exceção.
  const conta = await prisma.conta.findUnique({
    where: { authUserId: user.id },
    select: { ativa: true, trocarSenha: true },
  });
  if (conta && !conta.ativa) {
    await supabase.auth.signOut();
    redirect("/login?error=conta_inativa");
  }
  if (conta?.trocarSenha) redirect("/redefinir-senha");

  return { user };
});
