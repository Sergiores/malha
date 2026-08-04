"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/modulo";
import { contaComOrganizacao } from "@/lib/organizacao";
import { clienteSchema, clienteComIdSchema } from "@/lib/validations/cliente";
import type { ActionState } from "@/app/(auth)/actions";

const MODULO = "geral";
const PATH = `/m/${MODULO}/clientes`;

function lerFormulario(formData: FormData) {
  const campos = [
    "nome",
    "cpfCnpj",
    "endereco",
    "bairro",
    "cidade",
    "uf",
    "cep",
    "fone",
    "email",
    "contato",
  ] as const;
  return Object.fromEntries(campos.map((c) => [c, formData.get(c) ?? ""]));
}

/** Campos nulos em vez de string vazia — "" e "sem informação" não são a
 *  mesma coisa, e o unique de cpfCnpj precisa de null para não colidir. */
function paraBanco(d: ReturnType<typeof clienteSchema.parse>) {
  return {
    nome: d.nome,
    cpfCnpj: d.cpfCnpj || null,
    endereco: d.endereco || null,
    bairro: d.bairro || null,
    cidade: d.cidade || null,
    uf: d.uf || null,
    cep: d.cep || null,
    fone: d.fone || null,
    email: d.email || null,
    contato: d.contato || null,
  };
}

export async function salvarCliente(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireModulo(MODULO);
  const { organizacao } = await contaComOrganizacao();

  const idBruto = formData.get("id");
  const editando = idBruto !== null && idBruto !== "";

  // Dois parses separados para o TypeScript conseguir estreitar o tipo: com
  // uma união, `parsed.data.id` fica `unknown` no ramo de edição.
  let idAlvo: number | null = null;
  if (editando) {
    const comId = clienteComIdSchema.safeParse({
      ...lerFormulario(formData),
      id: idBruto,
    });
    if (!comId.success) {
      return { error: comId.error.issues[0]?.message ?? "Dados inválidos." };
    }
    idAlvo = comId.data.id;
  }

  const parsed = clienteSchema.safeParse(lerFormulario(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const dados = paraBanco(parsed.data);

  try {
    if (idAlvo !== null) {
      // updateMany com filtro de organização: um id de outro cliente não
      // atinge nada em vez de atualizar o registro alheio.
      const r = await prisma.cliente.updateMany({
        where: { id: idAlvo, idOrganizacao: organizacao.id },
        data: dados,
      });
      if (r.count === 0) return { error: "Cliente não encontrado." };
    } else {
      await prisma.cliente.create({
        data: { ...dados, idOrganizacao: organizacao.id },
      });
    }
  } catch (e) {
    // Unique (organizacao, cpfCnpj) — o mesmo documento já está na carteira.
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { error: "Já existe um cliente com esse CPF/CNPJ." };
    }
    throw e;
  }

  revalidatePath(PATH);
  redirect(PATH);
}

export async function alternarAtivoCliente(formData: FormData): Promise<void> {
  await requireModulo(MODULO);
  const { organizacao } = await contaComOrganizacao();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const atual = await prisma.cliente.findFirst({
    where: { id, idOrganizacao: organizacao.id },
    select: { ativo: true },
  });
  if (!atual) return;

  // Soft-delete: as análises emitidas continuam apontando para o cliente.
  await prisma.cliente.updateMany({
    where: { id, idOrganizacao: organizacao.id },
    data: { ativo: !atual.ativo },
  });

  revalidatePath(PATH);
}
