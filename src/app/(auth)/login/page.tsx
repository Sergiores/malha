"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { entrar, type ActionState } from "../actions";
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

const AVISOS: Record<string, string> = {
  conta_inativa:
    "Sua conta foi inativada por um administrador. Entre em contato para reativar.",
  link_invalido:
    "O link expirou ou já foi usado. Peça um novo e-mail de recuperação.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginForm avisoInicial={null} />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const erro = useSearchParams().get("error");
  const avisoInicial: ActionState =
    erro && AVISOS[erro] ? { error: AVISOS[erro] } : null;
  return <LoginForm avisoInicial={avisoInicial} />;
}

function LoginForm({ avisoInicial }: { avisoInicial: ActionState }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    entrar,
    null
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Entrar</CardTitle>
        <CardDescription>Acesse sua conta do Malha.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@email.com"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="senha">Senha</Label>
              <Link
                href="/recuperar-senha"
                className="text-xs text-muted-foreground hover:underline"
              >
                Esqueci a senha
              </Link>
            </div>
            <Input
              id="senha"
              name="senha"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <AuthMessage state={state ?? avisoInicial} />
          <SubmitButton className="w-full">Entrar</SubmitButton>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link href="/cadastro" className="text-primary hover:underline">
            Criar conta
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
