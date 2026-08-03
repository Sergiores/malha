import { z } from "zod";

/** Mínimo de senha. O Supabase Auth também impõe o seu; mantenha >= o dele. */
const SENHA_MIN = 8;

export const cadastroSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe seu nome."),
    email: z.string().trim().email("E-mail inválido."),
    senha: z
      .string()
      .min(SENHA_MIN, `A senha deve ter ao menos ${SENHA_MIN} caracteres.`),
    confirmarSenha: z.string(),
  })
  .refine((d) => d.senha === d.confirmarSenha, {
    message: "As senhas não conferem.",
    path: ["confirmarSenha"],
  });

export const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido."),
  senha: z.string().min(1, "Informe a senha."),
});

export const recuperarSenhaSchema = z.object({
  email: z.string().trim().email("E-mail inválido."),
});

export const redefinirSenhaSchema = z
  .object({
    senha: z
      .string()
      .min(SENHA_MIN, `A senha deve ter ao menos ${SENHA_MIN} caracteres.`),
    confirmarSenha: z.string(),
  })
  .refine((d) => d.senha === d.confirmarSenha, {
    message: "As senhas não conferem.",
    path: ["confirmarSenha"],
  });

export const perfilSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome."),
  telefone: z
    .string()
    .trim()
    .max(20, "Telefone muito longo.")
    .optional()
    .or(z.literal("")),
});

export type CadastroInput = z.infer<typeof cadastroSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PerfilInput = z.infer<typeof perfilSchema>;
