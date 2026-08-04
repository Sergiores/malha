/**
 * Libera os módulos base para as organizações que já existem.
 *
 * Organizações novas recebem isso sozinhas em `organizacaoPessoal()`; este
 * script existe para as que nasceram antes do módulo Geral. Idempotente.
 *
 * Uso: npm run db:liberar-base
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const MODULOS_BASE = ["geral"];

async function main() {
  const modulos = await prisma.modulo.findMany({
    where: { slug: { in: MODULOS_BASE }, ativo: true },
    select: { id: true, slug: true, nome: true },
  });
  if (modulos.length === 0) {
    console.log("Nenhum módulo base encontrado — rode db:sync-modulos antes.");
    return;
  }

  const orgs = await prisma.organizacao.findMany({ select: { id: true, nome: true } });
  const hoje = new Date();
  const validoDe = new Date(
    Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate())
  );

  let criadas = 0;
  for (const org of orgs) {
    for (const m of modulos) {
      const existe = await prisma.organizacaoModulo.findUnique({
        where: {
          idOrganizacao_idModulo: { idOrganizacao: org.id, idModulo: m.id },
        },
        select: { id: true },
      });
      if (existe) continue;

      await prisma.organizacaoModulo.create({
        data: {
          idOrganizacao: org.id,
          idModulo: m.id,
          validoDe,
          validoAte: null,
          observacao: "Módulo base, liberado retroativamente",
        },
      });
      criadas++;
      console.log(`${org.nome}: ${m.nome} liberado`);
    }
  }

  console.log(
    criadas === 0
      ? "Nada a fazer — todas as organizações já tinham os módulos base."
      : `${criadas} licença(s) criada(s).`
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
