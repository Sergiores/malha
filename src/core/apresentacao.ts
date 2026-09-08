/**
 * Como cada calculadora se apresenta fora da própria tela.
 *
 * A lista de análises é comum a todas — dosagem, granulometria, o que vier —
 * mas cada uma tem um número que resume o resultado. A coluna era fixa em
 * "Custo/m³", que só existe na dosagem; para as outras aparecia sempre "—".
 *
 * Aqui cada calculadora declara o seu destaque. Quem não declarar não quebra
 * a lista: a célula fica vazia, e é isso que deve acontecer com uma
 * calculadora nova cujo resumo ainda não foi decidido.
 *
 * Sem JSX de propósito — isto roda nas listagens, que são Server Components,
 * e o corpo visual do laudo mora em `src/components/laudo-corpo.tsx`.
 */

export type Destaque = {
  /** O que o número é, em duas ou três palavras. */
  rotulo: string;
  /** Já formatado em pt-BR, com unidade quando fizer sentido. */
  valor: string;
};

function num(v: number, casas = 2): string {
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

/**
 * Os resultados vêm de `Analise.resultados`, que é Json no banco: chegam
 * aqui sem tipo. Cada leitor confere o que precisa antes de formatar — um
 * snapshot antigo pode não ter o campo que a versão de hoje grava.
 */
type Leitor = (resultados: Record<string, unknown>) => Destaque | null;

const LEITORES: Record<string, Leitor> = {
  "dosagem-caa": (r) =>
    typeof r.custoTotal === "number"
      ? {
          rotulo: "custo por m³",
          valor: r.custoTotal.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          }),
        }
      : null,

  "granulometria-areias": (r) =>
    typeof r.moduloFinuraMescla === "number"
      ? { rotulo: "módulo de finura", valor: num(r.moduloFinuraMescla) }
      : null,

  "idade-concreto": (r) =>
    typeof r.fckEfetivo === "number"
      ? { rotulo: "fck efetivo", valor: `${num(r.fckEfetivo)} MPa` }
      : null,
};

export function destaqueDaAnalise(
  slugCalculadora: string,
  resultados: unknown
): Destaque | null {
  const leitor = LEITORES[slugCalculadora];
  if (!leitor) return null;
  if (typeof resultados !== "object" || resultados === null) return null;
  return leitor(resultados as Record<string, unknown>);
}
