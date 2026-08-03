import Link from "next/link";
import { ArrowLeft, Calculator, PackageCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { parseIdOrg } from "@/lib/organizacao";
import { requireModulo } from "@/lib/modulo";
import { dataBr } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ModuloPage({
  params,
}: {
  params: Promise<{ idOrg: string; slug: string }>;
}) {
  const { idOrg, slug } = await params;
  const id = parseIdOrg(idOrg);
  const { modulo, licenca } = await requireModulo(id, slug);

  const calculadoras = await prisma.calculadora.findMany({
    where: { idModulo: modulo.id, ativa: true },
    orderBy: { ordem: "asc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/o/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Módulos
          </Button>
        </Link>
        <h2 className="mt-2 text-lg font-semibold">{modulo.nome}</h2>
        <p className="text-sm text-muted-foreground">{modulo.descricao}</p>
        <p className="mt-1 inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          <PackageCheck className="h-3 w-3" />
          {licenca?.validoAte
            ? `Liberado até ${dataBr(licenca.validoAte)}`
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
            <Link key={c.id} href={`/o/${id}/m/${slug}/${c.slug}`}>
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
