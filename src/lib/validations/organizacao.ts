import { z } from "zod";

export const novaOrganizacaoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da organização."),
  cnpj: z
    .string()
    .trim()
    .max(20, "CNPJ muito longo.")
    .optional()
    .or(z.literal("")),
  telefone: z
    .string()
    .trim()
    .max(20, "Telefone muito longo.")
    .optional()
    .or(z.literal("")),
});

export const entrarOrganizacaoSchema = z.object({
  codigo: z
    .string()
    .trim()
    .toUpperCase()
    .min(4, "Código inválido.")
    .max(12, "Código inválido."),
});

export const membroSchema = z.object({
  idOrganizacao: z.coerce.number().int().positive(),
  idMembro: z.coerce.number().int().positive(),
});

export type NovaOrganizacaoInput = z.infer<typeof novaOrganizacaoSchema>;
