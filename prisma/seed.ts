/**
 * Seed do banco.
 *
 * Roda automaticamente ao final de `prisma migrate dev` (via o bloco
 * "prisma".seed do package.json) e manualmente por `npm run db:seed`.
 *
 * Fase 0: não há modelos ainda — este arquivo existe para que a primeira
 * migration não falhe procurando um seed inexistente.
 *
 * Fase 2 passa a: criar o superadmin (SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD
 * via Supabase Admin API) e chamar sincronizarModulos().
 */
export async function main() {
  console.log("Seed: nada a semear ainda (modelos entram na Fase 2).");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
