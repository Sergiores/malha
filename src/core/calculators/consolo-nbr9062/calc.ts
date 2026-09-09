import {
  FAIXAS,
  LIMITE_CONSOLO,
  LIMITE_MUITO_CURTO,
  TENSAO_ADMISSIVEL_APOIO,
  apoioDe,
  concretagemDe,
  distanciaTirante,
  fykDe,
  type ConsoloInput,
} from "./schema";

/**
 * Consolo de concreto pré-moldado com carga direta — NBR 9062.
 *
 * Função PURA: sem I/O, sem data, sem banco. É o que torna o laudo
 * reproduzível dois anos depois com as mesmas entradas.
 *
 * Três regimes, decididos pela relação a/d:
 *   a/d ≤ 0,50  →  consolo muito curto  →  atrito-cisalhamento
 *   a/d ≤ 1,00  →  consolo curto        →  biela e tirante
 *   a/d >  1,00 →  viga em balanço      →  FORA DE ESCOPO (A-01)
 *
 * Unidades: geometria em cm, forças em kN, tensões em MPa, armaduras em cm².
 * A conversão que aparece o tempo todo é kN/cm² → MPa, que é ×10.
 */

export type Aviso = {
  campo: string;
  mensagem: string;
  severidade: "alerta" | "erro";
};

export type Verificacao = {
  chave: string;
  nome: string;
  atuante: number;
  limite: number;
  unidade: string;
  /** A-02: veredito explícito, não dois números lado a lado. */
  atende: boolean;
  /** atuante / limite, de 0 a 1 (pode passar de 1 quando reprova). */
  aproveitamento: number;
  /** 1 − aproveitamento. Negativo quando reprova. */
  folga: number;
  /** De onde saiu o limite, para o laudo não virar caixa-preta. */
  criterio: string;
};

export type Classificacao = "MUITO_CURTO" | "CURTO" | "VIGA_BALANCO";

export type Geometria = {
  alfa: number;
  bd: number;
  ab: number;
  ad: number;
  ac: number;
  theta: number;
  hbie: number;
  abie: number;
  rcd: number;
};

export type Cisalhamento = {
  mu: number;
  tauWd: number;
  tauWu1: number;
  tauWu2: number;
  tauWu3: number;
  tauWu: number;
};

export type Armaduras = {
  /** O que a fórmula do modelo produziu. */
  asTirCalculado: number;
  asTirMin: number;
  /** O que vale: o maior dos dois. */
  asTir: number;
  /** Qual dos dois governou — não é veredito, é escolha. */
  governa: "calculado" | "minima";
  asv: number;
  asCost: number;
  asw: number;
  rho: number;
  omega: number;
};

export type ConsoloResultado = {
  classificacao: Classificacao;
  nomeClassificacao: string;
  razaoAD: number;
  dLinha: number;
  d: number;

  /** A-01: quando true, não há dimensionamento — só a mensagem. */
  foraDeEscopo: boolean;
  mensagemEscopo: string | null;

  // Esforços e materiais
  gamaN: number;
  fsd: number;
  hsd: number;
  fatorApoio: number;
  nomeApoio: string;
  fck: number;
  fcd: number;
  fyk: number;
  fyd: number;

  /** Só no consolo curto. */
  geometria: Geometria | null;
  /** Só no consolo muito curto. */
  cisalhamento: Cisalhamento | null;

  armaduras: Armaduras | null;
  verificacoes: Verificacao[];
  /** Governado pela verificação mais crítica. */
  veredito: "ATENDE" | "NAO_ATENDE" | "FORA_ESCOPO";
  avisos: Aviso[];
};

const grau = (rad: number) => (rad * 180) / Math.PI;
const rad = (g: number) => (g * Math.PI) / 180;

/**
 * Arredonda e **garante número finito**.
 *
 * `Infinity` e `NaN` não existem em JSON: o Prisma os grava como `null`, e o
 * laudo quebra ao formatar. Deixar passar aqui é gravar uma análise que não
 * abre. Se algum caminho de cálculo chegar a não-finito, é bug de domínio —
 * e o lugar de tratá-lo é antes, com um retorno de geometria impossível.
 */
function arred(v: number, casas = 4): number {
  if (!Number.isFinite(v)) return 0;
  const f = 10 ** casas;
  return Math.round(v * f) / f;
}

function br(v: number, casas = 2) {
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

function verificar(
  chave: string,
  nome: string,
  atuante: number,
  limite: number,
  unidade: string,
  criterio: string
): Verificacao {
  const aproveitamento = limite > 0 ? atuante / limite : Infinity;
  return {
    chave,
    nome,
    atuante: arred(atuante, 3),
    limite: arred(limite, 3),
    unidade,
    atende: atuante <= limite,
    aproveitamento: arred(aproveitamento, 4),
    folga: arred(1 - aproveitamento, 4),
    criterio,
  };
}

function faixa(
  avisos: Aviso[],
  campo: string,
  rotulo: string,
  valor: number,
  limites: { min: number; max: number; unidade: string }
) {
  if (valor < limites.min || valor > limites.max) {
    avisos.push({
      campo,
      severidade: "alerta",
      mensagem: `${rotulo} = ${br(valor)}${limites.unidade} está fora da faixa usual (${limites.min} a ${limites.max}${limites.unidade}). O cálculo prossegue, mas confira a premissa.`,
    });
  }
}

export function calcularConsolo(e: ConsoloInput): ConsoloResultado {
  const avisos: Aviso[] = [];

  const apoio = apoioDe(e.apoio);
  const fase = concretagemDe(e.concretagem);
  const fyk = fykDe(e.aco);
  if (!apoio || !fase || fyk === null) {
    // O Zod já barra isto; a guarda existe para o motor não depender de ter
    // sido chamado depois da validação.
    throw new Error("Entrada com classe desconhecida (apoio, fase ou aço).");
  }

  faixa(avisos, "b", "A largura b", e.b, FAIXAS.b);
  faixa(avisos, "h", "A altura h", e.h, FAIXAS.h);
  faixa(avisos, "l", "O avanço l", e.l, FAIXAS.l);
  faixa(avisos, "a", "O balanço a", e.a, FAIXAS.a);
  faixa(avisos, "c", "O cobrimento c", e.c, FAIXAS.c);
  faixa(avisos, "fk", "A força vertical Fk", e.fk, FAIXAS.fk);

  // ---- Geometria de referência (A-05: d′ acompanha a bitola) ----
  const dLinha = distanciaTirante(e.c, e.bitola);
  const d = e.h - dLinha;

  const fcd = e.fck / 1.4;
  const fyd = fyk / 1.15;
  const gamaN = fase.gamaN;
  const fsd = gamaN * 1.4 * e.fk;
  const hsd = apoio.fator * fsd;

  const base = {
    dLinha: arred(dLinha, 3),
    d: arred(d, 3),
    gamaN,
    fsd: arred(fsd, 3),
    hsd: arred(hsd, 3),
    fatorApoio: apoio.fator,
    nomeApoio: apoio.nome,
    fck: e.fck,
    fcd: arred(fcd, 3),
    fyk,
    fyd: arred(fyd, 3),
  };

  // A altura útil precisa existir antes de qualquer classificação.
  if (d <= 0) {
    return {
      ...base,
      classificacao: "VIGA_BALANCO",
      nomeClassificacao: "Geometria impossível",
      razaoAD: 0,
      foraDeEscopo: true,
      mensagemEscopo: `A distância do topo ao tirante (d′ = ${br(dLinha)} cm) é maior que a altura do consolo (h = ${br(e.h)} cm). Não sobra altura útil. Aumente h, reduza o cobrimento ou use bitola menor.`,
      geometria: null,
      cisalhamento: null,
      armaduras: null,
      verificacoes: [],
      veredito: "FORA_ESCOPO",
      avisos,
    };
  }

  const razaoAD = e.a / d;

  // ---- A-01: fora de escopo, e a mensagem diz o que fazer ----
  if (razaoAD > LIMITE_CONSOLO) {
    const aMax = LIMITE_CONSOLO * d;
    return {
      ...base,
      classificacao: "VIGA_BALANCO",
      nomeClassificacao: "Viga em balanço",
      razaoAD: arred(razaoAD, 4),
      foraDeEscopo: true,
      mensagemEscopo: `Com a = ${br(e.a)} cm e d = ${br(d)} cm, a relação a/d = ${br(razaoAD)} passa do limite de ${br(LIMITE_CONSOLO, 1)} da NBR 9062 para consolo. Esta peça precisa ser dimensionada como viga em balanço, à flexão — fora do escopo desta ferramenta. Para voltar ao domínio de consolo: reduzir o balanço a para no máximo ${br(aMax)} cm, ou aumentar a altura h.`,
      geometria: null,
      cisalhamento: null,
      armaduras: null,
      verificacoes: [],
      veredito: "FORA_ESCOPO",
      avisos,
    };
  }

  const muitoCurto = razaoAD <= LIMITE_MUITO_CURTO;
  const classificacao: Classificacao = muitoCurto ? "MUITO_CURTO" : "CURTO";

  // Armadura de tirante mínima e transversal são comuns aos dois modelos.
  const asTirMin = 0.04 * e.b * d * (e.fck / fyk);
  const asw = 0.0015 * e.b * e.h;
  // fyd em MPa → kN/cm², que é a unidade em que as áreas saem direto em cm².
  const fydKNcm2 = fyd / 10;

  let geometria: Geometria | null = null;
  let cisalhamento: Cisalhamento | null = null;
  let asv: number;
  let asTirCalculado: number;
  let asCost: number;
  const verificacoes: Verificacao[] = [];

  if (muitoCurto) {
    // ---- Atrito-cisalhamento ----
    const mu = fase.mu;
    asv = (0.8 * fsd) / (fydKNcm2 * mu);
    asTirCalculado = asv + hsd / fydKNcm2;

    const rhoMC = asTirCalculado / (e.b * d);
    const tauWd = (fsd / (e.b * e.h)) * 10;
    const tauWu1 = 3 + 0.9 * rhoMC * fyd;
    const tauWu2 = 0.27 * (1 - e.fck / 250) * fcd;
    const tauWu3 = 8;
    const tauWu = Math.min(tauWu1, tauWu2, tauWu3);

    cisalhamento = {
      mu,
      tauWd: arred(tauWd, 4),
      tauWu1: arred(tauWu1, 4),
      tauWu2: arred(tauWu2, 4),
      tauWu3,
      tauWu: arred(tauWu, 4),
    };

    asCost = Math.max(
      0.5 * (2 / 3) * asv + (0.0015 * e.b * d) / 3,
      0.0015 * e.b * d
    );

    verificacoes.push(
      verificar(
        "cisalhamento",
        "Cisalhamento na interface",
        tauWd,
        tauWu,
        "MPa",
        `τwu = mín(τwu1 ${br(tauWu1)} ; τwu2 ${br(tauWu2)} ; 8,00) MPa`
      )
    );
  } else {
    // ---- Biela e tirante ----
    const alfa = grau(Math.atan(hsd / fsd));
    const bd = dLinha * Math.tan(rad(alfa));

    // A ancoragem por barra soldada come 2 cm a mais de comprimento.
    const folgaAncoragem =
      e.ancoragem === "BARRA_SOLDADA" ? e.bitola / 10 + 2 : e.bitola / 10;
    const ab = e.l - (e.c + folgaAncoragem) - e.a - bd;

    /*
     * Sem comprimento, a biela não se forma — e daí para a frente tudo é
     * lixo: AC negativo, área de biela negativa, tensão = Fsd/negativo.
     *
     * Isto já gravou uma análise inutilizável: a tensão saía `Infinity`, que
     * o JSON não representa, virava `null` no banco e derrubava o laudo com
     * exceção no cliente. Um aviso não bastava — a peça precisa parar aqui,
     * como já para quando vira viga em balanço.
     */
    if (ab <= 0) {
      const lMin = e.c + folgaAncoragem + e.a + bd;
      return {
        ...base,
        classificacao,
        nomeClassificacao: "Geometria impossível",
        razaoAD: arred(razaoAD, 4),
        foraDeEscopo: true,
        mensagemEscopo: `Não há comprimento para a biela se formar. O avanço l = ${br(e.l)} cm precisa cobrir o cobrimento (${br(e.c)}), a ancoragem (${br(folgaAncoragem)}), o balanço a (${br(e.a)}) e a projeção do tirante (${br(bd)}) — soma de ${br(lMin)} cm. Aumente l para mais de ${br(lMin)} cm, ou reduza o balanço a ou o cobrimento.`,
        geometria: null,
        cisalhamento: null,
        armaduras: null,
        verificacoes: [],
        veredito: "FORA_ESCOPO",
        avisos,
      };
    }

    const ad = ab + bd;
    const ac = 2 * ab;
    const theta = grau(Math.atan(d / (ad + e.a)));
    // Sem força horizontal a biela se apoia em AD·2 em vez de AC.
    const hbie = (hsd === 0 ? ad * 2 : ac) * Math.sin(rad(theta));
    // A-06: a largura é a do aparelho de apoio, e o schema garante bₙ ≤ b.
    const abie = hbie * e.bn;
    const rcd = fsd / Math.sin(rad(theta));
    const sigmaBie = abie > 0 ? (10 * rcd) / abie : Infinity;

    geometria = {
      alfa: arred(alfa, 3),
      bd: arred(bd, 3),
      ab: arred(ab, 3),
      ad: arred(ad, 3),
      ac: arred(ac, 3),
      theta: arred(theta, 3),
      hbie: arred(hbie, 3),
      abie: arred(abie, 3),
      rcd: arred(rcd, 3),
    };

    asv = (0.1 + e.a / d) * (fsd / fydKNcm2);
    asTirCalculado = asv + hsd / fydKNcm2;
    asCost = 0.4 * (2 / 3) * Math.max(asTirMin, asv);

    verificacoes.push(
      verificar(
        "biela",
        "Compressão na biela",
        sigmaBie,
        fcd,
        "MPa",
        `fcd = fck/1,4 = ${br(fcd)} MPa`
      )
    );
  }

  // ---- Verificação comum: contato no aparelho de apoio ----
  // A-03: com Fk característico, contra 7,00 MPa. Ver o aviso no schema.
  const sigmaApoio = (10 * e.fk) / (e.an * e.bn);
  verificacoes.push(
    verificar(
      "apoio",
      "Contato no aparelho de apoio",
      sigmaApoio,
      TENSAO_ADMISSIVEL_APOIO,
      "MPa",
      `admissível de ${br(TENSAO_ADMISSIVEL_APOIO)} MPa, com a força característica Fk`
    )
  );

  const asTir = Math.max(asTirCalculado, asTirMin);
  const governa = asTirCalculado >= asTirMin ? "calculado" : "minima";
  const rho = asTir / (e.b * d);

  const armaduras: Armaduras = {
    asTirCalculado: arred(asTirCalculado, 4),
    asTirMin: arred(asTirMin, 4),
    asTir: arred(asTir, 4),
    governa,
    asv: arred(asv, 4),
    asCost: arred(asCost, 4),
    asw: arred(asw, 4),
    rho: arred(rho, 6),
    omega: arred(rho * (fyk / e.fck), 6),
  };

  const temErro = avisos.some((a) => a.severidade === "erro");
  const veredito =
    !temErro && verificacoes.every((v) => v.atende) ? "ATENDE" : "NAO_ATENDE";

  return {
    ...base,
    classificacao,
    nomeClassificacao: muitoCurto ? "Consolo muito curto" : "Consolo curto",
    razaoAD: arred(razaoAD, 4),
    foraDeEscopo: false,
    mensagemEscopo: null,
    geometria,
    cisalhamento,
    armaduras,
    verificacoes,
    veredito,
    avisos,
  };
}
