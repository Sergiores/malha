import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { contaComOrganizacao } from "@/lib/organizacao";
import type { ClienteOpcao } from "@/components/seletor-cliente";

/** Clientes ativos da organização, para o seletor das calculadoras. */
export const clientesParaSelecao = cache(
  async function clientesParaSelecao(): Promise<ClienteOpcao[]> {
    const { organizacao } = await contaComOrganizacao();
    return prisma.cliente.findMany({
      where: { idOrganizacao: organizacao.id, ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, cpfCnpj: true, cidade: true, uf: true },
      take: 500,
    });
  }
);

/**
 * Valida o `idCliente` que veio do formulário.
 *
 * O select só oferece clientes da organização, mas o campo é HTML — nada
 * impede alguém de mandar outro id. Devolve `null` quando o id não existe
 * na carteira, em vez de gravar um vínculo cruzado.
 */
export async function idClienteValido(
  valor: FormDataEntryValue | null,
  idOrganizacao: number
): Promise<number | null> {
  if (valor === null || valor === "") return null;

  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) return null;

  const existe = await prisma.cliente.findFirst({
    where: { id, idOrganizacao },
    select: { id: true },
  });
  return existe ? id : null;
}
