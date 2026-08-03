"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  cadastroSchema,
  loginSchema,
  recuperarSenhaSchema,
  redefinirSenhaSchema,
} from "@/lib/validations/auth";

export type ActionState = { error?: string; success?: string } | null;

export async function cadastrar(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = cadastroSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    senha: formData.get("senha"),
    confirmarSenha: formData.get("confirmarSenha"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { nome, email, senha } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } },
  });

  if (error) return { error: error.message };

  // Cria o perfil vinculado ao usuário do Supabase Auth.
  if (data.user) {
    await prisma.conta.upsert({
      where: { authUserId: data.user.id },
      update: { nome, email },
      create: { authUserId: data.user.id, nome, email },
    });
  }

  // Com confirmação de e-mail ativa, a sessão só existe após o clique no link.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/app");
  }

  return {
    success:
      "Cadastro realizado. Verifique sua caixa de entrada para confirmar o e-mail.",
  };
}

export async function entrar(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.senha,
  });

  // Mensagem genérica de propósito: não revela se o e-mail existe.
  if (error) return { error: "E-mail ou senha incorretos." };

  revalidatePath("/", "layout");
  redirect("/app");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function recuperarSenha(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = recuperarSenhaSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "E-mail inválido." };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${origin}/auth/callback?next=/redefinir-senha` }
  );

  if (error) return { error: error.message };

  // Resposta idêntica exista ou não a conta — não vaza cadastro.
  return {
    success: "Se o e-mail existir, enviamos um link para redefinir a senha.",
  };
}

export async function redefinirSenha(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = redefinirSenhaSchema.safeParse({
    senha: formData.get("senha"),
    confirmarSenha: formData.get("confirmarSenha"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Link expirado. Peça um novo e-mail de recuperação." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.senha,
  });
  if (error) return { error: error.message };

  // Senha trocada — some a exigência de troca obrigatória.
  await prisma.conta.updateMany({
    where: { authUserId: user.id },
    data: { trocarSenha: false },
  });

  revalidatePath("/", "layout");
  redirect("/app");
}
