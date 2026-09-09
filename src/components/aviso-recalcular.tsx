import { RefreshCw } from "lucide-react";

/**
 * Ocupa o lugar do botão "Salvar" quando o formulário mudou desde o último
 * cálculo. Sumir sem explicação seria pior que o problema que isto resolve.
 */
export function AvisoRecalcular() {
  return (
    <p className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
      <RefreshCw className="h-4 w-4 shrink-0" />
      Os valores mudaram desde o último cálculo. Clique em{" "}
      <strong>Calcular</strong> para conferir o resultado novo antes de salvar.
    </p>
  );
}
