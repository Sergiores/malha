import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  HEADER_USER_ID,
  HEADER_USER_EMAIL,
} from "@/lib/supabase/middleware";
import { prisma } from "@/lib/prisma";
import { gerarCodigoConvite } from "@/lib/utils";

/**
 * Usuário da requisição atual.
 *
 * O middleware já validou o token contra o Supabase e publicou a identidade
 * em headers que ele mesmo reescreve — nada que venha do cliente sobrevive
 * ali. Reaproveitar isso evita uma segunda chamada de rede que custava
 * ~450 ms em produção, com as funções em Ohio e o Auth em São Paulo.
 *
 * O `getUser()` continua como caminho alternativo para quando o header não
 * existir (rota fora do matcher do middleware, por exemplo): mais lento,
 * porém correto.
 */
const usuarioDaRequisicao = cache(async function usuarioDaRequisicao() {
  const h = await headers();
  const id = h.get(HEADER_USER_ID);
  if (id) {
    return { id, email: h.get(HEADER_USER_EMAIL) ?? undefined };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email } : null;
});

/**
 * Conta + organização do usuário logado, em UMA query.
 *
 * Antes eram três round-trips em série (conta → vínculo → organização). Com o
 * banco em sa-east-1 e as funções fora da região, cada um custa ~150 ms — o
 * que dominava o tempo de navegação. O `include` resolve tudo num LATERAL
 * JOIN (`relationJoins` no schema).
 *
 * Hoje o sistema é monousuário: cada conta tem uma organização própria,
 * criada sob demanda e invisível na interface. A licença continua morando em
 * `Organizacao`, então ligar o multiusuário depois é reativar telas — não
 * migrar dados.
 *
 * A organização vem SEMPRE da sessão, nunca de parâmetro do usuário. Quando o
 * multiusuário voltar, o `idOrg` volta para a URL e os guards de membro
 * voltam junto.
 */
export const contaComOrganizacao = cache(async function contaComOrganizacao() {
  const user = await usuarioDaRequisicao();
  if (!user) redirect("/login");

  const conta = await prisma.conta.findUnique({
    where: { authUserId: user.id },
    include: {
      organizacoes: {
        take: 1,
        orderBy: { id: "asc" },
        include: { organizacao: true },
      },
    },
  });

  // Conta inexistente: caminho frio, só na primeira visita e em usuários
  // criados por fora (Admin API, seed). Aqui vale pagar a chamada extra ao
  // Auth para pegar o nome do metadata.
  if (!conta) return criarContaEOrganizacao(user.id, user.email);

  if (!conta.ativa) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login?error=conta_inativa");
  }
  if (conta.trocarSenha) redirect("/redefinir-senha");

  const organizacao = conta.organizacoes[0]?.organizacao;
  if (!organizacao) {
    return {
      user,
      conta,
      organizacao: await criarOrganizacaoPara(conta.id, conta.nome ?? conta.email),
    };
  }

  return { user, conta, organizacao };
});

/** Compatibilidade: quem só precisa do perfil. */
export const requireConta = cache(async function requireConta() {
  const { user, conta } = await contaComOrganizacao();
  return { user, conta };
});

/** Só a organização — usada pelo gate de módulo. */
export const organizacaoPessoal = cache(async function organizacaoPessoal() {
  const { conta, organizacao } = await contaComOrganizacao();
  return { conta, organizacao };
});

async function criarContaEOrganizacao(
  authUserId: string,
  email: string | undefined
) {
  // Caminho frio: só aqui buscamos o usuário completo, para aproveitar o
  // nome que veio do cadastro.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const nome = user?.user_metadata?.nome;

  const conta = await prisma.conta.create({
    data: {
      authUserId,
      email,
      nome: typeof nome === "string" ? nome : null,
    },
    include: { organizacoes: { include: { organizacao: true } } },
  });
  const organizacao = await criarOrganizacaoPara(
    conta.id,
    conta.nome ?? conta.email
  );
  return {
    user: { id: authUserId, email },
    conta,
    organizacao,
  };
}

/** Módulos que toda organização recebe ao nascer, sem prazo. */
const MODULOS_BASE = ["geral"];

async function criarOrganizacaoPara(idConta: number, nome: string | null) {
  // Transação: organização sem dono seria órfã e invisível no painel.
  return prisma.$transaction(async (tx) => {
    const criada = await tx.organizacao.create({
      data: {
        nome: nome ?? `Conta ${idConta}`,
        codigoConvite: await gerarCodigoUnico(tx),
      },
    });
    await tx.organizacaoMembro.create({
      data: { idOrganizacao: criada.id, idConta, papel: "ADMIN" },
    });

    // "Geral" é infraestrutura, não produto: sem a carteira de clientes as
    // análises perdem a identificação. Vem liberado e sem prazo — o
    // superadmin ainda pode revogar se quiser.
    const base = await tx.modulo.findMany({
      where: { slug: { in: MODULOS_BASE }, ativo: true },
      select: { id: true },
    });
    const hoje = new Date();
    for (const m of base) {
      await tx.organizacaoModulo.create({
        data: {
          idOrganizacao: criada.id,
          idModulo: m.id,
          validoDe: new Date(
            Date.UTC(
              hoje.getUTCFullYear(),
              hoje.getUTCMonth(),
              hoje.getUTCDate()
            )
          ),
          validoAte: null,
          observacao: "Módulo base, liberado na criação da organização",
        },
      });
    }

    return criada;
  });
}

/** Código único. Sobra do modelo de convite; volta a ter uso no multiusuário. */
async function gerarCodigoUnico(
  tx: Pick<typeof prisma, "organizacao">
): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const codigo = gerarCodigoConvite();
    const existe = await tx.organizacao.findUnique({
      where: { codigoConvite: codigo },
      select: { id: true },
    });
    if (!existe) return codigo;
  }
  throw new Error("Não foi possível gerar um código único.");
}
