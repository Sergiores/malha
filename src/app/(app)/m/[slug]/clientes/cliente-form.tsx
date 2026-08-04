"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import { salvarCliente } from "./actions";
import type { ActionState } from "@/app/(auth)/actions";
import { UFS, formatarCep, formatarDocumento } from "@/lib/documento";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { AuthMessage } from "@/components/auth-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ClienteFormValores = {
  id?: number;
  nome: string;
  cpfCnpj: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  fone: string;
  email: string;
  contato: string;
};

export function ClienteForm({
  valores,
  voltarPara,
}: {
  valores: ClienteFormValores;
  voltarPara: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    salvarCliente,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      {valores.id && <input type="hidden" name="id" value={valores.id} />}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Identificação</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="nome">Nome / Razão social *</Label>
            <Input
              id="nome"
              name="nome"
              defaultValue={valores.nome}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cpfCnpj">CPF / CNPJ</Label>
            <Input
              id="cpfCnpj"
              name="cpfCnpj"
              defaultValue={formatarDocumento(valores.cpfCnpj)}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              inputMode="numeric"
            />
            <p className="text-xs text-muted-foreground">
              Pode digitar com ou sem pontuação — os dígitos são conferidos.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contato">Contato</Label>
            <Input
              id="contato"
              name="contato"
              defaultValue={valores.contato}
              placeholder="Nome de quem atende"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Endereço</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-6">
          <div className="space-y-1.5 sm:col-span-4">
            <Label htmlFor="endereco">Logradouro</Label>
            <Input
              id="endereco"
              name="endereco"
              defaultValue={valores.endereco}
              placeholder="Rua, número, complemento"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cep">CEP</Label>
            <Input
              id="cep"
              name="cep"
              defaultValue={formatarCep(valores.cep)}
              placeholder="00000-000"
              inputMode="numeric"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bairro">Bairro</Label>
            <Input id="bairro" name="bairro" defaultValue={valores.bairro} />
          </div>
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="cidade">Cidade</Label>
            <Input id="cidade" name="cidade" defaultValue={valores.cidade} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uf">UF</Label>
            <select
              id="uf"
              name="uf"
              defaultValue={valores.uf}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">—</option>
              {UFS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Comunicação</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fone">Telefone</Label>
            <Input
              id="fone"
              name="fone"
              defaultValue={valores.fone}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={valores.email}
            />
          </div>
        </CardContent>
      </Card>

      <AuthMessage state={state} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton>
          <Save className="h-4 w-4" />
          {valores.id ? "Salvar alterações" : "Incluir cliente"}
        </SubmitButton>
        <Link href={voltarPara}>
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
