import { cache } from "react";
import { notFound } from "next/navigation";
import { contaComOrganizacao } from "@/lib/organizacao";

/**
 * E-mail com acesso a /superadmin.
 *
 * Vem do ambiente, não hard-coded: é produto vendido e trocar o dono do
 * sistema não deveria exigir deploy.
 */
export const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? "";

export function isSuperadmin(email: string | null | undefined): boolean {
  if (!SUPERADMIN_EMAIL) return false;
  return email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
}

/**
 * Exige o superadmin. Sem sessão -> /login. Outro usuário -> notFound(),
 * que não confirma sequer que a rota existe.
 */
export const requireSuperadmin = cache(async function requireSuperadmin() {
  // Reaproveita a identidade que o middleware já validou — ver
  // `usuarioDaRequisicao` em src/lib/organizacao.ts.
  const { user } = await contaComOrganizacao();

  if (!isSuperadmin(user.email)) notFound();

  // `contaComOrganizacao` já barrou conta inativa e troca de senha pendente:
  // o painel que controla o licenciamento de todos os clientes é o último
  // lugar onde abrir exceção a essas regras.
  return { user };
});
