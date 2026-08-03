import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Código de convite curto (estilo `3F9K2A`).
 *
 * Crockford Base32 — sem 0/O nem 1/I/L, para não haver ambiguidade quando
 * alguém dita o código por telefone.
 */
export function gerarCodigoConvite(tamanho = 6): string {
  const alfabeto = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const bytes = new Uint8Array(tamanho);
  crypto.getRandomValues(bytes);
  let saida = "";
  for (let i = 0; i < tamanho; i++) {
    saida += alfabeto[bytes[i] % alfabeto.length];
  }
  return saida;
}

/** Formata data para pt-BR sem depender de fuso (colunas @db.Date). */
export function dataBr(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const data = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(data);
}
