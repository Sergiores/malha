import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Rotas públicas (não exigem sessão).
 *
 * Atenção: este middleware só decide "tem sessão ou não". Toda autorização
 * real — superadmin, membro de organização, licença de módulo — vive nos
 * guards de `src/lib/`, chamados dentro dos layouts, pages e server actions.
 */
const ROTAS_PUBLICAS = [
  "/login",
  "/cadastro",
  "/recuperar-senha",
  "/redefinir-senha",
  "/auth",
];

/**
 * Header em que o middleware publica a identidade já verificada, para o
 * Server Component não precisar validar o token de novo.
 *
 * O nome tem prefixo próprio e o valor é SEMPRE reescrito abaixo — nunca
 * confie no que veio do cliente, senão qualquer um se passa por outro
 * usuário mandando o header na requisição.
 */
export const HEADER_USER_ID = "x-malha-user-id";
export const HEADER_USER_EMAIL = "x-malha-user-email";

export async function updateSession(request: NextRequest) {
  // Começa limpando o que o cliente possa ter mandado.
  const headers = new Headers(request.headers);
  headers.delete(HEADER_USER_ID);
  headers.delete(HEADER_USER_EMAIL);

  let supabaseResponse = NextResponse.next({ request: { headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request: { headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Identidade já validada pelo Supabase — repassa para o Server Component
  // não gastar outra chamada de rede confirmando o mesmo token.
  if (user) {
    headers.set(HEADER_USER_ID, user.id);
    if (user.email) headers.set(HEADER_USER_EMAIL, user.email);
    supabaseResponse = NextResponse.next({ request: { headers } });
  }

  const { pathname } = request.nextUrl;
  const ehPublica =
    pathname === "/" || ROTAS_PUBLICAS.some((r) => pathname.startsWith(r));

  // Sem sessão em rota protegida -> login.
  if (!user && !ehPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Logado tentando abrir login/cadastro -> app.
  if (
    user &&
    (pathname.startsWith("/login") || pathname.startsWith("/cadastro"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
