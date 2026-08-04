import { z } from "zod";

/**
 * Composição granulométrica de agregados miúdos — mistura de duas areias,
 * comparada às zonas da NBR 7211.
 *
 * As peneiras seguem a série usada na planilha de origem. As de 6,3 mm,
 * 0,075 mm e 0,0375 mm são intermediárias: entram na curva e na tabela, mas
 * NÃO no módulo de finura, que só usa a série normal.
 */
export const PENEIRAS = [
  { abertura: 9.5, serieNormal: true, temLimite: true },
  { abertura: 6.3, serieNormal: false, temLimite: true },
  { abertura: 4.75, serieNormal: true, temLimite: true },
  { abertura: 2.36, serieNormal: true, temLimite: true },
  { abertura: 1.18, serieNormal: true, temLimite: true },
  { abertura: 0.6, serieNormal: true, temLimite: true },
  { abertura: 0.3, serieNormal: true, temLimite: true },
  { abertura: 0.15, serieNormal: true, temLimite: true },
  // Abaixo de 0,15 mm a NBR 7211 não define zona. Entram na curva e no
  // fechamento da massa, mas não valem para enquadrar a areia.
  { abertura: 0.075, serieNormal: false, temLimite: false },
  { abertura: 0.0375, serieNormal: false, temLimite: false },
] as const;

/**
 * Limites de composição granulométrica do agregado miúdo — NBR 7211,
 * em % retida acumulada. Índices na mesma ordem de PENEIRAS.
 *
 * Tabela versionada junto ao código: quando a norma mudar, muda aqui, num
 * lugar só, e as análises antigas continuam com o snapshot que gravaram.
 *
 * Os valores das duas últimas peneiras são preenchimento — `temLimite`
 * false faz o enquadramento ignorá-las.
 */
export const ZONAS = {
  utilInferior: [0, 0, 0, 0, 5, 15, 50, 85, 100, 100],
  otimaInferior: [0, 0, 0, 10, 20, 35, 65, 90, 100, 100],
  otimaSuperior: [0, 0, 5, 20, 30, 55, 85, 95, 100, 100],
  utilSuperior: [0, 7, 10, 25, 50, 70, 95, 100, 100, 100],
} as const;

const massa = z.coerce
  .number({ invalid_type_error: "Informe um número." })
  .min(0, "A massa retida não pode ser negativa.")
  .finite();

const serie = z
  .array(massa)
  .length(PENEIRAS.length, `Informe as ${PENEIRAS.length} peneiras.`);

export const granulometriaSchema = z
  .object({
    nomeAreiaA: z.string().trim().max(60).default("Areia fina"),
    nomeAreiaB: z.string().trim().max(60).default("Areia regular"),

    /** Massa retida (g) por peneira, dois ensaios por areia. */
    areiaA1: serie,
    areiaA2: serie,
    areiaB1: serie,
    areiaB2: serie,

    /** Percentual da areia A na mistura. O restante é areia B. */
    teorMistura: z.coerce
      .number()
      .min(0, "O teor deve ficar entre 0 e 100%.")
      .max(100, "O teor deve ficar entre 0 e 100%."),

    titulo: z.string().trim().max(120).optional().or(z.literal("")),
    observacao: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine(
    (d) => d.areiaA1.some((v) => v > 0) || d.areiaA2.some((v) => v > 0),
    { message: "Informe ao menos uma massa retida para a areia A.", path: ["areiaA1"] }
  )
  .refine(
    (d) => d.areiaB1.some((v) => v > 0) || d.areiaB2.some((v) => v > 0),
    { message: "Informe ao menos uma massa retida para a areia B.", path: ["areiaB1"] }
  );

export type GranulometriaInput = z.infer<typeof granulometriaSchema>;

/** Caso de referência da planilha de origem. */
export const PADRAO: GranulometriaInput = {
  nomeAreiaA: "Areia fina",
  nomeAreiaB: "Areia regular",
  //             9,5  6,3 4,75 2,36 1,18  0,6  0,3  0,15 0,075 0,0375
  areiaA1: [0, 0, 0, 0, 0, 0, 15, 394, 150, 1],
  areiaA2: [0, 0, 0, 0, 0, 0, 0, 422, 131, 1],
  areiaB1: [0, 0, 6, 52, 98, 107, 215, 86, 13, 3],
  areiaB2: [0, 0, 9, 54, 105, 99, 203, 103, 6, 1],
  teorMistura: 10,
  titulo: "",
  observacao: "",
};
