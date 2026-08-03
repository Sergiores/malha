import Link from "next/link";
import { Building2, LogIn, Plus, ShieldCheck } from "lucide-react";
import { requireConta } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AppHome() {
  const { conta } = await requireConta();

  const vinculos = await prisma.organizacaoMembro.findMany({
    where: { idConta: conta.id, organizacao: { ativa: true } },
    include: {
      organizacao: {
        include: { _count: { select: { membros: true } } },
      },
    },
    orderBy: { organizacao: { nome: "asc" } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Olá, {conta.nome ?? "engenheiro"}
          </h1>
          <p className="text-muted-foreground">
            Escolha uma organização para acessar os módulos.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/organizacoes/entrar">
            <Button variant="outline" size="sm">
              <LogIn className="h-4 w-4" />
              Entrar com código
            </Button>
          </Link>
          <Link href="/organizacoes/nova">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Nova organização
            </Button>
          </Link>
        </div>
      </div>

      {vinculos.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-primary" />
              Nenhuma organização ainda
            </CardTitle>
            <CardDescription>
              Crie a sua ou entre em uma existente com o código de convite.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {vinculos.map((v) => (
            <Link key={v.id} href={`/o/${v.organizacao.id}`}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-5 w-5 text-primary" />
                    {v.organizacao.nome}
                  </CardTitle>
                  <CardDescription>
                    {v.organizacao._count.membros}{" "}
                    {v.organizacao._count.membros === 1 ? "membro" : "membros"}
                  </CardDescription>
                </CardHeader>
                {v.papel === "ADMIN" && (
                  <CardContent>
                    <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <ShieldCheck className="h-3 w-3" />
                      Administrador
                    </span>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
