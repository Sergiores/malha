import { z } from "zod";

/**
 * Verificação da idade do concreto — NBR 6118, item 12.3.3.
 *
 * Estima a resistência que o concreto já tem numa idade anterior aos 28 dias,
 * a partir do fck de projeto e do tipo de cimento. É a conta que decide
 * quando desformar, quando protender e quando liberar carga sobre a peça.
 */

/**
 * Coeficiente `s` por tipo de cimento — o quanto o ganho de resistência é
 * puxado para as primeiras idades. Cimento de alta resistência inicial tem
 * `s` menor porque chega perto do valor final mais cedo.
 *
 * Tabela versionada junto ao código: quando a norma mudar, muda aqui, e as
 * análises antigas continuam com o snapshot que gravaram.
 */
export const CIMENTOS = [
  { chave: "CP_I", nome: "CP I", descricao: "Portland comum", s: 0.25 },
  { chave: "CP_II", nome: "CP II", descricao: "Portland composto", s: 0.25 },
  { chave: "CP_III", nome: "CP III", descricao: "Alto-forno", s: 0.38 },
  { chave: "CP_IV", nome: "CP IV", descricao: "Pozolânico", s: 0.38 },
  {
    chave: "CP_V",
    nome: "CP V - ARI",
    descricao: "Alta resistência inicial",
    s: 0.2,
  },
] as const;

export type ChaveCimento = (typeof CIMENTOS)[number]["chave"];

export const CHAVES_CIMENTO = CIMENTOS.map((c) => c.chave) as [
  ChaveCimento,
  ...ChaveCimento[],
];

export function coeficienteS(chave: string): number | null {
  return CIMENTOS.find((c) => c.chave === chave)?.s ?? null;
}

/**
 * A idade de referência da expressão. Não é parâmetro: 28 dias é a definição
 * do fck, e mexer nisso mudaria o significado do resultado.
 */
export const IDADE_REFERENCIA = 28;

export const UNIDADES_CARGA = ["kN", "kN/m", "kN/m²"] as const;
export type UnidadeCarga = (typeof UNIDADES_CARGA)[number];

/**
 * Faixas usuais. Fora delas o cálculo prossegue com aviso — quem assina o
 * laudo é que decide se a premissa vale.
 */
export const FAIXAS = {
  fck28: { min: 20, max: 90, unidade: " MPa" },
  idade: { min: 3, max: 28, unidade: " dias" },
} as const;

export const idadeConcretoSchema = z.object({
  /** Resistência característica de projeto, aos 28 dias. */
  fck28: z.coerce
    .number({ invalid_type_error: "Informe o fck em MPa." })
    .gt(0, "O fck deve ser maior que zero.")
    .max(200, "fck acima de 200 MPa não é concreto estrutural usual.")
    .finite(),

  /** Idade efetiva do concreto, em dias. */
  idade: z.coerce
    .number({ invalid_type_error: "Informe a idade em dias." })
    .gt(0, "A idade deve ser maior que zero.")
    .max(3650, "Idade acima de 10 anos não faz sentido para esta verificação.")
    .finite(),

  cimento: z.enum(CHAVES_CIMENTO, {
    invalid_type_error: "Escolha o tipo de cimento.",
  }),

  /**
   * Carga de projeto. Opcional: quem só quer saber a resistência efetiva não
   * precisa informar carga nenhuma.
   */
  carga: z.coerce
    .number({ invalid_type_error: "Informe um número." })
    .min(0, "A carga não pode ser negativa.")
    .finite()
    .default(0),

  unidadeCarga: z.enum(UNIDADES_CARGA).default("kN"),

  titulo: z.string().trim().max(120).optional().or(z.literal("")),
  observacao: z.string().trim().max(500).optional().or(z.literal("")),
});

export type IdadeConcretoInput = z.infer<typeof idadeConcretoSchema>;

/**
 * Formulário em branco — o que a tela mostra ao abrir uma análise nova.
 * Campos numéricos vazios: zero é valor digitável e pré-preencher esconderia
 * o que ainda não foi informado.
 */
export const VAZIO = {
  fck28: "",
  idade: "",
  cimento: "CP_II",
  carga: "",
  unidadeCarga: "kN",
  titulo: "",
  observacao: "",
};

/** Caso de referência da planilha de origem — usado só pelo verificar.ts. */
export const PADRAO: IdadeConcretoInput = {
  fck28: 25,
  idade: 7,
  cimento: "CP_II",
  carga: 100,
  unidadeCarga: "kN",
  titulo: "",
  observacao: "",
};
