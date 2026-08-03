import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireConta } from "@/lib/auth";
import { gerarCodigoConvite } from "@/lib/utils";

/**
 * Guards de organização.
 *
 * A organização vem SEMPRE da URL (`/o/[idOrg]/...`), nunca de cookie ou
 * "organização ativa" em sessão: um usuário pode pertencer a várias, e
 * estado implícito de tenant é a origem clássica de vazamento entre
 * clientes.
 *
 * Devolvem `notFound()` — nunca 403 — quando o usuário não é membro. Um 403
 * confirmaria que a organização existe.
 */

/** Membro (qualquer papel) da organização. */
export const requireMembroOrg = cache(async function requireMembroOrg(
  idOrg: number
) {
  const { conta } = await requireConta();

  if (!Number.isInteger(idOrg) || idOrg <= 0) notFound();

  const vinculo = await prisma.organizacaoMembro.findUnique({
    where: { idOrganizacao_idConta: { idOrganizacao: idOrg, idConta: conta.id } },
    include: { organizacao: true },
  });

  if (!vinculo) notFound();

  // Organização bloqueada comercialmente — nem o admin dela entra.
  if (!vinculo.organizacao.ativa) notFound();

  return { conta, organizacao: vinculo.organizacao, papel: vinculo.papel };
});

/** Admin da organização. Membro comum recebe notFound(). */
export const requireAdminOrg = cache(async function requireAdminOrg(
  idOrg: number
) {
  const ctx = await requireMembroOrg(idOrg);
  if (ctx.papel !== "ADMIN") notFound();
  return ctx;
});

/**
 * Gera um código de convite que ainda não existe.
 *
 * Colisão em 32^6 é improvável, mas o campo é `@unique` — sem o retry, o
 * azar viraria erro na cara do usuário.
 */
export async function gerarCodigoConviteUnico(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const codigo = gerarCodigoConvite();
    const existe = await prisma.organizacao.findUnique({
      where: { codigoConvite: codigo },
      select: { id: true },
    });
    if (!existe) return codigo;
  }
  throw new Error("Não foi possível gerar um código de convite único.");
}

/** Converte o parâmetro de rota em número, ou 404. */
export function parseIdOrg(valor: string): number {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) notFound();
  return n;
}
