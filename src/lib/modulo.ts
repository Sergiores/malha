import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMembroOrg } from "@/lib/organizacao";

/**
 * Leitura da situação das licenças e o gate comercial `requireModulo()`.
 */
export type SituacaoLicenca = "vigente" | "vencida" | "revogada" | "sem_licenca";

export type ModuloComLicenca = {
  id: number;
  slug: string;
  nome: string;
  descricao: string | null;
  situacao: SituacaoLicenca;
  validoDe: Date | null;
  validoAte: Date | null;
};

/** Hoje em UTC, zerado — as colunas de validade são `@db.Date`. */
export function hojeUtc(): Date {
  const agora = new Date();
  return new Date(
    Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate())
  );
}

/**
 * Situação de uma licença. `validoAte` nulo = sem prazo.
 * A comparação é inclusiva nos dois extremos: quem tem licença até hoje
 * ainda usa hoje.
 */
export function situacaoDaLicenca(
  licenca:
    | { ativo: boolean; validoDe: Date; validoAte: Date | null }
    | null
    | undefined
): SituacaoLicenca {
  if (!licenca) return "sem_licenca";
  if (!licenca.ativo) return "revogada";

  const hoje = hojeUtc();
  if (licenca.validoDe > hoje) return "vencida"; // ainda não começou
  if (licenca.validoAte && licenca.validoAte < hoje) return "vencida";
  return "vigente";
}

/** Todos os módulos ativos + a situação da licença desta organização. */
export async function modulosDaOrganizacao(
  idOrg: number
): Promise<ModuloComLicenca[]> {
  const modulos = await prisma.modulo.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
    include: {
      organizacoes: { where: { idOrganizacao: idOrg } },
    },
  });

  return modulos.map((m) => {
    const licenca = m.organizacoes[0];
    return {
      id: m.id,
      slug: m.slug,
      nome: m.nome,
      descricao: m.descricao,
      situacao: situacaoDaLicenca(licenca),
      validoDe: licenca?.validoDe ?? null,
      validoAte: licenca?.validoAte ?? null,
    };
  });
}

/**
 * O GATE COMERCIAL.
 *
 * Exige que a organização tenha licença vigente do módulo. Deve ser chamado
 * no layout do módulo, em cada page e no topo de toda server action que
 * execute algo dentro dele — esconder o link do menu não é controle de
 * acesso, e é por aqui que passa a receita do produto.
 *
 * Falhas se comportam de dois jeitos distintos, de propósito:
 *  - módulo inexistente ou desativado -> `notFound()`, porque não há o que
 *    contratar;
 *  - licença ausente, vencida ou revogada -> `/sem-acesso`, que explica o
 *    motivo e diz o que fazer. É cliente legítimo batendo numa porta
 *    fechada, não invasor.
 */
export const requireModulo = cache(async function requireModulo(
  idOrg: number,
  slug: string
) {
  const ctx = await requireMembroOrg(idOrg);

  const modulo = await prisma.modulo.findUnique({
    where: { slug },
    include: { organizacoes: { where: { idOrganizacao: idOrg } } },
  });

  if (!modulo || !modulo.ativo) notFound();

  const situacao = situacaoDaLicenca(modulo.organizacoes[0]);
  if (situacao !== "vigente") {
    redirect(`/o/${idOrg}/sem-acesso?modulo=${slug}&motivo=${situacao}`);
  }

  return { ...ctx, modulo, licenca: modulo.organizacoes[0] };
});
