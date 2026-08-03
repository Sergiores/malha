import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Usuário do Supabase logado + a Conta (perfil) correspondente.
 * Redireciona para /login se não houver sessão.
 *
 * Cria a Conta sob demanda: o cadastro já faz o upsert, mas usuários criados
 * por fora (Supabase Admin API, seed do superadmin) chegam aqui sem perfil.
 *
 * Envolto em `cache()` para que layout + page + actions da mesma request
 * consultem o banco uma vez só.
 */
export const requireConta = cache(async function requireConta() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let conta = await prisma.conta.findUnique({
    where: { authUserId: user.id },
  });

  if (!conta) {
    conta = await prisma.conta.create({
      data: {
        authUserId: user.id,
        email: user.email,
        nome: (user.user_metadata?.nome as string | undefined) ?? null,
      },
    });
  }

  // Inativada pelo superadmin -> derruba a sessão.
  if (!conta.ativa) {
    await supabase.auth.signOut();
    redirect("/login?error=conta_inativa");
  }

  // Senha inicial ainda não trocada -> só a tela de troca fica acessível.
  if (conta.trocarSenha) {
    redirect("/redefinir-senha");
  }

  return { user, conta };
});
