"use client";

import { useActionState } from "react";
import { ShieldCheck, ShieldOff, UserMinus } from "lucide-react";
import { alternarPapel, removerMembro } from "./actions";
import type { ActionState } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/submit-button";
import { AuthMessage } from "@/components/auth-message";

export type MembroRow = {
  id: number;
  nome: string;
  email: string;
  papel: "ADMIN" | "MEMBRO";
  ehVoce: boolean;
};

export function MembroAcoes({
  idOrganizacao,
  membro,
}: {
  idOrganizacao: number;
  membro: MembroRow;
}) {
  const [statePapel, actionPapel] = useActionState<ActionState, FormData>(
    alternarPapel,
    null
  );
  const [stateRemover, actionRemover] = useActionState<ActionState, FormData>(
    removerMembro,
    null
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <form action={actionPapel}>
          <input type="hidden" name="idOrganizacao" value={idOrganizacao} />
          <input type="hidden" name="idMembro" value={membro.id} />
          <SubmitButton variant="outline" size="sm">
            {membro.papel === "ADMIN" ? (
              <>
                <ShieldOff className="h-4 w-4" />
                Tornar membro
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                Tornar admin
              </>
            )}
          </SubmitButton>
        </form>

        {!membro.ehVoce && (
          <form action={actionRemover}>
            <input type="hidden" name="idOrganizacao" value={idOrganizacao} />
            <input type="hidden" name="idMembro" value={membro.id} />
            <SubmitButton variant="ghost" size="sm">
              <UserMinus className="h-4 w-4" />
              Remover
            </SubmitButton>
          </form>
        )}
      </div>
      <AuthMessage state={statePapel} />
      <AuthMessage state={stateRemover} />
    </div>
  );
}
