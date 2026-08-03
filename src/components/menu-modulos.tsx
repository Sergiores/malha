"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleSlash,
  FileText,
  LayoutDashboard,
  Lock,
  TimerOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

const GERAL = [
  { href: "/dashboard", rotulo: "Dashboard", Icone: LayoutDashboard },
  { href: "/analises", rotulo: "Análises", Icone: FileText },
];

export type ItemMenu = {
  slug: string;
  nome: string;
  liberado: boolean;
  situacao: "vigente" | "vencida" | "revogada" | "sem_licenca";
};

const BLOQUEIO = {
  vencida: { Icone: TimerOff, titulo: "Licença vencida" },
  revogada: { Icone: CircleSlash, titulo: "Licença revogada" },
  sem_licenca: { Icone: Lock, titulo: "Módulo não contratado" },
} as const;

export function MenuModulos({ itens }: { itens: ItemMenu[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {GERAL.map(({ href, rotulo, Icone }) => {
        const ativo = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              ativo
                ? "bg-primary/10 font-medium text-primary"
                : "hover:bg-accent"
            )}
          >
            <Icone className="h-4 w-4 shrink-0" />
            {rotulo}
          </Link>
        );
      })}

      <p className="px-3 pb-2 pt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Módulos
      </p>

      {itens.map((item) => {
        const href = `/m/${item.slug}`;
        const ativo = pathname === href || pathname.startsWith(`${href}/`);

        if (item.liberado) {
          return (
            <Link
              key={item.slug}
              href={href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm transition-colors",
                ativo
                  ? "bg-primary/10 font-medium text-primary"
                  : "hover:bg-accent"
              )}
            >
              {item.nome}
            </Link>
          );
        }

        // Bloqueado continua visível — o cliente precisa saber que o módulo
        // existe para querer contratá-lo. O clique leva à página que explica
        // o motivo, e requireModulo() barra quem digitar a URL.
        const b = BLOQUEIO[item.situacao as keyof typeof BLOQUEIO];
        return (
          <Link
            key={item.slug}
            href={`/sem-acesso?modulo=${item.slug}&motivo=${item.situacao}`}
            title={b?.titulo}
            className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent"
          >
            <span>{item.nome}</span>
            {b && <b.Icone className="h-3.5 w-3.5 shrink-0" />}
          </Link>
        );
      })}
    </nav>
  );
}
