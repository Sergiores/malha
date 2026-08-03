"use client";

import { useActionState } from "react";
import { CircleSlash, RotateCcw, Save } from "lucide-react";
import { revogarLicenca, salvarLicenca } from "./actions";
import type { ActionState } from "@/app/(auth)/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { AuthMessage } from "@/components/auth-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** `YYYY-MM-DD` -> `DD/MM/AAAA`, sem passar por Date (evita fuso). */
function dataPtBr(iso: string): string {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export type LicencaRow = {
  idModulo: number;
  nome: string;
  slug: string;
  temLicenca: boolean;
  ativo: boolean;
  validoDe: string;
  validoAte: string;
  observacao: string;
  situacao: string;
  rotuloSituacao: string;
  classeSituacao: string;
};

export function LicencaForm({
  idOrganizacao,
  licenca,
  hoje,
}: {
  idOrganizacao: number;
  licenca: LicencaRow;
  hoje: string;
}) {
  const [stSalvar, acSalvar] = useActionState<ActionState, FormData>(
    salvarLicenca,
    null
  );
  const [stRevogar, acRevogar] = useActionState<ActionState, FormData>(
    revogarLicenca,
    null
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{licenca.nome}</CardTitle>
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${licenca.classeSituacao}`}
          >
            {licenca.rotuloSituacao}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Estado GRAVADO, independente do que está nos campos. Sem isto, um
            campo de data incompleto (que o navegador devolve vazio) grava
            "sem prazo" e parece que o prazo foi ignorado. */}
        <p className="rounded-md bg-muted px-3 py-2 text-sm">
          {licenca.temLicenca ? (
            <>
              <span className="text-muted-foreground">Gravado: </span>
              {dataPtBr(licenca.validoDe)}
              {licenca.validoAte ? (
                <> até <strong>{dataPtBr(licenca.validoAte)}</strong></>
              ) : (
                <> · <strong>sem prazo</strong></>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">
              Nenhuma licença gravada para este módulo.
            </span>
          )}
        </p>

        <form action={acSalvar} className="space-y-3">
          <input type="hidden" name="idOrganizacao" value={idOrganizacao} />
          <input type="hidden" name="idModulo" value={licenca.idModulo} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`de-${licenca.idModulo}`}>Válido de</Label>
              <Input
                id={`de-${licenca.idModulo}`}
                name="validoDe"
                type="date"
                defaultValue={licenca.validoDe || hoje}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`ate-${licenca.idModulo}`}>Válido até</Label>
              <Input
                id={`ate-${licenca.idModulo}`}
                name="validoAte"
                type="date"
                defaultValue={licenca.validoAte}
              />
              <p className="text-xs text-muted-foreground">
                Em branco = sem prazo.
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor={`obs-${licenca.idModulo}`}>Observação</Label>
            <Input
              id={`obs-${licenca.idModulo}`}
              name="observacao"
              defaultValue={licenca.observacao}
              placeholder="Contrato, pedido, condição comercial…"
            />
          </div>

          <SubmitButton size="sm">
            <Save className="h-4 w-4" />
            {licenca.temLicenca ? "Renovar" : "Conceder"}
          </SubmitButton>
        </form>

        {licenca.temLicenca && (
          <form action={acRevogar}>
            <input type="hidden" name="idOrganizacao" value={idOrganizacao} />
            <input type="hidden" name="idModulo" value={licenca.idModulo} />
            <SubmitButton variant="ghost" size="sm">
              {licenca.ativo ? (
                <>
                  <CircleSlash className="h-4 w-4" />
                  Revogar
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Reativar
                </>
              )}
            </SubmitButton>
          </form>
        )}

        <AuthMessage state={stSalvar} />
        <AuthMessage state={stRevogar} />
      </CardContent>
    </Card>
  );
}
