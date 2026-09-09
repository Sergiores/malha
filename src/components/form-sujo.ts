"use client";

import { useEffect, useState, type SyntheticEvent } from "react";

/**
 * Marca o formulário como "alterado desde o último cálculo".
 *
 * Existe para fechar uma divergência sutil: a action de salvar lê o
 * formulário no instante do clique e recalcula a partir dele. Se o engenheiro
 * calculasse, mudasse uma medida e salvasse sem recalcular, o laudo ficaria
 * correto e coerente — mas com números que ele nunca viu na tela. Ele
 * assinaria uma coisa tendo conferido outra.
 *
 * Com isto, o botão "Salvar" some assim que um campo de cálculo muda, e só
 * volta depois de um novo "Calcular". Quem esconde o botão precisa dizer por
 * quê: veja o aviso que acompanha cada formulário.
 */

/**
 * Campos que não entram no cálculo. Mexer neles não invalida o resultado, e
 * forçar recálculo ao trocar o cliente ou corrigir uma vírgula do parecer
 * seria só irritação.
 */
const NAO_INVALIDAM = new Set([
  "idCliente",
  "titulo",
  "observacao",
  "parecer",
  "validoAte",
  "editarId",
]);

export function useFormSujo(estado: unknown) {
  const [sujo, setSujo] = useState(false);

  // Toda resposta nova da action zera a marca: o que está na tela voltou a
  // corresponder ao que está nos campos.
  useEffect(() => {
    setSujo(false);
  }, [estado]);

  function aoMudar(e: SyntheticEvent) {
    const alvo = e.target as { name?: string } | null;
    const nome = alvo?.name;
    if (!nome || NAO_INVALIDAM.has(nome)) return;
    setSujo(true);
  }

  return { sujo, aoMudar };
}
