/**
 * Sincroniza o registry de módulos (`src/core/registry.ts`) com as tabelas
 * `Modulo` e `Calculadora`, para que todo módulo novo apareça sozinho na
 * gestão do superadmin.
 *
 * Regra: **nunca apaga**. Módulo que sai do registry é marcado
 * `ativo = false`, preservando as licenças históricas que apontam para ele.
 *
 * Fase 0: stub. A implementação entra na Fase 2, junto com o schema.
 */
export async function main() {
  console.log(
    "Sincronização de módulos: registry ainda não existe (Fase 2)."
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
