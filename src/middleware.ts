import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Aplica em todas as rotas exceto:
     * - _next/static, _next/image
     * - favicon
     * - arquivos de imagem comuns
     *
     * ⚠️ NÃO estreite este matcher sem ler `usuarioDaRequisicao` em
     * src/lib/organizacao.ts. O middleware publica a identidade já
     * verificada em headers e, antes disso, apaga o que veio do cliente.
     * Uma rota de página que escape daqui receberia os headers do
     * requisitante sem essa limpeza — e o servidor confiaria neles.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
