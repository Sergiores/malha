import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com a service_role key — **PRIVILEGIADO**.
 *
 * ⚠️ NUNCA importar isto em código que rode no browser. A chave equivale a
 * acesso administrativo total ao banco. Só deve ser usada em server actions
 * e route handlers já protegidos por `requireSuperadmin()`.
 *
 * Operações típicas:
 *   - admin.auth.admin.createUser({ email, password, email_confirm })
 *   - admin.auth.admin.updateUserById(id, { password })
 *   - admin.auth.admin.deleteUser(id)
 *   - admin.auth.admin.listUsers()
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase admin não configurado — defina SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
