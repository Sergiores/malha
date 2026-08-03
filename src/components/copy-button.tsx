"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyButton({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }}
    >
      {copiado ? (
        <>
          <Check className="h-4 w-4" />
          Copiado
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          Copiar
        </>
      )}
    </Button>
  );
}
