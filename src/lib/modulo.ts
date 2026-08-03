import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { organizacaoPessoal } from "@/lib/organizacao";

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

/** Módulos do usuário logado, para o menu lateral e a home. */
export const meusModulos = cache(async function meusModulos() {
  const { organizacao } = await organizacaoPessoal();
  return modulosDaOrganizacao(organizacao.id);
});

/**
 * O GATE COMERCIAL.
 *
 * Exige licença vigente do módulo para o usuário logado. Roda no layout da
 * rota do módulo, então toda calculadora futura já nasce protegida — e é
 * repetido nas pages e em toda server action que execute algo dentro dele.
 * Esconder o item do menu não é controle de acesso.
 *
 * Falhas se comportam de dois jeitos, de propósito:
 *  - módulo inexistente ou desativado -> `notFound()`, não há o que contratar;
 *  - licença ausente, vencida ou revogada -> `/sem-acesso`, que explica o
 *    motivo. É cliente legítimo numa porta fechada, não invasor.
 */
export const requireModulo = cache(async function requireModulo(slug: string) {
  const { conta, organizacao } = await organizacaoPessoal();

  const modulo = await prisma.modulo.findUnique({
    where: { slug },
    include: { organizacoes: { where: { idOrganizacao: organizacao.id } } },
  });

  if (!modulo || !modulo.ativo) notFound();

  const situacao = situacaoDaLicenca(modulo.organizacoes[0]);
  if (situacao !== "vigente") {
    redirect(`/sem-acesso?modulo=${slug}&motivo=${situacao}`);
  }

  return { conta, organizacao, modulo, licenca: modulo.organizacoes[0] };
});
