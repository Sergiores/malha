import { PrismaClient } from "@prisma/client";
import { MODULOS } from "./registry";

/**
 * Espelha o registry nas tabelas `modulo` e `calculadora`.
 *
 * Regra central: **nunca apaga**. O que sai do registry é marcado
 * `ativo = false`. Apagar quebraria as licenças (`organizacao_modulo`) que
 * apontam para o módulo e destruiria o histórico de quem comprou o quê.
 *
 * Idempotente: rodar duas vezes seguidas não muda nada.
 *
 * Recebe o client por parâmetro para servir tanto ao seed (que tem o seu)
 * quanto ao app.
 */
export async function sincronizarModulos(prisma: PrismaClient) {
  const slugsDoRegistry = MODULOS.map((m) => m.slug);
  const slugsCalcDoRegistry = MODULOS.flatMap((m) =>
    m.calculadoras.map((c) => c.slug)
  );

  for (const [i, def] of MODULOS.entries()) {
    const modulo = await prisma.modulo.upsert({
      where: { slug: def.slug },
      update: {
        nome: def.nome,
        descricao: def.descricao ?? null,
        ordem: i,
        ativo: true, // reativa se voltou ao registry
      },
      create: {
        slug: def.slug,
        nome: def.nome,
        descricao: def.descricao ?? null,
        ordem: i,
      },
    });

    for (const [j, calc] of def.calculadoras.entries()) {
      await prisma.calculadora.upsert({
        where: { slug: calc.slug },
        update: {
          idModulo: modulo.id,
          nome: calc.nome,
          descricao: calc.descricao ?? null,
          ordem: j,
          ativa: true,
        },
        create: {
          idModulo: modulo.id,
          slug: calc.slug,
          nome: calc.nome,
          descricao: calc.descricao ?? null,
          ordem: j,
        },
      });
    }
  }

  // Some do registry -> desativa, não apaga.
  const modulosDesativados = await prisma.modulo.updateMany({
    where: { slug: { notIn: slugsDoRegistry }, ativo: true },
    data: { ativo: false },
  });
  const calcsDesativadas = await prisma.calculadora.updateMany({
    where: { slug: { notIn: slugsCalcDoRegistry }, ativa: true },
    data: { ativa: false },
  });

  return {
    modulos: MODULOS.length,
    calculadoras: slugsCalcDoRegistry.length,
    modulosDesativados: modulosDesativados.count,
    calculadorasDesativadas: calcsDesativadas.count,
  };
}
