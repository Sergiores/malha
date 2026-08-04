"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Blocks,
  CircleSlash,
  FlaskConical,
  Frame,
  LayoutDashboard,
  Lock,
  Settings2,
  TimerOff,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const GERAL = [
  { href: "/dashboard", rotulo: "Dashboard", Icone: LayoutDashboard },
];

/**
 * Ícone por módulo. Dá identidade visual a cada área e ajuda a achar o item
 * pelo formato antes de ler o texto — o menu é usado dezenas de vezes ao dia.
 */
const ICONE_MODULO: Record<string, LucideIcon> = {
  geral: Settings2,
  "estrutura-concreto": Blocks,
  "estrutura-metalica": Frame,
  "concreto-fresco-endurecido": FlaskConical,
};

export type SubItem = { href: string; rotulo: string };

export type ItemMenu = {
  slug: string;
  nome: string;
  liberado: boolean;
  situacao: "vigente" | "vencida" | "revogada" | "sem_licenca";
  filhos: SubItem[];
};

const BLOQUEIO = {
  vencida: { Icone: TimerOff, titulo: "Licença vencida" },
  revogada: { Icone: CircleSlash, titulo: "Licença revogada" },
  sem_licenca: { Icone: Lock, titulo: "Módulo não contratado" },
} as const;

export function MenuModulos({ itens }: { itens: ItemMenu[] }) {
  const pathname = usePathname();
  const ativo = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="space-y-1">
      {GERAL.map(({ href, rotulo, Icone }) => (
        <ItemPrincipal
          key={href}
          href={href}
          rotulo={rotulo}
          Icone={Icone}
          ativo={ativo(href)}
        />
      ))}

      <Cabecalho>Módulos</Cabecalho>

      {itens.map((item, i) => {
        const href = `/m/${item.slug}`;
        const Icone = ICONE_MODULO[item.slug] ?? Blocks;

        if (!item.liberado) {
          // Bloqueado continua visível — o cliente precisa saber que o módulo
          // existe para querer contratá-lo.
          const b = BLOQUEIO[item.situacao as keyof typeof BLOQUEIO];
          return (
            <Link
              key={item.slug}
              href={`/sem-acesso?modulo=${item.slug}&motivo=${item.situacao}`}
              title={b?.titulo}
              style={{ animationDelay: `${i * 40}ms` }}
              className="surgir group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground/70 transition-colors hover:bg-muted/60 hover:text-muted-foreground"
            >
              <Icone className="h-4 w-4 shrink-0 opacity-50" />
              <span className="flex-1 leading-tight">{item.nome}</span>
              {b && <b.Icone className="h-3.5 w-3.5 shrink-0 opacity-60" />}
            </Link>
          );
        }

        return (
          <div
            key={item.slug}
            className="surgir"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <ItemPrincipal
              href={href}
              rotulo={item.nome}
              Icone={Icone}
              ativo={pathname === href}
            />

            {item.filhos.length > 0 && (
              <div className="relative ml-[1.35rem] mt-0.5 space-y-0.5 pl-3">
                {/* Linha de conexão, como chamada de cota. */}
                <span
                  aria-hidden
                  className="absolute left-0 top-0 h-full w-px bg-border"
                />
                {item.filhos.map((f) => {
                  const on = ativo(f.href);
                  return (
                    <Link
                      key={f.href}
                      href={f.href}
                      className={cn(
                        "varredura relative block rounded-md px-3 py-1.5 text-sm transition-all duration-200",
                        on
                          ? "font-medium text-primary"
                          : "text-muted-foreground hover:translate-x-0.5 hover:text-foreground"
                      )}
                    >
                      {/* Marcador do item ativo. */}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute -left-3 top-1/2 h-4 w-px -translate-y-1/2 bg-primary transition-opacity duration-200",
                          on ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {f.rotulo}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function Cabecalho({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 px-3 pb-1.5 pt-5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
      {children}
      <span className="h-px flex-1 bg-border" />
    </p>
  );
}

function ItemPrincipal({
  href,
  rotulo,
  Icone,
  ativo,
}: {
  href: string;
  rotulo: string;
  Icone: LucideIcon;
  ativo: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "varredura group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200",
        ativo
          ? "bg-primary/10 font-medium text-primary"
          : "hover:translate-x-0.5 hover:bg-muted/70"
      )}
    >
      {/* Barra do item ativo, à esquerda. */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1/2 w-0.5 -translate-y-1/2 rounded-r bg-primary transition-all duration-300",
          ativo ? "h-5 opacity-100" : "h-0 opacity-0"
        )}
      />
      <Icone
        className={cn(
          "h-4 w-4 shrink-0 transition-transform duration-200",
          ativo ? "text-primary" : "group-hover:scale-110"
        )}
      />
      {/* Sem `truncate`: "Concreto Fresco/Endurecido" não cabe numa linha e
          virava "Concreto Fresco/Endur…", que não identifica o módulo. */}
      <span className="leading-tight">{rotulo}</span>
    </Link>
  );
}
