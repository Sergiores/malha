import Link from "next/link";
import { CircleSlash, Lock, TimerOff } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { organizacaoPessoal } from "@/lib/organizacao";
import { dataBr } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MOTIVOS = {
  vencida: {
    titulo: "Licença vencida",
    texto:
      "O prazo de uso deste módulo terminou. Fale com o administrador do sistema para renovar.",
    Icone: TimerOff,
  },
  revogada: {
    titulo: "Licença revogada",
    texto:
      "O acesso a este módulo foi suspenso pelo administrador do sistema.",
    Icone: CircleSlash,
  },
  sem_licenca: {
    titulo: "Módulo não contratado",
    texto:
      "Você ainda não tem licença para este módulo. Fale com o administrador do sistema para contratá-lo.",
    Icone: Lock,
  },
} as const;

type Motivo = keyof typeof MOTIVOS;

export default async function SemAcessoPage({
  searchParams,
}: {
  searchParams: Promise<{ modulo?: string; motivo?: string }>;
}) {
  const { organizacao } = await organizacaoPessoal();
  const { modulo: slug, motivo } = await searchParams;

  const chave: Motivo =
    motivo && motivo in MOTIVOS ? (motivo as Motivo) : "sem_licenca";
  const m = MOTIVOS[chave];

  // O nome do módulo vem do banco, não da URL — o parâmetro é do usuário.
  const modulo = slug
    ? await prisma.modulo.findUnique({
        where: { slug },
        select: {
          nome: true,
          organizacoes: {
            where: { idOrganizacao: organizacao.id },
            select: { validoAte: true },
          },
        },
      })
    : null;

  const validoAte = modulo?.organizacoes[0]?.validoAte ?? null;

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <m.Icone className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">{m.titulo}</CardTitle>
          <CardDescription>
            {modulo?.nome ? `Módulo: ${modulo.nome}` : "Módulo não encontrado"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{m.texto}</p>
          {chave === "vencida" && validoAte && (
            <p className="rounded-md bg-muted px-3 py-2 text-sm">
              Vigência encerrada em <strong>{dataBr(validoAte)}</strong>.
            </p>
          )}
          <Link href="/app">
            <Button variant="outline">Voltar ao início</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
