import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { gerarCodigoConvite } from "@/lib/utils";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  // Conta inexistente ou sem organização: caminho frio, só na primeira visita
  // e em usuários criados por fora (Admin API, seed).
  if (!conta) return criarContaEOrganizacao(user.id, user.email, user.user_metadata?.nome);

  if (!conta.ativa) {
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
  email: string | undefined,
  nome: unknown
) {
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user: user!, conta, organizacao };
}

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
