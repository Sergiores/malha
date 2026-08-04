"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UserPlus, Users } from "lucide-react";
import { formatarDocumento } from "@/lib/documento";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type ClienteOpcao = {
  id: number;
  nome: string;
  cpfCnpj: string | null;
  cidade: string | null;
  uf: string | null;
};

/**
 * Seleção do cliente da análise.
 *
 * A lista chega pronta da página (Server Component), já filtrada pela
 * organização — o `<select>` nunca oferece cliente de outra carteira. A
 * action ainda revalida o id recebido: o HTML não é confiável.
 *
 * Opcional de propósito: o módulo Geral pode não estar liberado, e travar o
 * cálculo por falta de cadastro atrapalharia quem só quer conferir um traço.
 */
export function SeletorCliente({
  clientes,
  idSelecionado,
}: {
  clientes: ClienteOpcao[];
  idSelecionado?: number | null;
}) {
  const [valor, setValor] = useState(
    idSelecionado ? String(idSelecionado) : ""
  );

  // Reflete o que o servidor devolveu (ele revalida o id contra a carteira).
  useEffect(() => {
    setValor(idSelecionado ? String(idSelecionado) : "");
  }, [idSelecionado]);

  /*
   * ⚠️ Reafirma a escolha no DOM depois de cada commit.
   *
   * O React 19 dá `form.reset()` no formulário quando a action termina. Para
   * `<input>` e `<textarea>` isso é inofensivo — ele mantém o atributo em dia
   * e o reset devolve o mesmo valor. Já o `<select>` controlado não ganha
   * `selected` em nenhuma `<option>`, então o reset volta para a primeira:
   * "— sem cliente —". E como o estado do React continuava correto, ele não
   * via diferença para reaplicar.
   *
   * O resultado era invisível na tela e visível só no banco: clicar em
   * "Calcular" apagava o cliente do DOM, e o "Salvar" seguinte gravava a
   * análise sem cliente nenhum. Sem dependências de propósito — precisa
   * rodar em todo commit, inclusive nos que só o reset provocou.
   */
  const ref = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.value !== valor) ref.current.value = valor;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5 text-primary" />
          Cliente
        </CardTitle>
        <CardDescription>
          Aparece no laudo e permite localizar as análises depois.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {clientes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum cliente cadastrado ainda.{" "}
            <Link
              href="/m/geral/clientes/novo"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Cadastrar agora
            </Link>
          </p>
        ) : (
          <>
            <Label htmlFor="idCliente" className="sr-only">
              Cliente
            </Label>
            <select
              ref={ref}
              id="idCliente"
              name="idCliente"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">— sem cliente —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                  {c.cpfCnpj ? ` · ${formatarDocumento(c.cpfCnpj)}` : ""}
                  {c.cidade ? ` · ${c.cidade}${c.uf ? `/${c.uf}` : ""}` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              <Link
                href="/m/geral/clientes/novo"
                className="inline-flex items-center gap-1 hover:underline"
              >
                <UserPlus className="h-3 w-3" />
                Incluir novo cliente
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
