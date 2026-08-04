import { notFound } from "next/navigation";
import { carregarAnalise } from "@/lib/analise-comum";
import { isoDeData } from "@/lib/validations/superadmin";
import type { ModoFormulario } from "@/components/campos-laudo";

export type PreCarregado = {
  modo: ModoFormulario;
  iniciais: Record<string, unknown>;
  idCliente: number | null;
  parecer: string;
  validoAte: string;
};

/**
 * Resolve `?editar=<id>` e `?copiar=<id>` para as calculadoras.
 *
 * Diferença que importa: **editar** só vale para RASCUNHO e sobrescreve a
 * análise; **copiar** funciona a partir de qualquer status e sempre cria uma
 * nova, deixando o laudo original intacto.
 *
 * O parecer não é copiado de propósito — ele é a leitura de um resultado
 * específico. Arrastá-lo para outra análise convidaria a assinar uma
 * conclusão que ninguém releu.
 */
export async function carregarParaFormulario(
  searchParams: { editar?: string; copiar?: string },
  slugCalculadoraEsperada: string
): Promise<PreCarregado | null> {
  // `editar` tem precedência, e a mesma decisão define o modo — senão
  // `?editar=1&copiar=2` carregaria uma análise em modo de gravar por cima
  // de outra.
  const copiando = searchParams.editar === undefined;
  const bruto = searchParams.editar ?? searchParams.copiar;
  if (!bruto) return null;

  const id = Number(bruto);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const analise = await carregarAnalise(id);
  // Análise de outra organização, inexistente, ou de outra calculadora.
  if (!analise || analise.calculadora.slug !== slugCalculadoraEsperada) {
    notFound();
  }

  // Rascunho é o único status alterável; qualquer outro só admite cópia.
  if (!copiando && analise.status !== "RASCUNHO") notFound();

  const entradas = analise.entradas as Record<string, unknown>;

  return {
    modo: copiando
      ? { tipo: "copia", deTitulo: analise.titulo }
      : { tipo: "editar", id: analise.id, titulo: analise.titulo },
    iniciais: {
      ...entradas,
      titulo: copiando ? `${analise.titulo} (cópia)` : analise.titulo,
      observacao: analise.observacao ?? "",
    },
    idCliente: analise.idCliente,
    parecer: copiando ? "" : (analise.parecer ?? ""),
    validoAte: copiando ? "" : isoDeData(analise.validoAte),
  };
}
