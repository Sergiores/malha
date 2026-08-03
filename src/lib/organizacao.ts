import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { requireConta } from "@/lib/auth";
import { gerarCodigoConvite } from "@/lib/utils";

/**
 * Organização do usuário logado.
 *
 * Hoje o sistema é monousuário: cada conta tem uma organização própria,
 * criada sob demanda e invisível na interface. A licença continua morando
 * em `Organizacao` — é o que permite ligar o multiusuário depois apenas
 * reativando as telas de membros, sem migrar dado nenhum.
 *
 * A organização vem SEMPRE da sessão, nunca de parâmetro do usuário. Quando
 * o multiusuário voltar, o `idOrg` volta para a URL e os guards de membro
 * voltam junto — aí a distinção passa a importar de novo.
 */
export const organizacaoPessoal = cache(async function organizacaoPessoal() {
  const { conta } = await requireConta();

  const vinculo = await prisma.organizacaoMembro.findFirst({
    where: { idConta: conta.id },
    include: { organizacao: true },
    orderBy: { id: "asc" },
  });

  if (vinculo) return { conta, organizacao: vinculo.organizacao };

  // Primeira visita: cria a organização junto com o vínculo, em transação —
  // organização sem dono seria órfã e invisível para o superadmin.
  const organizacao = await prisma.$transaction(async (tx) => {
    const criada = await tx.organizacao.create({
      data: {
        nome: conta.nome ?? conta.email ?? `Conta ${conta.id}`,
        codigoConvite: await gerarCodigoUnico(tx),
      },
    });
    await tx.organizacaoMembro.create({
      data: {
        idOrganizacao: criada.id,
        idConta: conta.id,
        papel: "ADMIN",
      },
    });
    return criada;
  });

  return { conta, organizacao };
});

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
