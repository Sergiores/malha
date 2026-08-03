import { requireModulo } from "@/lib/modulo";

/**
 * Guard no layout do módulo: tudo que for criado sob esta rota — incluindo
 * cada calculadora futura — já nasce atrás do gate de licença.
 *
 * As pages e as server actions repetem a chamada; o `cache()` faz virar uma
 * consulta só por request.
 */
export default async function ModuloLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireModulo(slug);

  return <>{children}</>;
}
