import { z } from "zod";
import { apenasDigitos, documentoValido, UFS } from "@/lib/documento";

const opcional = (max: number, rotulo: string) =>
  z.string().trim().max(max, `${rotulo} muito longo.`).optional().or(z.literal(""));

export const clienteSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do cliente.").max(150),

  // Guardado só com dígitos. Vazio é aceito — nem todo cliente informa o
  // documento na primeira visita, e travar isso atrapalha o cadastro rápido.
  cpfCnpj: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? apenasDigitos(v) : ""))
    .refine((v) => v === "" || documentoValido(v), {
      message: "CPF ou CNPJ inválido — confira os dígitos.",
    }),

  endereco: opcional(200, "Endereço"),
  bairro: opcional(100, "Bairro"),
  cidade: opcional(100, "Cidade"),

  uf: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || (UFS as readonly string[]).includes(v), {
      message: "UF inválida.",
    }),

  cep: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? apenasDigitos(v) : ""))
    .refine((v) => v === "" || v.length === 8, {
      message: "CEP deve ter 8 dígitos.",
    }),

  fone: opcional(30, "Telefone"),
  email: z
    .string()
    .trim()
    .email("E-mail inválido.")
    .max(150)
    .optional()
    .or(z.literal("")),
  contato: opcional(120, "Contato"),
});

export const clienteComIdSchema = clienteSchema.extend({
  id: z.coerce.number().int().positive(),
});

export type ClienteInput = z.infer<typeof clienteSchema>;

/** Filtros da tela de consulta. */
export const filtroClienteSchema = z.object({
  nome: z.string().trim().max(150).optional(),
  cpfCnpj: z.string().trim().max(20).optional(),
  cidade: z.string().trim().max(100).optional(),
  uf: z.string().trim().toUpperCase().max(2).optional(),
});
