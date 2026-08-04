"use client";

import { Printer, Trash2 } from "lucide-react";
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
}: {
  id: number;
  status: StatusAnalise;
  slugModulo: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {STATUS_ORDEM.filter((s) => s !== status).map((s) => (
        <form key={s} action={alterarStatus}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value={s} />
          <input type="hidden" name="slugModulo" value={slugModulo} />
          <SubmitButton variant="outline" size="sm">
            Marcar {STATUS_INFO[s].rotulo.toLowerCase()}
          </SubmitButton>
        </form>
      ))}

      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="h-4 w-4" />
        Imprimir laudo
      </Button>

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
        <SubmitButton variant="ghost" size="sm">
          <Trash2 className="h-4 w-4" />
          Excluir
        </SubmitButton>
      </form>
    </div>
  );
}
