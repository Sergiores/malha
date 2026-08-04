"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Tema = "claro" | "escuro" | "sistema";

const CHAVE = "malha-tema";

const OPCOES: Array<{ valor: Tema; rotulo: string; Icone: typeof Sun }> = [
  { valor: "claro", rotulo: "Claro", Icone: Sun },
  { valor: "escuro", rotulo: "Escuro", Icone: Moon },
  { valor: "sistema", rotulo: "Sistema", Icone: Monitor },
];

export function aplicarTema(tema: Tema) {
  const escuro =
    tema === "escuro" ||
    (tema === "sistema" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", escuro);
}

/**
 * Alternador de tema em três estados.
 *
 * A escolha fica em localStorage e é aplicada por um script inline no
 * `layout.tsx` ANTES da primeira pintura — sem isso, quem usa o tema escuro
 * vê um clarão branco a cada carregamento.
 */
export function AlternadorTema() {
  const [tema, setTema] = useState<Tema>("sistema");
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    const salvo = (localStorage.getItem(CHAVE) as Tema | null) ?? "sistema";
    setTema(salvo);
    setMontado(true);

    // Acompanha a troca no sistema operacional enquanto estiver em "sistema".
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const aoMudar = () => {
      if ((localStorage.getItem(CHAVE) as Tema | null) === "sistema") {
        aplicarTema("sistema");
      }
    };
    mq.addEventListener("change", aoMudar);
    return () => mq.removeEventListener("change", aoMudar);
  }, []);

  function escolher(novo: Tema) {
    localStorage.setItem(CHAVE, novo);
    setTema(novo);
    aplicarTema(novo);
  }

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border bg-background/60 p-0.5"
      role="group"
      aria-label="Tema"
    >
      {OPCOES.map(({ valor, rotulo, Icone }) => {
        // Antes de montar não sabemos o tema salvo; nada fica marcado, para
        // não piscar o estado errado.
        const ativo = montado && tema === valor;
        return (
          <button
            key={valor}
            type="button"
            onClick={() => escolher(valor)}
            title={rotulo}
            aria-label={rotulo}
            aria-pressed={ativo}
            className={cn(
              "rounded-md p-1.5 transition-all duration-200",
              ativo
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icone className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
