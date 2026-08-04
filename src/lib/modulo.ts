import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { contaComOrganizacao } from "@/lib/organizacao";

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
 * Módulos do usuário logado. Usada pelo menu lateral, pela home e pelo gate —
 * o `cache()` garante uma consulta só por request, mesmo com os três
 * chamando.
 */
export const meusModulos = cache(async function meusModulos() {
  const { organizacao } = await contaComOrganizacao();
  return modulosDaOrganizacao(organizacao.id);
});

/**
 * Calculadoras ativas, agrupadas por módulo. O menu lateral usa para montar
 * os sub-itens de cada módulo liberado.
 */
export const calculadorasPorModulo = cache(
  async function calculadorasPorModulo() {
    const calcs = await prisma.calculadora.findMany({
      where: { ativa: true, modulo: { ativo: true } },
      orderBy: { ordem: "asc" },
      select: { slug: true, nome: true, modulo: { select: { slug: true } } },
    });

    const mapa = new Map<string, { slug: string; nome: string }[]>();
    for (const c of calcs) {
      const lista = mapa.get(c.modulo.slug) ?? [];
      lista.push({ slug: c.slug, nome: c.nome });
      mapa.set(c.modulo.slug, lista);
    }
    return mapa;
  }
);

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
  // Reaproveita a lista que o layout já carregou para montar o menu — o
  // `cache()` de `meusModulos()` faz o gate custar ZERO query adicional.
  const modulos = await meusModulos();
  const modulo = modulos.find((m) => m.slug === slug);

  if (!modulo) notFound();

  if (modulo.situacao !== "vigente") {
    redirect(`/sem-acesso?modulo=${slug}&motivo=${modulo.situacao}`);
  }

  return { modulo };
});
