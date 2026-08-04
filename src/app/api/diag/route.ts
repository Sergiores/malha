import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isSuperadmin } from "@/lib/superadmin";

/**
 * TEMPORÁRIO — medição de latência em produção.
 *
 * Só o superadmin acessa. Mede cada etapa de uma navegação autenticada para
 * saber onde o tempo vai, em vez de otimizar no escuro.
 *
 * Remover assim que o diagnóstico terminar.
 */
export const dynamic = "force-dynamic";

async function cronometrar<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const t0 = Date.now();
  const r = await fn();
  return [r, Date.now() - t0];
}

export async function GET() {
  const total0 = Date.now();

  const supabase = await createClient();
  const [auth, msAuth] = await cronometrar(() => supabase.auth.getUser());
  const user = auth.data.user;
  if (!user || !isSuperadmin(user.email)) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 404 });
  }

  const [, msAuth2] = await cronometrar(() => supabase.auth.getUser());

  const [conta, msConta] = await cronometrar(() =>
    prisma.conta.findUnique({
      where: { authUserId: user.id },
      include: {
        organizacoes: {
          take: 1,
          orderBy: { id: "asc" },
          include: { organizacao: true },
        },
      },
    })
  );

  const idOrg = conta?.organizacoes[0]?.idOrganizacao ?? 0;

  const [, msModulos] = await cronometrar(() =>
    prisma.modulo.findMany({
      where: { ativo: true },
      orderBy: { ordem: "asc" },
      include: { organizacoes: { where: { idOrganizacao: idOrg } } },
    })
  );

  const [, msCalcs] = await cronometrar(() =>
    prisma.calculadora.findMany({
      where: { ativa: true, modulo: { ativo: true } },
      orderBy: { ordem: "asc" },
      select: { slug: true, nome: true, modulo: { select: { slug: true } } },
    })
  );

  const [, msPing] = await cronometrar(() => prisma.$queryRaw`SELECT 1`);

  return NextResponse.json({
    regiao: process.env.AWS_REGION ?? process.env.NETLIFY_REGION ?? "?",
    ms: {
      authGetUser_1a: msAuth,
      authGetUser_2a: msAuth2,
      queryConta: msConta,
      queryModulos: msModulos,
      queryCalculadoras: msCalcs,
      pingBanco: msPing,
      total: Date.now() - total0,
    },
  });
}
