import { z } from "zod";

/**
 * Entradas da dosagem de Concreto Autoadensável — método Tutikian.
 *
 * As faixas não são chute: vêm do domínio de validade do método e da prática
 * de dosagem de CAA. Fora delas o cálculo ainda roda, mas o resultado deixa
 * de ter significado físico — por isso avisamos em vez de bloquear
 * (`avisosDeDominio`), exceto no que quebraria a matemática.
 */
export const FAIXAS = {
  cimento: { min: 250, max: 700, unidade: "kg/m³" },
  fatorAC: { min: 0.25, max: 0.8, unidade: "" },
  teorArgamassa: { min: 45, max: 75, unidade: "%" },
  teorFiler: { min: 0, max: 40, unidade: "%" },
  teorAditivo: { min: 0, max: 3, unidade: "%" },
  massaEspecifica: { min: 2000, max: 2600, unidade: "kg/m³" },
} as const;

const num = (campo: string) =>
  z.coerce
    .number({ invalid_type_error: `${campo}: informe um número.` })
    .finite(`${campo}: valor inválido.`);

export const dosagemCaaSchema = z.object({
  // --- dados da dosagem ---
  cimento: num("Consumo de cimento").positive("Consumo de cimento deve ser maior que zero."),
  fatorAC: num("Fator a/c").positive("Fator a/c deve ser maior que zero."),
  teorArgamassa: num("Teor de argamassa").gt(0).lt(100, "Teor de argamassa deve ficar entre 0 e 100%."),
  teorFiler: num("Teor de fíler").min(0).lt(100, "Teor de fíler deve ficar entre 0 e 100%."),
  teorAditivo: num("Teor de aditivo").min(0).lte(10, "Teor de aditivo deve ficar entre 0 e 10%."),
  massaEspecifica: num("Massa específica").positive("Massa específica deve ser maior que zero."),

  // --- preços por kg (R$) ---
  // Entradas de primeira classe, não constantes escondidas na fórmula: é o
  // que a planilha original errava e o que faz o custo envelhecer sozinho.
  precoCimento: num("Preço do cimento").min(0),
  precoFiler: num("Preço do fíler").min(0),
  precoMiudo: num("Preço do agregado miúdo").min(0),
  precoGraudo: num("Preço do agregado graúdo").min(0),
  precoAgua: num("Preço da água").min(0),
  precoAditivo: num("Preço do aditivo").min(0),

  // --- identificação ---
  titulo: z.string().trim().max(120).optional().or(z.literal("")),
  observacao: z.string().trim().max(500).optional().or(z.literal("")),
});

export type DosagemCaaInput = z.infer<typeof dosagemCaaSchema>;

/** Valores do caso de referência da planilha original. */
export const PADRAO: DosagemCaaInput = {
  cimento: 400,
  fatorAC: 0.5,
  teorArgamassa: 58,
  teorFiler: 20,
  teorAditivo: 0.8,
  massaEspecifica: 2300,
  precoCimento: 0.67,
  precoFiler: 0.0826,
  precoMiudo: 0.0771,
  precoGraudo: 0.0312,
  precoAgua: 0.013,
  precoAditivo: 13.42,
  titulo: "",
  observacao: "",
};
