import Link from "next/link";
import { Calculator, PackageCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/modulo";
import { dataBr } from "@/lib/utils";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ModuloPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { modulo } = await requireModulo(slug);

  const calculadoras = await prisma.calculadora.findMany({
    where: { idModulo: modulo.id, ativa: true },
    orderBy: { ordem: "asc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{modulo.nome}</h1>
        <p className="text-muted-foreground">{modulo.descricao}</p>
        <p className="mt-2 inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          <PackageCheck className="h-3 w-3" />
          {modulo.validoAte
            ? `Liberado até ${dataBr(modulo.validoAte)}`
            : "Liberado, sem prazo"}
        </p>
      </div>

      {calculadoras.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-5 w-5 text-muted-foreground" />
              Nenhuma calculadora ainda
            </CardTitle>
            <CardDescription>
              As calculadoras deste módulo entram em uma fase seguinte.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {calculadoras.map((c) => (
            <Link key={c.id} href={`/m/${slug}/${c.slug}`}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calculator className="h-5 w-5 text-primary" />
                    {c.nome}
                  </CardTitle>
                  <CardDescription>{c.descricao}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
