/**
 * Seed do banco. Idempotente — pode rodar quantas vezes quiser.
 *
 * Roda automaticamente ao final de `prisma migrate dev` (bloco "prisma".seed
 * do package.json) e manualmente por `npm run db:seed`.
 *
 * Faz duas coisas:
 *  1. cria o superadmin a partir de SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD
 *     (a senha vai para o Supabase Auth, que guarda o hash; a Conta nasce
 *     com `trocarSenha = true`);
 *  2. sincroniza o registry de módulos com o banco.
 */
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { sincronizarModulos } from "../src/core/sincronizar-modulos";

const prisma = new PrismaClient();

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env."
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function semearSuperadmin() {
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.SUPERADMIN_PASSWORD;

  if (!email) {
    console.log("SUPERADMIN_EMAIL não definido — pulando superadmin.");
    return;
  }

  const admin = supabaseAdmin();

  // listUsers é paginado; procuramos o e-mail nas primeiras páginas.
  let authUserId: string | undefined;
  for (let page = 1; page <= 10 && !authUserId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw new Error(`Supabase listUsers: ${error.message}`);
    if (!data.users.length) break;
    authUserId = data.users.find(
      (u) => u.email?.toLowerCase() === email
    )?.id;
  }

  if (!authUserId) {
    if (!senha) {
      throw new Error(
        "Superadmin ainda não existe e SUPERADMIN_PASSWORD está vazio."
      );
    }
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true, // criado pelo dono do sistema; não precisa confirmar
      user_metadata: { nome: "Superadmin" },
    });
    if (error) throw new Error(`Supabase createUser: ${error.message}`);
    authUserId = data.user.id;
    console.log(`Superadmin criado no Auth: ${email}`);
  } else {
    console.log(`Superadmin já existe no Auth: ${email}`);
  }

  const conta = await prisma.conta.upsert({
    where: { authUserId },
    update: { email, ativa: true },
    // trocarSenha só na criação: não force de novo a cada seed.
    create: {
      authUserId,
      email,
      nome: "Superadmin",
      ativa: true,
      trocarSenha: true,
    },
  });
  console.log(`Conta do superadmin: id=${conta.id}`);
}

export async function main() {
  await semearSuperadmin();

  const r = await sincronizarModulos(prisma);
  console.log(
    `Módulos: ${r.modulos} sincronizados, ${r.modulosDesativados} desativados.`
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
