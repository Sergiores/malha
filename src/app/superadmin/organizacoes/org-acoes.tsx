"use client";

import { useActionState } from "react";
import { Power } from "lucide-react";
import { alternarAtivaOrg } from "./actions";
import type { ActionState } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/submit-button";
import { AuthMessage } from "@/components/auth-message";

export function BotaoBloquear({
  idOrganizacao,
  ativa,
}: {
  idOrganizacao: number;
  ativa: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    alternarAtivaOrg,
    null
  );

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input type="hidden" name="idOrganizacao" value={idOrganizacao} />
        <SubmitButton variant={ativa ? "ghost" : "default"} size="sm">
          <Power className="h-4 w-4" />
          {ativa ? "Bloquear" : "Desbloquear"}
        </SubmitButton>
      </form>
      <AuthMessage state={state} />
    </div>
  );
}
