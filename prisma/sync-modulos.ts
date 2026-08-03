/**
 * Sincroniza o registry (`src/core/registry.ts`) com as tabelas `modulo` e
 * `calculadora`, para que todo módulo novo apareça sozinho na gestão do
 * superadmin.
 *
 * Uso: `npm run db:sync-modulos`
 *
 * Import relativo de propósito: o alias `@/` do tsconfig não é resolvido
 * quando o tsx roda scripts fora de `src/`.
 */
import { PrismaClient } from "@prisma/client";
import { sincronizarModulos } from "../src/core/sincronizar-modulos";

const prisma = new PrismaClient();

export async function main() {
  const r = await sincronizarModulos(prisma);
  console.log(
    `Módulos: ${r.modulos} sincronizados, ${r.modulosDesativados} desativados.`
  );
  console.log(
    `Calculadoras: ${r.calculadoras} sincronizadas, ${r.calculadorasDesativadas} desativadas.`
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
