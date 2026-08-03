import { z } from "zod";

export const idSchema = z.coerce.number().int().positive();

export const editarContaSchema = z.object({
  idConta: idSchema,
  nome: z.string().trim().max(120, "Nome muito longo.").optional().or(z.literal("")),
  telefone: z
    .string()
    .trim()
    .max(20, "Telefone muito longo.")
    .optional()
    .or(z.literal("")),
});

export const senhaContaSchema = z.object({
  idConta: idSchema,
  novaSenha: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
});

export const novaOrganizacaoAdminSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da organização."),
  cnpj: z.string().trim().max(20).optional().or(z.literal("")),
  emailAdmin: z
    .string()
    .trim()
    .email("E-mail inválido.")
    .optional()
    .or(z.literal("")),
});

/**
 * Concessão / renovação de licença.
 *
 * `validoAte` vazio = sem prazo. Datas chegam do `<input type="date">` como
 * `YYYY-MM-DD` e as colunas são `@db.Date`, então convertemos em UTC puro
 * para o dia não escorregar por fuso.
 */
export const licencaSchema = z
  .object({
    idOrganizacao: idSchema,
    idModulo: idSchema,
    validoDe: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inicial inválida."),
    validoAte: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data final inválida.")
      .optional()
      .or(z.literal("")),
    observacao: z.string().trim().max(255).optional().or(z.literal("")),
  })
  .refine(
    (d) => !d.validoAte || d.validoAte >= d.validoDe,
    { message: "A data final não pode ser anterior à inicial.", path: ["validoAte"] }
  );

/** `YYYY-MM-DD` -> Date em UTC, sem componente de hora. */
export function dataUtc(iso: string): Date {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

/** Date -> `YYYY-MM-DD` para preencher o input. */
export function isoDeData(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}
