"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * `<select>` que sobrevive ao formulário com server action.
 *
 * 🚨 O React 19 chama `form.reset()` quando a action termina. Para `<input>` e
 * `<textarea>` isso é inofensivo — o React mantém o atributo em dia e o reset
 * devolve o mesmo valor. O `<select>` controlado não ganha `selected` em
 * nenhuma `<option>`, então o reset volta para a primeira opção. E como o
 * estado do React continuava correto, ele não via diferença para reaplicar: a
 * tela mostrava um valor que o DOM já não tinha, e o submit seguinte mandava
 * o valor errado.
 *
 * Isso já custou análises salvas sem cliente. O `useEffect` sem dependências
 * reafirma o valor no DOM a cada commit, inclusive nos que só o reset
 * provocou — e é por isso que ele não tem lista de dependências.
 *
 * As cores também não são detalhe: a lista aberta é desenhada pelo sistema
 * operacional. Com `bg-transparent`, no tema escuro o Windows pinta o popup
 * de branco e o texto herda o `--foreground` quase branco.
 */
export function SelectCampo({
  id,
  name,
  value,
  onChange,
  children,
  className = "",
  required = false,
  "aria-label": ariaLabel,
}: {
  id?: string;
  name: string;
  value: string;
  onChange: (valor: string) => void;
  children: ReactNode;
  className?: string;
  required?: boolean;
  "aria-label"?: string;
}) {
  const ref = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.value !== value) ref.current.value = value;
  });

  return (
    <select
      ref={ref}
      id={id}
      name={name}
      value={value}
      required={required}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${className}`}
    >
      {children}
    </select>
  );
}
