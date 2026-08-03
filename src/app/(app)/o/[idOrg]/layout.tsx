import Link from "next/link";
import { Building2, Users } from "lucide-react";
import { requireMembroOrg, parseIdOrg } from "@/lib/organizacao";

/**
 * Guard no layout: toda rota sob /o/[idOrg] já nasce protegida. As pages e
 * as actions repetem o guard — o `cache()` faz virar uma consulta só.
 */
export default async function OrganizacaoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ idOrg: string }>;
}) {
  const { idOrg } = await params;
  const id = parseIdOrg(idOrg);
  const { organizacao, papel } = await requireMembroOrg(id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {organizacao.nome}
            </h1>
            <p className="text-xs text-muted-foreground">
              {papel === "ADMIN" ? "Administrador" : "Membro"}
            </p>
          </div>
        </div>
        <nav className="flex gap-1 text-sm">
          <Link
            href={`/o/${id}`}
            className="rounded-md px-3 py-1.5 hover:bg-accent"
          >
            Módulos
          </Link>
          <Link
            href={`/o/${id}/membros`}
            className="flex items-center gap-1 rounded-md px-3 py-1.5 hover:bg-accent"
          >
            <Users className="h-4 w-4" />
            Membros
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
