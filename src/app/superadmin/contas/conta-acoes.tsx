"use client";

import { useState } from "react";
import { useActionState } from "react";
import { KeyRound, Pencil, Power } from "lucide-react";
import { alterarSenha, alternarAtivo, editarConta } from "./actions";
import type { ActionState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { AuthMessage } from "@/components/auth-message";

export type ContaRow = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  ativa: boolean;
  trocarSenha: boolean;
  organizacoes: number;
  ehSuperadmin: boolean;
};

export function ContaAcoes({ conta }: { conta: ContaRow }) {
  const [aberto, setAberto] = useState<"editar" | "senha" | null>(null);

  const [stEditar, acEditar] = useActionState<ActionState, FormData>(
    editarConta,
    null
  );
  const [stSenha, acSenha] = useActionState<ActionState, FormData>(
    alterarSenha,
    null
  );
  const [stAtivo, acAtivo] = useActionState<ActionState, FormData>(
    alternarAtivo,
    null
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAberto(aberto === "editar" ? null : "editar")}
        >
          <Pencil className="h-4 w-4" />
          Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAberto(aberto === "senha" ? null : "senha")}
        >
          <KeyRound className="h-4 w-4" />
          Senha
        </Button>
        <form action={acAtivo}>
          <input type="hidden" name="idConta" value={conta.id} />
          <SubmitButton
            variant={conta.ativa ? "ghost" : "default"}
            size="sm"
            disabled={conta.ehSuperadmin && conta.ativa}
          >
            <Power className="h-4 w-4" />
            {conta.ativa ? "Inativar" : "Reativar"}
          </SubmitButton>
        </form>
      </div>

      {aberto === "editar" && (
        <form action={acEditar} className="space-y-2 rounded-md border p-3">
          <input type="hidden" name="idConta" value={conta.id} />
          <div className="space-y-1">
            <Label htmlFor={`nome-${conta.id}`}>Nome</Label>
            <Input
              id={`nome-${conta.id}`}
              name="nome"
              defaultValue={conta.nome}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`tel-${conta.id}`}>Telefone</Label>
            <Input
              id={`tel-${conta.id}`}
              name="telefone"
              defaultValue={conta.telefone}
            />
          </div>
          <SubmitButton size="sm">Salvar</SubmitButton>
        </form>
      )}

      {aberto === "senha" && (
        <form action={acSenha} className="space-y-2 rounded-md border p-3">
          <input type="hidden" name="idConta" value={conta.id} />
          <div className="space-y-1">
            <Label htmlFor={`senha-${conta.id}`}>Nova senha</Label>
            <Input
              id={`senha-${conta.id}`}
              name="novaSenha"
              type="password"
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">
              A pessoa terá de trocá-la no próximo acesso.
            </p>
          </div>
          <SubmitButton size="sm">Definir senha</SubmitButton>
        </form>
      )}

      <AuthMessage state={stEditar} />
      <AuthMessage state={stSenha} />
      <AuthMessage state={stAtivo} />
    </div>
  );
}
