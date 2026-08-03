"use client";

import { useActionState } from "react";
import Link from "next/link";
import { entrarOrganizacao } from "../actions";
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

export default function EntrarOrganizacaoPage() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    entrarOrganizacao,
    null
  );

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Entrar em uma organização</CardTitle>
          <CardDescription>
            Peça o código de convite ao administrador da empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código de convite</Label>
              <Input
                id="codigo"
                name="codigo"
                placeholder="3F9K2A"
                className="font-mono uppercase tracking-widest"
                maxLength={12}
                required
              />
            </div>
            <AuthMessage state={state} />
            <div className="flex gap-2">
              <SubmitButton>Entrar</SubmitButton>
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
