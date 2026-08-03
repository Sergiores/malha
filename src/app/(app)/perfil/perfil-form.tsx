"use client";

import { useActionState } from "react";
import { salvarPerfil } from "./actions";
import type { ActionState } from "@/app/(auth)/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { AuthMessage } from "@/components/auth-message";

export function PerfilForm({
  nome,
  telefone,
}: {
  nome: string;
  telefone: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    salvarPerfil,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" defaultValue={nome} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="telefone">Telefone</Label>
        <Input
          id="telefone"
          name="telefone"
          defaultValue={telefone}
          placeholder="(00) 00000-0000"
        />
      </div>
      <AuthMessage state={state} />
      <SubmitButton>Salvar</SubmitButton>
    </form>
  );
}
