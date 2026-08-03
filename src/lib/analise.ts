import type { StatusAnalise } from "@prisma/client";

export const STATUS_INFO: Record<
  StatusAnalise,
  { rotulo: string; classe: string }
> = {
  RASCUNHO: {
    rotulo: "Rascunho",
    classe: "bg-muted text-muted-foreground",
  },
  CONCLUIDA: {
    rotulo: "Concluída",
    classe: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  },
  APROVADA: {
    rotulo: "Aprovada",
    classe: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  ARQUIVADA: {
    rotulo: "Arquivada",
    classe: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
};

export const STATUS_ORDEM: StatusAnalise[] = [
  "RASCUNHO",
  "CONCLUIDA",
  "APROVADA",
  "ARQUIVADA",
];

export function dataHoraBr(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
