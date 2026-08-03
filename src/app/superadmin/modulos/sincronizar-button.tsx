"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { sincronizar } from "./actions";
import type { ActionState } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/submit-button";
import { AuthMessage } from "@/components/auth-message";

export function SincronizarButton() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    sincronizar,
    null
  );

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <SubmitButton size="sm" variant="outline">
          <RefreshCw className="h-4 w-4" />
          Sincronizar do código
        </SubmitButton>
      </form>
      <AuthMessage state={state} />
    </div>
  );
}
