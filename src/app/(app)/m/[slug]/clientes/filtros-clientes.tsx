"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { UFS } from "@/lib/documento";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/**
 * Filtros na URL, não em estado local: o engenheiro consegue mandar o link
 * de uma consulta para alguém, e o botão voltar do navegador funciona.
 */
export function FiltrosClientes({ base }: { base: string }) {
  const router = useRouter();
  const params = useSearchParams();

  const valor = (k: string) => params.get(k) ?? "";
  const temFiltro = ["nome", "cpfCnpj", "cidade", "uf"].some((k) =>
    params.get(k)
  );

  function aplicar(formData: FormData) {
    const novos = new URLSearchParams();
    for (const k of ["nome", "cpfCnpj", "cidade", "uf"]) {
      const v = String(formData.get(k) ?? "").trim();
      if (v) novos.set(k, v);
    }
    const qs = novos.toString();
    router.push(qs ? `${base}?${qs}` : base);
  }

  return (
    <form action={aplicar} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-1.5 lg:col-span-2">
        <Label htmlFor="f-nome">Nome</Label>
        <Input
          id="f-nome"
          name="nome"
          defaultValue={valor("nome")}
          placeholder="Parte do nome"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-doc">CPF / CNPJ</Label>
        <Input
          id="f-doc"
          name="cpfCnpj"
          defaultValue={valor("cpfCnpj")}
          placeholder="Com ou sem pontos"
          inputMode="numeric"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-cidade">Cidade</Label>
        <Input id="f-cidade" name="cidade" defaultValue={valor("cidade")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-uf">UF</Label>
        <select
          id="f-uf"
          name="uf"
          defaultValue={valor("uf")}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Todas</option>
          {UFS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
        <Button type="submit" size="sm">
          <Search className="h-4 w-4" />
          Consultar
        </Button>
        {temFiltro && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push(base)}
          >
            <X className="h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>
    </form>
  );
}
