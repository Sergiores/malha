import {
  CIMENTOS,
  FAIXAS,
  IDADE_REFERENCIA,
  coeficienteS,
  type IdadeConcretoInput,
} from "./schema";

/**
 * Idade do concreto — NBR 6118, item 12.3.3.
 *
 * Função PURA: sem I/O, sem data, sem banco. O mesmo conjunto de entradas
 * produz o mesmo laudo daqui a dois anos.
 *
 *   β₁ = exp[ s · (1 − √(28/t)) ]
 *   fck(t) = β₁ · fck28
 *
 * Diferenças conscientes em relação à planilha de origem:
 *
 *  - **β₁ é limitado a 1,0.** A expressão vale para idades anteriores aos 28
 *    dias; passados eles ela continua crescendo e, com t = 60 dias e CP II,
 *    devolveria 1,08 — 8% de resistência que a norma não autoriza contar. A
 *    planilha entregava esse número sem avisar. Aqui o corte é explícito e
 *    vira aviso no laudo.
 *  - **A unidade da carga é escolhida**, em vez do texto fixo
 *    "kN, kN/m ou kN/m²" que a planilha imprimia sem saber qual era.
 *  - **A carga é opcional** — quem só quer a resistência efetiva não precisa
 *    inventar um valor.
 */

export type Aviso = {
  campo: string;
  mensagem: string;
  severidade: "alerta" | "erro";
};

export type IdadeConcretoResultado = {
  /** Coeficiente de crescimento da resistência, já limitado a 1,0. */
  beta1: number;
  /** O valor da expressão antes do corte — só para explicar o limite. */
  beta1Bruto: number;
  /** Resistência efetiva na idade informada, em MPa. */
  fckEfetivo: number;
  /** Quanto falta para o fck de projeto, em MPa. */
  faltaPara28: number;
  /** Fração do fck de projeto já atingida, de 0 a 1. */
  fracaoAtingida: number;
  /** Carga que a peça suporta na idade informada, na unidade informada. */
  cargaEfetiva: number;
  unidadeCarga: string;
  /** Coeficiente `s` usado, e o cimento a que ele pertence. */
  s: number;
  nomeCimento: string;
  /** Curva de evolução, para o gráfico do laudo. */
  curva: Array<{ dia: number; fck: number; beta1: number }>;
  avisos: Aviso[];
};

function arred(v: number, casas = 4): number {
  const f = 10 ** casas;
  return Math.round(v * f) / f;
}

/** β₁ da NBR 6118 §12.3.3, já com o teto de 1,0. */
export function beta1(s: number, idade: number): number {
  return Math.min(1, betaBruto(s, idade));
}

function betaBruto(s: number, idade: number): number {
  return Math.exp(s * (1 - Math.sqrt(IDADE_REFERENCIA / idade)));
}

export function calcularIdadeConcreto(
  e: IdadeConcretoInput
): IdadeConcretoResultado {
  const avisos: Aviso[] = [];

  const s = coeficienteS(e.cimento);
  if (s === null) {
    // O Zod já barra isto; a guarda existe para o motor nunca depender de
    // ter sido chamado depois da validação.
    throw new Error(`Tipo de cimento desconhecido: ${e.cimento}`);
  }
  const nomeCimento =
    CIMENTOS.find((c) => c.chave === e.cimento)?.nome ?? e.cimento;

  const bruto = betaBruto(s, e.idade);
  const b1 = Math.min(1, bruto);

  if (bruto > 1) {
    avisos.push({
      campo: "idade",
      severidade: "alerta",
      mensagem: `Aos ${e.idade} dias a expressão do item 12.3.3 devolveria β₁ = ${bruto.toLocaleString(
        "pt-BR",
        { minimumFractionDigits: 3, maximumFractionDigits: 3 }
      )}, acima de 1. Ela descreve o ganho até os 28 dias; depois disso o fck de projeto é o valor a considerar. Adotado β₁ = 1,000.`,
    });
  }

  if (e.idade < FAIXAS.idade.min) {
    avisos.push({
      campo: "idade",
      severidade: "alerta",
      mensagem: `Idade de ${e.idade} dia(s) está abaixo da faixa em que a expressão é usual (a partir de ${FAIXAS.idade.min} dias). Nas primeiras horas a dispersão do ensaio é grande — confira com corpo de prova antes de liberar carga.`,
    });
  }

  if (e.fck28 < FAIXAS.fck28.min || e.fck28 > FAIXAS.fck28.max) {
    avisos.push({
      campo: "fck28",
      severidade: "alerta",
      mensagem: `fck de ${e.fck28} MPa está fora da faixa usual de concreto estrutural (${FAIXAS.fck28.min} a ${FAIXAS.fck28.max} MPa). O cálculo prossegue, mas confira a premissa.`,
    });
  }

  const fckEfetivo = b1 * e.fck28;
  const cargaEfetiva = b1 * e.carga;

  // Evolução dia a dia até os 28, para o gráfico. Vai no snapshot porque o
  // laudo mostra o que foi gravado, não um recálculo.
  const curva: IdadeConcretoResultado["curva"] = [];
  for (let dia = 1; dia <= IDADE_REFERENCIA; dia++) {
    const bd = beta1(s, dia);
    curva.push({ dia, beta1: arred(bd), fck: arred(bd * e.fck28, 2) });
  }

  return {
    beta1: arred(b1),
    beta1Bruto: arred(bruto),
    fckEfetivo: arred(fckEfetivo, 2),
    faltaPara28: arred(e.fck28 - fckEfetivo, 2),
    fracaoAtingida: b1,
    cargaEfetiva: arred(cargaEfetiva, 2),
    unidadeCarga: e.unidadeCarga,
    s,
    nomeCimento,
    curva,
    avisos,
  };
}
