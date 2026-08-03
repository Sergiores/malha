"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Plus, Power } from "lucide-react";
import { alternarAtivaOrg, criarOrganizacaoAdmin } from "./actions";
import type { ActionState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { AuthMessage } from "@/components/auth-message";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function NovaOrganizacaoAdmin() {
  const [aberto, setAberto] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    criarOrganizacaoAdmin,
    null
  );

  if (!aberto) {
    return (
      <Button size="sm" onClick={() => setAberto(true)}>
        <Plus className="h-4 w-4" />
        Nova organização
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base">Nova organização</CardTitle>
        <CardDescription>
          O e-mail do administrador é opcional — se informado, a conta já
          entra como ADMIN. Ela precisa existir.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cnpj">CNPJ (opcional)</Label>
            <Input id="cnpj" name="cnpj" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="emailAdmin">E-mail do administrador</Label>
            <Input id="emailAdmin" name="emailAdmin" type="email" />
          </div>
          <AuthMessage state={state} />
          <div className="flex gap-2">
            <SubmitButton size="sm">Criar</SubmitButton>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAberto(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

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
