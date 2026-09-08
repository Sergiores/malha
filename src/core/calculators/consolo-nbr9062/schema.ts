import { z } from "zod";

/**
 * Consolo de concreto pré-moldado com carga direta — NBR 9062.
 *
 * Reimplementado a partir da norma, não transcrito de planilha (decisão A-11
 * em `docs/consolo-decisoes.md`). A planilha de origem serve só como
 * conferência numérica no `verificar.ts`.
 *
 * As decisões de A-01 a A-11 estão registradas naquele arquivo; os pontos que
 * afetam este schema aparecem comentados abaixo, onde importam.
 */

/* ------------------------------------------------------------------ */
/* Tabelas normativas — versionadas junto ao código                    */
/* ------------------------------------------------------------------ */

/** Classes de concreto oferecidas, com o fck em MPa. */
export const CLASSES_CONCRETO = [
  20, 25, 30, 35, 40, 45, 50, 55, 60,
] as const;

/** Classes de aço, com o fyk em MPa. */
export const CLASSES_ACO = [
  { chave: "CA25", nome: "CA-25", fyk: 250 },
  { chave: "CA50", nome: "CA-50", fyk: 500 },
  { chave: "CA60", nome: "CA-60", fyk: 600 },
] as const;

export type ChaveAco = (typeof CLASSES_ACO)[number]["chave"];

/**
 * Aparelhos de apoio e o fator de força horizontal.
 *
 * O fator é quanto da força vertical a interface transmite horizontalmente ao
 * consolo por atrito — junta a seco transmite dez vezes mais que teflon.
 *
 * A-07: o fator incide sobre **Fsd**, não sobre a carga característica. A
 * planilha rotulava a tabela como "Hk = Vk × 0,80" e aplicava sobre Fsd; dá
 * no mesmo número (a multiplicação é comutativa), mas o rótulo aqui segue o
 * que a conta faz.
 */
export const APOIOS = [
  { chave: "JUNTA_SECO", nome: "Junta a seco", fator: 0.8 },
  { chave: "JUNTA_ARGAMASSA", nome: "Junta com argamassa", fator: 0.5 },
  { chave: "CONCRETO_CHAPA", nome: "Concreto com chapa metálica", fator: 0.4 },
  { chave: "CHAPA_NAO_SOLDADA", nome: "Chapa metálica não soldada", fator: 0.25 },
  { chave: "ELASTOMERO", nome: "Elastômero", fator: 0.16 },
  { chave: "PTFE", nome: "Politetrafluoretileno (PTFE)", fator: 0.08 },
] as const;

export type ChaveApoio = (typeof APOIOS)[number]["chave"];

export const ANCORAGENS = [
  { chave: "LACO", nome: "Laço" },
  { chave: "BARRA_SOLDADA", nome: "Barra soldada" },
] as const;

export type ChaveAncoragem = (typeof ANCORAGENS)[number]["chave"];

export const CONCRETAGENS = [
  { chave: "PRIMEIRA", nome: "1ª fase", gamaN: 1.1, mu: 1.4 },
  { chave: "SEGUNDA", nome: "2ª fase", gamaN: 1.2, mu: 1.0 },
] as const;

export type ChaveConcretagem = (typeof CONCRETAGENS)[number]["chave"];

/** Bitolas comerciais do tirante, em mm. */
export const BITOLAS = [8, 10, 12.5, 16, 20, 25, 32] as const;

/**
 * A-03: tensão admissível de contato no aparelho de apoio, em MPa.
 *
 * 🚨 Esta verificação usa a força **característica** (Fk), enquanto as outras
 * duas usam a de cálculo (Fsd). É deliberado — tensão de contato se compara
 * com um admissível de serviço — e foi confirmado pelo cliente. Não
 * "padronize" isso para Fsd: o número muda e a verificação deixa de
 * significar o que significa.
 */
export const TENSAO_ADMISSIVEL_APOIO = 7.0;

/** A-01: acima desta relação a peça deixa de ser consolo. */
export const LIMITE_CONSOLO = 1.0;
/** Abaixo desta relação o modelo é o de atrito-cisalhamento. */
export const LIMITE_MUITO_CURTO = 0.5;

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

export function fykDe(chave: string): number | null {
  return CLASSES_ACO.find((a) => a.chave === chave)?.fyk ?? null;
}
export function apoioDe(chave: string) {
  return APOIOS.find((a) => a.chave === chave) ?? null;
}
export function concretagemDe(chave: string) {
  return CONCRETAGENS.find((c) => c.chave === chave) ?? null;
}

/* ------------------------------------------------------------------ */
/* Faixas usuais — fora delas o cálculo prossegue com aviso            */
/* ------------------------------------------------------------------ */

export const FAIXAS = {
  b: { min: 10, max: 100, unidade: " cm" },
  h: { min: 10, max: 200, unidade: " cm" },
  l: { min: 5, max: 150, unidade: " cm" },
  a: { min: 2, max: 100, unidade: " cm" },
  c: { min: 1.5, max: 6, unidade: " cm" },
  fk: { min: 1, max: 5000, unidade: " kN" },
} as const;

/* ------------------------------------------------------------------ */
/* Schema                                                              */
/* ------------------------------------------------------------------ */

const cm = (rotulo: string) =>
  z.coerce
    .number({ invalid_type_error: `Informe ${rotulo} em cm.` })
    .gt(0, `${rotulo} deve ser maior que zero.`)
    .max(1000, `${rotulo} acima de 1000 cm não é peça usual.`)
    .finite();

export const consoloSchema = z
  .object({
    /** fck em MPa. */
    fck: z.coerce
      .number()
      .refine(
        (v) => (CLASSES_CONCRETO as readonly number[]).includes(v),
        "Escolha uma classe de concreto da lista."
      ),
    aco: z.enum(["CA25", "CA50", "CA60"], {
      invalid_type_error: "Escolha a classe do aço.",
    }),
    concretagem: z.enum(["PRIMEIRA", "SEGUNDA"], {
      invalid_type_error: "Escolha a fase de concretagem.",
    }),

    // Geometria, em cm
    b: cm("a largura b"),
    h: cm("a altura h"),
    l: cm("o avanço l"),
    a: cm("o balanço a"),
    c: cm("o cobrimento c"),

    /** Bitola do tirante, em mm. */
    bitola: z.coerce
      .number()
      .refine(
        (v) => (BITOLAS as readonly number[]).includes(v),
        "Escolha uma bitola da lista."
      ),

    apoio: z.enum(
      [
        "JUNTA_SECO",
        "JUNTA_ARGAMASSA",
        "CONCRETO_CHAPA",
        "CHAPA_NAO_SOLDADA",
        "ELASTOMERO",
        "PTFE",
      ],
      { invalid_type_error: "Escolha o tipo de aparelho de apoio." }
    ),
    /** Comprimento do aparelho de apoio, em cm. */
    an: cm("o comprimento aₙ"),
    /** Largura do aparelho de apoio, em cm. */
    bn: cm("a largura bₙ"),

    ancoragem: z.enum(["LACO", "BARRA_SOLDADA"], {
      invalid_type_error: "Escolha o tipo de ancoragem.",
    }),

    /** Força vertical característica, em kN. */
    fk: z.coerce
      .number({ invalid_type_error: "Informe a força vertical em kN." })
      .gt(0, "A força vertical deve ser maior que zero.")
      .max(100000)
      .finite(),

    titulo: z.string().trim().max(120).optional().or(z.literal("")),
    observacao: z.string().trim().max(500).optional().or(z.literal("")),
  })
  /**
   * A-06: o aparelho de apoio não pode ser mais largo que o consolo.
   *
   * A área da biela é `h_bie · bₙ`, e uma biela mais larga que a peça que a
   * contém alivia a tensão artificialmente — no caso da planilha, em 20%.
   */
  .refine((d) => d.bn <= d.b, {
    message:
      "Revisar: o aparelho de apoio é mais largo que o consolo. Reduza bₙ para no máximo o valor de b.",
    path: ["bn"],
  })
  /** O aparelho de apoio também precisa caber no avanço. */
  .refine((d) => d.an <= d.l, {
    message:
      "Revisar: o aparelho de apoio é mais comprido que o avanço do consolo. Reduza aₙ para no máximo o valor de l.",
    path: ["an"],
  })
  /** O ponto de aplicação da carga tem de estar dentro do consolo. */
  .refine((d) => d.a < d.l, {
    message:
      "O balanço a precisa ser menor que o avanço l — a carga estaria fora do consolo.",
    path: ["a"],
  });

export type ConsoloInput = z.infer<typeof consoloSchema>;

/** A-05: d′ = c + ø/2, com a bitola em mm e o resultado em cm. */
export function distanciaTirante(c: number, bitolaMm: number): number {
  return c + bitolaMm / 20;
}

/**
 * Formulário em branco. Números vazios: zero é digitável e pré-preencher
 * esconderia o que ainda não foi informado. As listas nascem na opção mais
 * comum, porque um select vazio não ajuda ninguém.
 */
export const VAZIO = {
  fck: 25,
  aco: "CA50",
  concretagem: "PRIMEIRA",
  b: "",
  h: "",
  l: "",
  a: "",
  c: "",
  bitola: 10,
  apoio: "JUNTA_SECO",
  an: "",
  bn: "",
  ancoragem: "LACO",
  fk: "",
  titulo: "",
  observacao: "",
};

/**
 * Caso de referência da planilha de origem — usado só pelo `verificar.ts`.
 *
 * 🚨 **Este caso NÃO passa no `consoloSchema`.** Ele tem `bₙ = 18` e `b = 15`,
 * e o refine do A-06 o rejeita: a geometria do autor é inconsistente. Foi uma
 * decisão consciente do cliente bloquear isso na tela, aceitando que o
 * exemplo da planilha deixe de ser digitável.
 *
 * Portanto: `consoloSchema.parse(PADRAO)` **lança**, e isso não é bug. O
 * `verificar.ts` chama o motor direto, que é função pura e não valida.
 */
export const PADRAO: ConsoloInput = {
  fck: 35,
  aco: "CA50",
  concretagem: "PRIMEIRA",
  b: 15,
  h: 20,
  l: 20,
  a: 10,
  c: 2.5,
  bitola: 10,
  apoio: "JUNTA_SECO",
  an: 18,
  bn: 18, // > b: ver o aviso acima
  ancoragem: "LACO",
  fk: 17,
  titulo: "",
  observacao: "",
};
