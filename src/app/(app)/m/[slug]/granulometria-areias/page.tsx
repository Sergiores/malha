import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireModulo } from "@/lib/modulo";
import { prisma } from "@/lib/prisma";
import { clientesParaSelecao } from "@/lib/cliente";
import { carregarParaFormulario } from "@/lib/carregar-para-form";
import { Button } from "@/components/ui/button";
import { FormGranulometria } from "./form-granulometria";

export default async function GranulometriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ editar?: string; copiar?: string }>;
}) {
  const { slug } = await params;
  const { modulo } = await requireModulo(slug);

  // A calculadora tem de pertencer a este módulo — impede abri-la por um
  // slug de módulo que o usuário licenciou mas que não a contém.
  const calc = await prisma.calculadora.findUnique({
    where: { slug: "granulometria-areias" },
    select: { idModulo: true, nome: true, descricao: true, ativa: true },
  });
  if (!calc || !calc.ativa || calc.idModulo !== modulo.id) notFound();

  const [clientes, pre] = await Promise.all([
    clientesParaSelecao(),
    carregarParaFormulario(await searchParams, "granulometria-areias"),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/m/${slug}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            {modulo.nome}
          </Button>
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{calc.nome}</h1>
        <p className="max-w-2xl text-muted-foreground">{calc.descricao}</p>
      </div>

      <FormGranulometria
        clientes={clientes}
        modo={pre?.modo}
        iniciais={pre?.iniciais}
        idClienteInicial={pre?.idCliente}
        parecerInicial={pre?.parecer}
        validadeInicial={pre?.validoAte}
      />
    </div>
  );
}
