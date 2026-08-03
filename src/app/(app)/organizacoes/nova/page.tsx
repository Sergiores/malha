"use client";

import { useActionState } from "react";
import Link from "next/link";
import { criarOrganizacao } from "../actions";
import type { ActionState } from "@/app/(auth)/actions";
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

export default function NovaOrganizacaoPage() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    criarOrganizacao,
    null
  );

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Nova organização</CardTitle>
          <CardDescription>
            É a empresa que contrata os módulos. Você fica como administrador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                name="nome"
                placeholder="Construtora Exemplo Ltda"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ (opcional)</Label>
              <Input id="cnpj" name="cnpj" placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone (opcional)</Label>
              <Input
                id="telefone"
                name="telefone"
                placeholder="(00) 0000-0000"
              />
            </div>
            <AuthMessage state={state} />
            <div className="flex gap-2">
              <SubmitButton>Criar organização</SubmitButton>
              <Link href="/app">
                <span className="inline-flex h-9 items-center px-4 text-sm text-muted-foreground hover:underline">
                  Cancelar
                </span>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
