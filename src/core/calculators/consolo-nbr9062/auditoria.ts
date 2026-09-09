import type { ConsoloResultado } from "./calc";
import {
  APOIOS,
  CONCRETAGENS,
  LIMITE_CONSOLO,
  LIMITE_MUITO_CURTO,
  TENSAO_ADMISSIVEL_APOIO,
  type ConsoloInput,
} from "./schema";

/**
 * Trilha de auditoria do cálculo do consolo.
 *
 * ⚠️ **TEMPORÁRIO.** Existe para o cliente conferir o motor contra a planilha
 * de origem, linha a linha. Sai da tela quando a validação terminar — remover
 * este arquivo, o `src/components/auditoria-consolo.tsx` e a chamada em
 * `resultado-consolo.tsx`.
 *
 * Não recalcula nada: lê as entradas e o resultado já gravados e apenas
 * mostra a fórmula com os números substituídos. Por isso pode rodar sobre o
 * snapshot de uma análise antiga sem risco de exibir número diferente do que
 * está no laudo.
 *
 * Cada passo traz a célula equivalente na planilha, que é o que torna a
 * conferência mecânica em vez de interpretativa.
 */

export type PassoAuditoria = {
  simbolo: string;
  descricao: string;
  /** A fórmula em símbolos. */
  formula: string;
  /** A mesma fórmula com os números desta análise. */
  substituicao: string;
  valor: string;
  unidade: string;
  /** Onde conferir na planilha de origem. */
  celula: string;
};

export type BlocoAuditoria = {
  titulo: string;
  nota?: string;
  passos: PassoAuditoria[];
};

/**
 * Tolerante a `null`: o snapshot é JSON, e um valor não-finito gravado antes
 * da correção chega aqui como `null`. Formatar isso sem guarda derrubava a
 * página com exceção no cliente.
 */
function n(v: number | null | undefined, casas = 4): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}
/** Versão curta, para não poluir a substituição. */
function c(v: number | null | undefined, casas = 2): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function auditoriaConsolo(
  e: ConsoloInput,
  r: ConsoloResultado
): BlocoAuditoria[] {
  const fase = CONCRETAGENS.find((x) => x.chave === e.concretagem);
  const apoio = APOIOS.find((x) => x.chave === e.apoio);
  const blocos: BlocoAuditoria[] = [];

  /* ---------------- Geometria de referência ---------------- */
  blocos.push({
    titulo: "1 · Geometria de referência",
    nota: "Define a altura útil, que é o que classifica a peça.",
    passos: [
      {
        simbolo: "d′",
        descricao: "Do topo ao eixo do tirante",
        formula: "c + ø/2",
        substituicao: `${c(e.c)} + ${c(e.bitola)}/20`,
        valor: n(r.dLinha, 3),
        unidade: "cm",
        celula: "Principal!C21 (lá: c + 0,5 fixo)",
      },
      {
        simbolo: "d",
        descricao: "Altura útil",
        formula: "h − d′",
        substituicao: `${c(e.h)} − ${c(r.dLinha)}`,
        valor: n(r.d, 3),
        unidade: "cm",
        celula: "—",
      },
      {
        simbolo: "a/d",
        descricao: "Relação que classifica a peça",
        formula: "a ÷ d",
        substituicao: `${c(e.a)} ÷ ${c(r.d)}`,
        valor: n(r.razaoAD, 4),
        unidade: "—",
        celula: "Principal!F7",
      },
      {
        simbolo: "tipo",
        descricao: "Classificação",
        formula: `≤ ${c(LIMITE_MUITO_CURTO, 1)} muito curto · ≤ ${c(LIMITE_CONSOLO, 1)} curto · > ${c(LIMITE_CONSOLO, 1)} viga em balanço`,
        substituicao: `a/d = ${c(r.razaoAD, 4)}`,
        valor: r.nomeClassificacao,
        unidade: "",
        celula: "Principal!F7",
      },
    ],
  });

  if (r.foraDeEscopo) {
    return blocos;
  }

  /* ---------------- Esforços e materiais ---------------- */
  blocos.push({
    titulo: "2 · Esforços de cálculo e materiais",
    passos: [
      {
        simbolo: "Fsd",
        descricao: "Força vertical de cálculo",
        formula: "γn · 1,4 · Fk",
        substituicao: `${c(r.gamaN, 1)} × 1,4 × ${c(e.fk)}`,
        valor: n(r.fsd, 3),
        unidade: "kN",
        celula: "Consolo Curto!F6",
      },
      {
        simbolo: "γn",
        descricao: `Coeficiente da fase de concretagem (${fase?.nome ?? ""})`,
        formula: "1,1 na 1ª fase · 1,2 na 2ª",
        substituicao: fase?.nome ?? "",
        valor: c(r.gamaN, 1),
        unidade: "—",
        celula: "Principal!C13",
      },
      {
        simbolo: "Hsd",
        descricao: `Força horizontal de cálculo (${apoio?.nome ?? ""})`,
        formula: "fator(apoio) · Fsd",
        substituicao: `${c(r.fatorApoio, 2)} × ${c(r.fsd, 3)}`,
        valor: n(r.hsd, 3),
        unidade: "kN",
        celula: "Consolo Curto!F7",
      },
      {
        simbolo: "fcd",
        descricao: "Resistência de cálculo do concreto",
        formula: "fck / 1,4",
        substituicao: `${c(r.fck, 0)} ÷ 1,4`,
        valor: n(r.fcd, 3),
        unidade: "MPa",
        celula: "Consolo Curto!F19",
      },
      {
        simbolo: "fyd",
        descricao: "Resistência de cálculo do aço",
        formula: "fyk / 1,15",
        substituicao: `${c(r.fyk, 0)} ÷ 1,15`,
        valor: n(r.fyd, 3),
        unidade: "MPa",
        celula: "Consolo Curto!F21",
      },
    ],
  });

  /* ---------------- Modelo ---------------- */
  if (r.geometria) {
    const g = r.geometria;
    const folga =
      e.ancoragem === "BARRA_SOLDADA" ? e.bitola / 10 + 2 : e.bitola / 10;
    blocos.push({
      titulo: "3 · Biela e tirante (consolo curto)",
      nota: "Aba “Consolo Curto” da planilha.",
      passos: [
        {
          simbolo: "α",
          descricao: "Inclinação da resultante",
          formula: "arctg(Hsd / Fsd)",
          substituicao: `arctg(${c(r.hsd, 3)} ÷ ${c(r.fsd, 3)})`,
          valor: n(g.alfa, 3),
          unidade: "graus",
          celula: "Consolo Curto!F8",
        },
        {
          simbolo: "BD",
          descricao: "Projeção do tirante",
          formula: "d′ · tg α",
          substituicao: `${c(r.dLinha)} × tg(${c(g.alfa, 3)}°)`,
          valor: n(g.bd, 3),
          unidade: "cm",
          celula: "Consolo Curto!F9",
        },
        {
          simbolo: "AB",
          descricao: "Segmento livre",
          formula: "l − (c + folga de ancoragem) − a − BD",
          substituicao: `${c(e.l)} − (${c(e.c)} + ${c(folga)}) − ${c(e.a)} − ${c(g.bd, 3)}`,
          valor: n(g.ab, 3),
          unidade: "cm",
          celula: "Consolo Curto!F10",
        },
        {
          simbolo: "AD",
          descricao: "Segmento",
          formula: "AB + BD",
          substituicao: `${c(g.ab, 3)} + ${c(g.bd, 3)}`,
          valor: n(g.ad, 3),
          unidade: "cm",
          celula: "Consolo Curto!F11",
        },
        {
          simbolo: "AC",
          descricao: "Segmento",
          formula: "2 · AB",
          substituicao: `2 × ${c(g.ab, 3)}`,
          valor: n(g.ac, 3),
          unidade: "cm",
          celula: "Consolo Curto!F12",
        },
        {
          simbolo: "θ",
          descricao: "Inclinação da biela",
          formula: "arctg[ d / (AD + a) ]",
          substituicao: `arctg(${c(r.d)} ÷ (${c(g.ad, 3)} + ${c(e.a)}))`,
          valor: n(g.theta, 3),
          unidade: "graus",
          celula: "Consolo Curto!F13",
        },
        {
          simbolo: "h_bie",
          descricao: "Altura da biela",
          formula: "AC · sen θ",
          substituicao: `${c(g.ac, 3)} × sen(${c(g.theta, 3)}°)`,
          valor: n(g.hbie, 3),
          unidade: "cm",
          celula: "Consolo Curto!F14",
        },
        {
          simbolo: "A_bie",
          descricao: "Área da biela",
          formula: "h_bie · bₙ",
          substituicao: `${c(g.hbie, 3)} × ${c(e.bn)}`,
          valor: n(g.abie, 3),
          unidade: "cm²",
          celula: "Consolo Curto!F15",
        },
        {
          simbolo: "Rcd",
          descricao: "Força na biela",
          formula: "Fsd / sen θ",
          substituicao: `${c(r.fsd, 3)} ÷ sen(${c(g.theta, 3)}°)`,
          valor: n(g.rcd, 3),
          unidade: "kN",
          celula: "Consolo Curto!F16",
        },
      ],
    });
  }

  if (r.cisalhamento) {
    const t = r.cisalhamento;
    blocos.push({
      titulo: "3 · Atrito-cisalhamento (consolo muito curto)",
      nota: "Aba “Consolo Muito Curto” da planilha.",
      passos: [
        {
          simbolo: "τwd",
          descricao: "Cisalhamento atuante",
          formula: "Fsd / (b · h)",
          substituicao: `${c(r.fsd, 3)} ÷ (${c(e.b)} × ${c(e.h)}) × 10`,
          valor: n(t.tauWd, 4),
          unidade: "MPa",
          celula: "Consolo Muito Curto!F8",
        },
        {
          simbolo: "μ",
          descricao: "Coeficiente de atrito",
          formula: "1,4 na 1ª fase · 1,0 na 2ª",
          substituicao: fase?.nome ?? "",
          valor: c(t.mu, 1),
          unidade: "—",
          celula: "Consolo Muito Curto!F17",
        },
        {
          simbolo: "τwu,1",
          descricao: "Limite por armadura",
          formula: "3 + 0,9 · ρ · fyd",
          substituicao: `3 + 0,9 × ρ × ${c(r.fyd, 3)}`,
          valor: n(t.tauWu1, 4),
          unidade: "MPa",
          celula: "Consolo Muito Curto!F11",
        },
        {
          simbolo: "τwu,2",
          descricao: "Limite por esmagamento",
          formula: "0,27 · (1 − fck/250) · fcd",
          substituicao: `0,27 × (1 − ${c(r.fck, 0)}/250) × ${c(r.fcd, 3)}`,
          valor: n(t.tauWu2, 4),
          unidade: "MPa",
          celula: "Consolo Muito Curto!F12",
        },
        {
          simbolo: "τwu,3",
          descricao: "Teto absoluto",
          formula: "8",
          substituicao: "constante",
          valor: n(t.tauWu3, 4),
          unidade: "MPa",
          celula: "Consolo Muito Curto!F13",
        },
        {
          simbolo: "τwu",
          descricao: "Limite governante",
          formula: "mín(τwu,1 ; τwu,2 ; τwu,3)",
          substituicao: `mín(${c(t.tauWu1, 3)} ; ${c(t.tauWu2, 3)} ; ${c(t.tauWu3, 3)})`,
          valor: n(t.tauWu, 4),
          unidade: "MPa",
          celula: "Consolo Muito Curto!F14",
        },
      ],
    });
  }

  /* ---------------- Armaduras ---------------- */
  const a = r.armaduras;
  if (a) {
    const curto = r.geometria !== null;
    const fydKN = r.fyd / 10;
    blocos.push({
      titulo: "4 · Armaduras",
      nota: "fyd é dividido por 10 para virar kN/cm², e as áreas saem direto em cm².",
      passos: [
        {
          simbolo: "Asv",
          descricao: "Parcela vertical do tirante",
          formula: curto
            ? "(0,1 + a/d) · Fsd / (fyd/10)"
            : "0,8 · Fsd / [(fyd/10) · μ]",
          substituicao: curto
            ? `(0,1 + ${c(e.a)}/${c(r.d)}) × ${c(r.fsd, 3)} ÷ ${c(fydKN, 4)}`
            : `0,8 × ${c(r.fsd, 3)} ÷ (${c(fydKN, 4)} × ${c(r.cisalhamento?.mu ?? 1, 1)})`,
          valor: n(a.asv, 4),
          unidade: "cm²",
          celula: curto ? "Consolo Curto!F22" : "Consolo Muito Curto!F18",
        },
        {
          simbolo: "As,tir",
          descricao: "Tirante, pelo modelo",
          formula: "Asv + Hsd / (fyd/10)",
          substituicao: `${c(a.asv, 4)} + ${c(r.hsd, 3)} ÷ ${c(fydKN, 4)}`,
          valor: n(a.asTirCalculado, 4),
          unidade: "cm²",
          celula: curto ? "Consolo Curto!F23" : "Consolo Muito Curto!F19",
        },
        {
          simbolo: "As,tir,mín",
          descricao: "Tirante, mínima normativa",
          formula: "0,04 · b · d · fck / fyk",
          substituicao: `0,04 × ${c(e.b)} × ${c(r.d)} × ${c(r.fck, 0)} ÷ ${c(r.fyk, 0)}`,
          valor: n(a.asTirMin, 4),
          unidade: "cm²",
          celula: curto ? "Consolo Curto!F26" : "Consolo Muito Curto!F22",
        },
        {
          simbolo: "As,tir",
          descricao: `Tirante adotado — governa ${a.governa === "calculado" ? "o calculado" : "a mínima"}`,
          formula: "máx(As,tir ; As,tir,mín)",
          substituicao: `máx(${c(a.asTirCalculado, 4)} ; ${c(a.asTirMin, 4)})`,
          valor: n(a.asTir, 4),
          unidade: "cm²",
          celula: "Principal!F13",
        },
        {
          simbolo: "As,cost",
          descricao: "Costura",
          formula: curto
            ? "0,4 · ⅔ · máx(As,tir,mín ; Asv)"
            : "máx(0,5·⅔·Asv + 0,15%·b·d/3 ; 0,15%·b·d)",
          substituicao: curto
            ? `0,4 × 0,6667 × máx(${c(a.asTirMin, 4)} ; ${c(a.asv, 4)})`
            : `máx(0,3333 × ${c(a.asv, 4)} + 0,0015 × ${c(e.b)} × ${c(r.d)} ÷ 3 ; 0,0015 × ${c(e.b)} × ${c(r.d)})`,
          valor: n(a.asCost, 4),
          unidade: "cm²",
          celula: curto ? "Consolo Curto!F27" : "Consolo Muito Curto!F23",
        },
        {
          simbolo: "Asw",
          descricao: "Transversal",
          formula: "0,15% · b · h",
          substituicao: `0,0015 × ${c(e.b)} × ${c(e.h)}`,
          valor: n(a.asw, 4),
          unidade: "cm²",
          celula: curto ? "Consolo Curto!F28" : "Consolo Muito Curto!F24",
        },
        {
          simbolo: "ρ",
          descricao: "Taxa de armadura",
          formula: "As,tir / (b · d)",
          substituicao: `${c(a.asTir, 4)} ÷ (${c(e.b)} × ${c(r.d)})`,
          valor: n(a.rho, 6),
          unidade: "—",
          celula: curto ? "Consolo Curto!F24" : "Consolo Muito Curto!F20",
        },
        {
          simbolo: "ω",
          descricao: "Taxa mecânica",
          formula: "ρ · fyk / fck",
          substituicao: `${c(a.rho, 6)} × ${c(r.fyk, 0)} ÷ ${c(r.fck, 0)}`,
          valor: n(a.omega, 6),
          unidade: "—",
          celula: curto ? "Consolo Curto!F25" : "Consolo Muito Curto!F21",
        },
      ],
    });
  }

  /* ---------------- Verificações ---------------- */
  const passosVerif: PassoAuditoria[] = r.verificacoes.map((v) => {
    if (v.chave === "biela") {
      // Optional chaining: snapshot antigo pode ter verificação de biela sem
      // geometria, e uma exceção aqui derruba o laudo inteiro.
      const g = r.geometria;
      return {
        simbolo: "σ_bie",
        descricao: `Compressão na biela · ${v.atende ? "ATENDE" : "NÃO ATENDE"}`,
        formula: "Rcd / A_bie ≤ fcd",
        substituicao: `${c(g?.rcd, 3)} ÷ ${c(g?.abie, 3)} × 10 = ${c(v.atuante, 3)} ≤ ${c(v.limite, 3)}`,
        valor: n(v.atuante, 3),
        unidade: "MPa",
        celula: "Consolo Curto!F17 vs F19",
      };
    }
    if (v.chave === "cisalhamento") {
      return {
        simbolo: "τwd",
        descricao: `Cisalhamento · ${v.atende ? "ATENDE" : "NÃO ATENDE"}`,
        formula: "τwd ≤ τwu",
        substituicao: `${c(v.atuante, 3)} ≤ ${c(v.limite, 3)}`,
        valor: n(v.atuante, 3),
        unidade: "MPa",
        celula: "Consolo Muito Curto!F8 vs F14",
      };
    }
    return {
      simbolo: "σ_apoio",
      descricao: `Contato no aparelho de apoio · ${v.atende ? "ATENDE" : "NÃO ATENDE"}`,
      formula: "Fk / (aₙ · bₙ) ≤ 7,00 MPa",
      substituicao: `${c(e.fk)} ÷ (${c(e.an)} × ${c(e.bn)}) × 10 = ${c(v.atuante, 3)} ≤ ${c(TENSAO_ADMISSIVEL_APOIO)}`,
      valor: n(v.atuante, 3),
      unidade: "MPa",
      celula: "Principal!F12 (lá, sem limite)",
    };
  });

  blocos.push({
    titulo: "5 · Verificações",
    nota: "A do aparelho de apoio usa a força CARACTERÍSTICA Fk; as outras usam Fsd. É deliberado.",
    passos: passosVerif,
  });

  return blocos;
}
