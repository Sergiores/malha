"use client";

import Link from "next/link";
import { Copy, MessageCircle, Pencil, Printer, Trash2 } from "lucide-react";
import type { StatusAnalise } from "@prisma/client";
import {
  alterarStatus,
  excluirAnalise,
} from "@/app/(app)/m/[slug]/dosagem-caa/actions";
import { STATUS_INFO, STATUS_ORDEM } from "@/lib/analise";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";

export function AcoesAnalise({
  id,
  status,
  slugModulo,
  slugCalculadora,
  linkZap,
}: {
  id: number;
  status: StatusAnalise;
  slugModulo: string;
  slugCalculadora: string;
  /** Só vem preenchido quando a análise está aprovada. */
  linkZap: string | null;
}) {
  const base = `/m/${slugModulo}/${slugCalculadora}`;
  const rascunho = status === "RASCUNHO";

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {/* Editar só existe em rascunho: laudo concluído não se reescreve. */}
      {rascunho && (
        <Link href={`${base}?editar=${id}`}>
          <Button variant="default" size="sm" className="varredura">
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
        </Link>
      )}

      {/* Copiar funciona em qualquer status — é como se parte de um laudo
          anterior sem tocar nele. */}
      <Link href={`${base}?copiar=${id}`}>
        <Button variant="outline" size="sm" className="varredura">
          <Copy className="h-4 w-4" />
          Copiar
        </Button>
      </Link>

      {linkZap && (
        <a href={linkZap} target="_blank" rel="noopener noreferrer">
          <Button
            variant="outline"
            size="sm"
            className="varredura border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>
        </a>
      )}

      <Button
        variant="outline"
        size="sm"
        className="varredura"
        onClick={() => window.print()}
      >
        <Printer className="h-4 w-4" />
        Imprimir
      </Button>

      <span className="mx-1 hidden h-5 w-px bg-border sm:block" />

      {STATUS_ORDEM.filter((s) => s !== status).map((s) => (
        <form key={s} action={alterarStatus}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value={s} />
          <input type="hidden" name="slugModulo" value={slugModulo} />
          <SubmitButton variant="ghost" size="sm">
            {STATUS_INFO[s].rotulo}
          </SubmitButton>
        </form>
      ))}

      <form
        action={excluirAnalise}
        onSubmit={(e) => {
          if (!confirm("Excluir esta análise? A ação não pode ser desfeita.")) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="slugModulo" value={slugModulo} />
        <SubmitButton
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </SubmitButton>
      </form>
    </div>
  );
}
