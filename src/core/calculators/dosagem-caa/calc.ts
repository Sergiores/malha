import { FAIXAS, type DosagemCaaInput } from "./schema";

/**
 * Dosagem de Concreto Autoadensável — método Tutikian.
 *
 * Função PURA: sem I/O, sem data, sem acesso a banco. É o que a torna
 * testável e o que garante que o resultado de hoje seja reproduzível daqui a
 * dois anos, dado o mesmo conjunto de entradas.
 *
 * Diferenças conscientes em relação à planilha de origem:
 *  - os preços entram como parâmetro, não embutidos na fórmula;
 *  - todo material é recalculado a partir das entradas — na planilha, cinco
 *    células tinham perdido a fórmula e não propagavam;
 *  - o fechamento de massa é comparado com a massa específica informada, com
 *    a diferença explicitada (o método não conta o aditivo no fechamento).
 */

export type Material = {
  chave: string;
  nome: string;
  /** Parte do traço unitário, em relação ao cimento. */
  traco: number;
  /** Consumo em kg por m³ de concreto. */
  consumo: number;
  /** Preço unitário em R$/kg, como informado. */
  preco: number;
  /** Custo em R$ por m³. */
  custo: number;
  /** Participação no custo total, de 0 a 1. */
  participacao: number;
};

export type Aviso = {
  campo: string;
  mensagem: string;
  severidade: "alerta" | "erro";
};

export type DosagemCaaResultado = {
  /** m = total de agregados secos por kg de cimento. */
  m: number;
  /** α = agregado miúdo + fíler por kg de cimento. */
  alfa: number;
  materiais: Material[];
  tracoUnitario: string;
  consumoTotal: number;
  custoTotal: number;
  /** Massa calculada − massa específica informada. */
  diferencaMassa: number;
  avisos: Aviso[];
};

function arred(v: number, casas = 4): number {
  const f = 10 ** casas;
  return Math.round(v * f) / f;
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
      mensagem: `${rotulo} = ${valor}${limites.unidade} está fora da faixa usual do método (${limites.min} a ${limites.max}${limites.unidade}). O cálculo prossegue, mas confira a premissa.`,
    });
  }
}

export function calcularDosagemCaa(
  e: DosagemCaaInput
): DosagemCaaResultado {
  const avisos: Aviso[] = [];

  faixa(avisos, "cimento", "Consumo de cimento", e.cimento, FAIXAS.cimento);
  faixa(avisos, "fatorAC", "Fator a/c", e.fatorAC, FAIXAS.fatorAC);
  faixa(avisos, "teorArgamassa", "Teor de argamassa", e.teorArgamassa, FAIXAS.teorArgamassa);
  faixa(avisos, "teorFiler", "Teor de fíler", e.teorFiler, FAIXAS.teorFiler);
  faixa(avisos, "teorAditivo", "Teor de aditivo", e.teorAditivo, FAIXAS.teorAditivo);
  faixa(avisos, "massaEspecifica", "Massa específica", e.massaEspecifica, FAIXAS.massaEspecifica);

  // m = (γ / C) − (1 + a/c)
  const m = e.massaEspecifica / e.cimento - (1 + e.fatorAC);

  // α = (teor_argamassa/100) · (1 + m) − 1
  const alfa = (e.teorArgamassa / 100) * (1 + m) - 1;

  if (m <= 0) {
    avisos.push({
      campo: "massaEspecifica",
      severidade: "erro",
      mensagem:
        "Não sobra massa para os agregados: a massa específica é baixa demais para esse consumo de cimento e fator a/c.",
    });
  }
  if (alfa < 0) {
    avisos.push({
      campo: "teorArgamassa",
      severidade: "erro",
      mensagem:
        "O teor de argamassa não cobre nem a pasta de cimento. Aumente o teor de argamassa.",
    });
  }

  const tFiler = alfa * (e.teorFiler / 100);
  const tMiudo = alfa - tFiler;
  const tGraudo = m - alfa;
  const tAgua = e.fatorAC;
  const tAditivo = e.teorAditivo / 100;

  if (tGraudo < 0) {
    avisos.push({
      campo: "teorArgamassa",
      severidade: "erro",
      mensagem:
        "O teor de argamassa consome todo o agregado — não sobra graúdo. Reduza o teor de argamassa.",
    });
  }

  const def: Array<[string, string, number, number]> = [
    ["cimento", "Cimento", 1, e.precoCimento],
    ["filer", "Fíler", tFiler, e.precoFiler],
    ["miudo", "Agregado miúdo", tMiudo, e.precoMiudo],
    ["graudo", "Agregado graúdo", tGraudo, e.precoGraudo],
    ["agua", "Água", tAgua, e.precoAgua],
    ["aditivo", "Aditivo", tAditivo, e.precoAditivo],
  ];

  const parciais = def.map(([chave, nome, traco, preco]) => {
    const consumo = traco * e.cimento;
    return { chave, nome, traco, consumo, preco, custo: consumo * preco };
  });

  const custoTotal = parciais.reduce((s, p) => s + p.custo, 0);
  const consumoTotal = parciais.reduce((s, p) => s + p.consumo, 0);

  const materiais: Material[] = parciais.map((p) => ({
    ...p,
    traco: arred(p.traco),
    consumo: arred(p.consumo, 2),
    custo: arred(p.custo, 2),
    participacao: custoTotal > 0 ? p.custo / custoTotal : 0,
  }));

  const tracoUnitario = [1, tFiler, tMiudo, tGraudo, tAgua, tAditivo]
    .map((v) => arred(v, 3).toLocaleString("pt-BR", { minimumFractionDigits: 3 }))
    .join(" : ");

  return {
    m: arred(m),
    alfa: arred(alfa),
    materiais,
    tracoUnitario,
    consumoTotal: arred(consumoTotal, 2),
    custoTotal: arred(custoTotal, 2),
    // O método não inclui o aditivo no fechamento de massa; a diferença
    // esperada é justamente o consumo de aditivo.
    diferencaMassa: arred(consumoTotal - e.massaEspecifica, 2),
    avisos,
  };
}
