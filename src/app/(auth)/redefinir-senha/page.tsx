"use client";

import { useActionState } from "react";
import { redefinirSenha, type ActionState } from "../actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { AuthMessage } from "@/components/auth-message";

export default function RedefinirSenhaPage() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    redefinirSenha,
    null
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Nova senha</CardTitle>
        <CardDescription>Defina a senha que você vai usar.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="senha">Nova senha</Label>
            <Input
              id="senha"
              name="senha"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">
              Mínimo de 8 caracteres.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmarSenha">Confirmar senha</Label>
            <Input
              id="confirmarSenha"
              name="confirmarSenha"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <AuthMessage state={state} />
          <SubmitButton className="w-full">Salvar senha</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
