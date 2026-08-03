import { prisma } from "@/lib/prisma";

/**
 * Situação de uma licença de módulo para uma organização.
 *
 * O gate propriamente dito — `requireModulo()` — entra na Fase 5. Aqui fica
 * só a leitura, usada pelo painel para mostrar o que está vigente.
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
