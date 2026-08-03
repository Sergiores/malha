/**
 * `requireConta()` vive em `organizacao.ts` porque conta e organização são
 * lidas na mesma query — separá-las custaria um round-trip a mais por
 * navegação. Este arquivo existe só para manter o import histórico.
 */
export { requireConta, contaComOrganizacao } from "@/lib/organizacao";
