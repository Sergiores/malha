import { dataBr } from "@/lib/utils";

/**
 * Resumo da análise para envio por WhatsApp.
 *
 * Vai o texto, não um link: o laudo completo exige login, e mandar uma URL
 * que o cliente não consegue abrir é pior do que não mandar nada. O que ele
 * precisa para trabalhar — traço, consumo, enquadramento, validade e o
 * parecer — cabe na mensagem.
 *
 * A conferência formal continua sendo o PDF impresso, e o texto diz isso.
 */

type Material = { nome: string; consumo: number; traco: number };

type ResumoDosagem = {
  tracoUnitario?: string;
  custoTotal?: number;
  materiais?: Material[];
};

type ResumoGranulometria = {
  moduloFinuraMescla?: number;
  enquadramento?: string;
  diametroMaximo?: number;
};

const ENQUADRAMENTO: Record<string, string> = {
  otima: "zona ótima (NBR 7211)",
  utilizavel: "zona utilizável (NBR 7211)",
  fora: "FORA da zona utilizável (NBR 7211)",
};

function num(v: number, casas = 2) {
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function textoWhatsApp(a: {
  id: number;
  titulo: string;
  calculadoraSlug: string;
  calculadoraNome: string;
  clienteNome: string | null;
  parecer: string | null;
  validoAte: Date | null;
  aprovadaEm: Date | null;
  resultados: unknown;
}): string {
  const L: string[] = [];

  L.push(`*${a.titulo}*`);
  L.push(`${a.calculadoraNome} · Análise #${a.id}`);
  if (a.clienteNome) L.push(`Cliente: ${a.clienteNome}`);
  L.push("");

  if (a.calculadoraSlug === "dosagem-caa") {
    const r = a.resultados as ResumoDosagem;
    if (r.tracoUnitario) {
      L.push("*Traço unitário*");
      L.push(r.tracoUnitario);
      L.push("_cimento : fíler : miúdo : graúdo : água : aditivo_");
      L.push("");
    }
    if (r.materiais?.length) {
      L.push("*Consumo por m³*");
      for (const m of r.materiais) {
        L.push(`• ${m.nome}: ${num(m.consumo, 1)} kg`);
      }
      L.push("");
    }
    if (typeof r.custoTotal === "number") {
      L.push(`*Custo:* ${num(r.custoTotal)} R$/m³`);
      L.push("");
    }
  } else {
    const r = a.resultados as ResumoGranulometria;
    if (typeof r.moduloFinuraMescla === "number") {
      L.push(`*Módulo de finura:* ${num(r.moduloFinuraMescla)}`);
    }
    if (typeof r.diametroMaximo === "number") {
      L.push(
        `*Diâmetro máximo:* ${r.diametroMaximo.toLocaleString("pt-BR", {
          maximumFractionDigits: 2,
        })} mm`
      );
    }
    if (r.enquadramento) {
      L.push(
        `*Enquadramento:* ${ENQUADRAMENTO[r.enquadramento] ?? r.enquadramento}`
      );
    }
    L.push("");
  }

  if (a.parecer) {
    L.push("*Parecer técnico*");
    L.push(a.parecer);
    L.push("");
  }

  if (a.aprovadaEm) L.push(`Aprovada em ${dataBr(a.aprovadaEm)}`);
  L.push(
    a.validoAte ? `Válida até ${dataBr(a.validoAte)}` : "Sem prazo de validade definido"
  );
  L.push("");
  L.push("_Resumo emitido pelo Malha. O laudo completo, com memória de cálculo e gráficos, está no PDF._");

  return L.join("\n");
}

/** URL do WhatsApp com o texto pronto. Funciona no app e no web. */
export function linkWhatsApp(texto: string): string {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}
