import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/modulo";
import { Button } from "@/components/ui/button";
import { ClienteForm } from "../cliente-form";

export default async function NovoClientePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { modulo } = await requireModulo(slug);

  const calc = await prisma.calculadora.findUnique({
    where: { slug: "clientes" },
    select: { idModulo: true, ativa: true },
  });
  if (!calc || !calc.ativa || calc.idModulo !== modulo.id) notFound();

  const base = `/m/${slug}/clientes`;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link href={base}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Clientes
          </Button>
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Novo cliente
        </h1>
      </div>

      <ClienteForm
        voltarPara={base}
        valores={{
          nome: "",
          cpfCnpj: "",
          endereco: "",
          bairro: "",
          cidade: "",
          uf: "",
          cep: "",
          fone: "",
          email: "",
          contato: "",
        }}
      />
    </div>
  );
}
