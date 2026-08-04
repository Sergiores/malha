import { PENEIRAS, ZONAS, type GranulometriaInput } from "./schema";

/**
 * Composição granulométrica de agregados miúdos — NBR 7211 / NBR NM 248.
 *
 * Função PURA: sem I/O, sem data, sem banco.
 *
 * O módulo de finura usa SÓ as peneiras da série normal. As intermediárias
 * (6,3 · 0,075 · 0,0375 mm) aparecem na curva e na tabela, mas somá-las
 * inflaria o índice — é o erro clássico de quem porta esse cálculo.
 */

export type LinhaAreia = {
  abertura: number;
  ensaio1: number;
  ensaio2: number;
  media: number;
  retido: number;
  acumulado: number;
  proporcional: number;
};

export type Areia = {
  nome: string;
  /** Fração desta areia na mistura, de 0 a 1. */
  fracao: number;
  linhas: LinhaAreia[];
  massaTotal: number;
  moduloFinura: number;
};

export type LinhaMescla = {
  abertura: number;
  acumulado: number;
  utilInferior: number;
  otimaInferior: number;
  otimaSuperior: number;
  utilSuperior: number;
  /** Onde a mescla caiu nesta peneira. */
  situacao: "otima" | "utilizavel" | "fora";
};

export type Aviso = {
  campo: string;
  mensagem: string;
  severidade: "alerta" | "erro";
};

export type GranulometriaResultado = {
  areiaA: Areia;
  areiaB: Areia;
  mescla: LinhaMescla[];
  moduloFinuraMescla: number;
  /** Menor peneira da série normal com acumulado <= 5%. */
  diametroMaximo: number;
  /** Pior situação encontrada — é o veredicto do conjunto. */
  enquadramento: "otima" | "utilizavel" | "fora";
  peneirasForaDaZona: number[];
  avisos: Aviso[];
};

function arred(v: number, casas = 2): number {
  const f = 10 ** casas;
  return Math.round(v * f) / f;
}

function montarAreia(
  nome: string,
  e1: number[],
  e2: number[],
  fracao: number,
  avisos: Aviso[],
  campo: string
): Areia {
  const medias = PENEIRAS.map((_, i) => (e1[i] + e2[i]) / 2);
  const massaTotal = medias.reduce((s, v) => s + v, 0);

  const t1 = e1.reduce((s, v) => s + v, 0);
  const t2 = e2.reduce((s, v) => s + v, 0);
  // A NBR NM 248 pede que as duas determinações não discrepem muito; 4% é o
  // limite usual para a média ser representativa.
  if (t1 > 0 && t2 > 0) {
    const dif = (Math.abs(t1 - t2) / ((t1 + t2) / 2)) * 100;
    if (dif > 4) {
      avisos.push({
        campo,
        severidade: "alerta",
        mensagem: `${nome}: as massas totais dos dois ensaios diferem ${arred(dif, 1)}% (${t1} g e ${t2} g). Acima de 4% a média perde representatividade — confira a amostragem.`,
      });
    }
  }

  let acumulado = 0;
  const linhas: LinhaAreia[] = PENEIRAS.map((p, i) => {
    const retido = massaTotal > 0 ? (medias[i] / massaTotal) * 100 : 0;
    acumulado += retido;
    // Arredonda só na saída; o acumulado segue em precisão plena.
    const acumuladoLimitado = Math.min(acumulado, 100);
    return {
      abertura: p.abertura,
      ensaio1: e1[i],
      ensaio2: e2[i],
      media: arred(medias[i], 1),
      retido: arred(retido, 1),
      acumulado: arred(acumuladoLimitado, 1),
      proporcional: arred(acumuladoLimitado * fracao, 1),
    };
  });

  // Módulo de finura: soma das retidas acumuladas da série normal / 100.
  const somaSerie = PENEIRAS.reduce((s, p, i) => {
    if (!p.serieNormal) return s;
    return s + Math.min(acumuladoAte(medias, massaTotal, i), 100);
  }, 0);

  return {
    nome,
    fracao,
    linhas,
    massaTotal: arred(massaTotal, 1),
    moduloFinura: arred(somaSerie / 100, 2),
  };
}

/** Acumulado (em %) até a peneira `ate`, em precisão plena. */
function acumuladoAte(medias: number[], total: number, ate: number): number {
  if (total <= 0) return 0;
  let s = 0;
  for (let i = 0; i <= ate; i++) s += (medias[i] / total) * 100;
  return s;
}

export function calcularGranulometria(
  e: GranulometriaInput
): GranulometriaResultado {
  const avisos: Aviso[] = [];

  const fracaoA = e.teorMistura / 100;
  const fracaoB = 1 - fracaoA;

  const areiaA = montarAreia(
    e.nomeAreiaA,
    e.areiaA1,
    e.areiaA2,
    fracaoA,
    avisos,
    "areiaA1"
  );
  const areiaB = montarAreia(
    e.nomeAreiaB,
    e.areiaB1,
    e.areiaB2,
    fracaoB,
    avisos,
    "areiaB1"
  );

  const peneirasForaDaZona: number[] = [];
  const mescla: LinhaMescla[] = PENEIRAS.map((p, i) => {
    const acumulado = arred(
      areiaA.linhas[i].proporcional + areiaB.linhas[i].proporcional,
      1
    );

    const ui = ZONAS.utilInferior[i];
    const oi = ZONAS.otimaInferior[i];
    const os = ZONAS.otimaSuperior[i];
    const us = ZONAS.utilSuperior[i];

    let situacao: LinhaMescla["situacao"];
    if (!p.temLimite) {
      // Abaixo de 0,15 mm não há zona normativa — não enquadra nem reprova.
      situacao = "utilizavel";
    } else if (acumulado >= oi && acumulado <= os) {
      situacao = "otima";
    } else if (acumulado >= ui && acumulado <= us) {
      situacao = "utilizavel";
    } else {
      situacao = "fora";
      peneirasForaDaZona.push(p.abertura);
    }

    return {
      abertura: p.abertura,
      acumulado,
      utilInferior: ui,
      otimaInferior: oi,
      otimaSuperior: os,
      utilSuperior: us,
      situacao,
    };
  });

  const enquadramento: GranulometriaResultado["enquadramento"] =
    peneirasForaDaZona.length > 0
      ? "fora"
      : mescla.every((m) => m.situacao === "otima")
        ? "otima"
        : "utilizavel";

  if (enquadramento === "fora") {
    avisos.push({
      campo: "teorMistura",
      severidade: "alerta",
      mensagem: `A mescla sai da zona utilizável em ${peneirasForaDaZona.length} peneira(s): ${peneirasForaDaZona.map((a) => `${a} mm`).join(", ")}. Ajuste o teor de mistura ou reveja as areias.`,
    });
  }

  // Módulo de finura da mescla: média ponderada pelas frações.
  const moduloFinuraMescla = arred(
    areiaA.moduloFinura * fracaoA + areiaB.moduloFinura * fracaoB,
    2
  );

  // Diâmetro máximo característico: peneira da série normal em que a
  // acumulada é igual ou imediatamente inferior a 5% (NBR NM 248).
  let diametroMaximo: number = PENEIRAS[0].abertura;
  for (let i = PENEIRAS.length - 1; i >= 0; i--) {
    if (!PENEIRAS[i].serieNormal) continue;
    if (mescla[i].acumulado <= 5) diametroMaximo = PENEIRAS[i].abertura;
  }

  if (moduloFinuraMescla < 1.55 || moduloFinuraMescla > 3.5) {
    avisos.push({
      campo: "teorMistura",
      severidade: "alerta",
      mensagem: `Módulo de finura da mescla = ${moduloFinuraMescla}. Fora da faixa usual para agregado miúdo de concreto (1,55 a 3,50).`,
    });
  }

  return {
    areiaA,
    areiaB,
    mescla,
    moduloFinuraMescla,
    diametroMaximo,
    enquadramento,
    peneirasForaDaZona,
    avisos,
  };
}

/**
 * Teor de mistura que deixa a mescla melhor enquadrada.
 *
 * Varre de 0 a 100% em passos de 1% e devolve o teor com mais peneiras na
 * zona ótima. É o que a planilha obrigava a fazer por tentativa manual.
 */
export function melhorTeor(e: GranulometriaInput): {
  teor: number;
  otimas: number;
  enquadramento: GranulometriaResultado["enquadramento"];
} {
  let melhor: {
    teor: number;
    otimas: number;
    enquadramento: GranulometriaResultado["enquadramento"];
  } = { teor: e.teorMistura, otimas: -1, enquadramento: "fora" };

  for (let t = 0; t <= 100; t++) {
    const r = calcularGranulometria({ ...e, teorMistura: t });
    const otimas = r.mescla.filter((m) => m.situacao === "otima").length;
    const forat = r.peneirasForaDaZona.length;

    // Prioriza não sair da zona utilizável; depois, maximiza as ótimas.
    const atualForaOk = forat === 0;
    const melhorForaOk = melhor.enquadramento !== "fora";
    if (
      (atualForaOk && !melhorForaOk) ||
      (atualForaOk === melhorForaOk && otimas > melhor.otimas)
    ) {
      melhor = { teor: t, otimas, enquadramento: r.enquadramento };
    }
  }

  return melhor;
}
