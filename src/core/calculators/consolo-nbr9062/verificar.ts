/**
 * Teste de paridade com a planilha "Programa Consolo".
 *
 * ⚠️ O caso de referência tem `bₙ = 18` e `b = 15`, geometria que o
 * `consoloSchema` rejeita (decisão A-06). Por isso este arquivo chama o motor
 * **direto**, sem passar pelo schema — é justamente o que uma função pura
 * permite. Não é contorno de validação: é a separação entre o que a
 * matemática aceita e o que o produto deixa digitar.
 */
import { calcularConsolo } from "./calc";
import { PADRAO, distanciaTirante } from "./schema";

type Caso = { rotulo: string; obtido: number; esperado: number; tol: number };

const falhas: string[] = [];

function conferir(c: Caso) {
  const dif = Math.abs(c.obtido - c.esperado);
  const ok = dif <= c.tol;
  console.log(
    `${ok ? "OK  " : "FALHA"} ${c.rotulo.padEnd(36)} obtido=${c.obtido}  esperado=${c.esperado}`
  );
  if (!ok) falhas.push(`${c.rotulo}: ${c.obtido} != ${c.esperado}`);
}

console.log("=== Caso de referência da planilha Consolo ===");
console.log("fck35 · CA50 · 1ª fase · b15 h20 l20 a10 c2,5 · ø10 · junta a seco · Fk 17 kN\n");

const r = calcularConsolo(PADRAO);

console.log(`classificação: ${r.nomeClassificacao} (a/d = ${r.razaoAD})`);
conferir({ rotulo: "a/d", obtido: r.razaoAD, esperado: 10 / 17, tol: 1e-4 });
conferir({ rotulo: "d′ (cm)", obtido: r.dLinha, esperado: 3, tol: 1e-6 });
conferir({ rotulo: "Fsd (kN)", obtido: r.fsd, esperado: 26.18, tol: 1e-3 });
conferir({ rotulo: "Hsd (kN)", obtido: r.hsd, esperado: 20.944, tol: 1e-3 });
conferir({ rotulo: "fcd (MPa)", obtido: r.fcd, esperado: 25, tol: 1e-6 });
conferir({ rotulo: "fyd (MPa)", obtido: r.fyd, esperado: 434.783, tol: 1e-3 });

const g = r.geometria!;
console.log("\n--- Biela e tirante ---");
conferir({ rotulo: "α (graus)", obtido: g.alfa, esperado: 38.6598, tol: 1e-3 });
conferir({ rotulo: "segmento BD (cm)", obtido: g.bd, esperado: 2.4, tol: 1e-3 });
conferir({ rotulo: "segmento AB (cm)", obtido: g.ab, esperado: 4.1, tol: 1e-3 });
conferir({ rotulo: "segmento AD (cm)", obtido: g.ad, esperado: 6.5, tol: 1e-3 });
conferir({ rotulo: "segmento AC (cm)", obtido: g.ac, esperado: 8.2, tol: 1e-3 });
conferir({ rotulo: "θ (graus)", obtido: g.theta, esperado: 45.8551, tol: 1e-3 });
conferir({ rotulo: "h_bie (cm)", obtido: g.hbie, esperado: 5.8842, tol: 1e-3 });
conferir({ rotulo: "A_bie (cm²)", obtido: g.abie, esperado: 105.9149, tol: 1e-2 });
conferir({ rotulo: "Rcd (kN)", obtido: g.rcd, esperado: 36.4837, tol: 1e-3 });

const bie = r.verificacoes.find((v) => v.chave === "biela")!;
conferir({ rotulo: "σ_bie (MPa)", obtido: bie.atuante, esperado: 3.4446, tol: 1e-3 });

const arm = r.armaduras!;
console.log("\n--- Armaduras ---");
conferir({ rotulo: "Asv (cm²)", obtido: arm.asv, esperado: 0.4144, tol: 1e-3 });
conferir({ rotulo: "As,tir calculado (cm²)", obtido: arm.asTirCalculado, esperado: 0.8961, tol: 1e-3 });
conferir({ rotulo: "As,tir,mín (cm²)", obtido: arm.asTirMin, esperado: 0.714, tol: 1e-3 });
conferir({ rotulo: "As,tir adotado (cm²)", obtido: arm.asTir, esperado: 0.8961, tol: 1e-3 });
conferir({ rotulo: "As,cost (cm²)", obtido: arm.asCost, esperado: 0.1904, tol: 1e-3 });
conferir({ rotulo: "Asw (cm²)", obtido: arm.asw, esperado: 0.45, tol: 1e-3 });
conferir({ rotulo: "ρ", obtido: arm.rho, esperado: 0.0035142, tol: 1e-6 });
conferir({ rotulo: "ω", obtido: arm.omega, esperado: 0.0502031, tol: 1e-5 });
console.log(`governa: ${arm.governa} (calculado ${arm.asTirCalculado} vs mínima ${arm.asTirMin})`);

console.log("\n--- Verificações (A-02) ---");
for (const v of r.verificacoes) {
  console.log(
    `  ${v.atende ? "ATENDE    " : "NÃO ATENDE"} ${v.nome.padEnd(32)} ${v.atuante} / ${v.limite} ${v.unidade} · ${(v.aproveitamento * 100).toFixed(1)}% do limite`
  );
}
console.log(`  veredito global: ${r.veredito}`);

const apoio = r.verificacoes.find((v) => v.chave === "apoio")!;
conferir({ rotulo: "σ_apoio (MPa)", obtido: apoio.atuante, esperado: 0.5247, tol: 1e-3 });
conferir({ rotulo: "limite do apoio (MPa)", obtido: apoio.limite, esperado: 7, tol: 0 });

console.log("\n=== Consolo muito curto (a/d ≤ 0,5) ===");
// Mesma peça com o balanço reduzido: cai no modelo de atrito-cisalhamento.
const mc = calcularConsolo({ ...PADRAO, a: 8 });
console.log(`classificação: ${mc.nomeClassificacao} (a/d = ${mc.razaoAD})`);
conferir({ rotulo: "τwd (MPa)", obtido: mc.cisalhamento!.tauWd, esperado: 0.8727, tol: 1e-3 });
conferir({ rotulo: "τwu2 (MPa)", obtido: mc.cisalhamento!.tauWu2, esperado: 5.805, tol: 1e-3 });
conferir({ rotulo: "μ (1ª fase)", obtido: mc.cisalhamento!.mu, esperado: 1.4, tol: 0 });
conferir({ rotulo: "Asv (cm²)", obtido: mc.armaduras!.asv, esperado: 0.34408, tol: 1e-4 });
conferir({ rotulo: "As,tir calculado (cm²)", obtido: mc.armaduras!.asTirCalculado, esperado: 0.82579, tol: 1e-4 });
conferir({ rotulo: "As,cost (cm²)", obtido: mc.armaduras!.asCost, esperado: 0.3825, tol: 1e-3 });

console.log("\n=== A-05: a bitola atravessa a geometria ===");
// Com d′ fixo em 0,5 este bloco passaria igual ao de cima. É o caso que
// acusa se alguém reintroduzir o valor fixo.
conferir({ rotulo: "d′ com ø 10 mm", obtido: distanciaTirante(2.5, 10), esperado: 3.0, tol: 1e-9 });
conferir({ rotulo: "d′ com ø 25 mm", obtido: distanciaTirante(2.5, 25), esperado: 3.75, tol: 1e-9 });
const grosso = calcularConsolo({ ...PADRAO, bitola: 25 });
conferir({ rotulo: "d com ø 25 mm (cm)", obtido: grosso.d, esperado: 16.25, tol: 1e-6 });
if (grosso.armaduras!.asTir === arm.asTir) {
  falhas.push("a bitola não alterou a armadura — d′ voltou a ser fixo?");
}
console.log(
  `As,tir com ø 25 mm: ${grosso.armaduras!.asTir} cm² (contra ${arm.asTir} com ø 10 mm)`
);

console.log("\n=== A-01: viga em balanço ===");
const viga = calcularConsolo({ ...PADRAO, a: 19, l: 25 });
console.log(`classificação: ${viga.nomeClassificacao} (a/d = ${viga.razaoAD})`);
console.log(`veredito: ${viga.veredito}`);
console.log(`sem armaduras: ${viga.armaduras === null}`);
console.log(`sem verificações: ${viga.verificacoes.length === 0}`);
console.log(`mensagem: ${viga.mensagemEscopo}`);
if (!viga.foraDeEscopo || viga.armaduras !== null) {
  falhas.push("a/d > 1 deveria sair fora de escopo e sem armaduras");
}

console.log("\n=== Geometria impossível: biela sem comprimento ===");
// Caso real que derrubou o laudo em producao: l pequeno demais para o
// cobrimento + ancoragem + balanco + projecao do tirante. AB ficava negativo,
// a area da biela tambem, e a tensao saia Infinity — que o JSON grava como
// null e o laudo nao consegue formatar.
const impossivel = calcularConsolo({
  ...PADRAO,
  b: 10, h: 10, l: 10, a: 4.5, c: 5, an: 5, bn: 5, fck: 25, fk: 10,
});
console.log(`classificação: ${impossivel.nomeClassificacao}`);
console.log(`fora de escopo: ${impossivel.foraDeEscopo}`);
console.log(`sem verificações: ${impossivel.verificacoes.length === 0}`);
console.log(`mensagem: ${impossivel.mensagemEscopo}`);
if (!impossivel.foraDeEscopo || impossivel.verificacoes.length > 0) {
  falhas.push("AB <= 0 deveria sair fora de escopo, sem verificações");
}

// Nada do que sai do motor pode ser não-finito: JSON.stringify transforma
// Infinity e NaN em null, e o laudo quebra ao formatar.
function todosFinitos(v: unknown, caminho = "raiz"): string[] {
  if (typeof v === "number") {
    return Number.isFinite(v) ? [] : [`${caminho} = ${v}`];
  }
  if (Array.isArray(v)) {
    return v.flatMap((x, i) => todosFinitos(x, `${caminho}[${i}]`));
  }
  if (v && typeof v === "object") {
    return Object.entries(v).flatMap(([k, x]) => todosFinitos(x, `${caminho}.${k}`));
  }
  return [];
}
for (const [rotulo, res] of [
  ["caso de referência", r],
  ["muito curto", mc],
  ["viga em balanço", viga],
  ["geometria impossível", impossivel],
  ["bitola 25", grosso],
] as const) {
  const ruins = todosFinitos(res);
  console.log(`  ${ruins.length === 0 ? "OK  " : "FALHA"} ${rotulo}: ${ruins.length === 0 ? "todos os números finitos" : ruins.join(", ")}`);
  if (ruins.length > 0) falhas.push(`nao-finito em ${rotulo}: ${ruins.join(", ")}`);
}

console.log("\n=== A-02: reprovação é detectada ===");
// Carga alta o bastante para estourar a compressão na biela.
const pesado = calcularConsolo({ ...PADRAO, fk: 900 });
const bielaPesada = pesado.verificacoes.find((v) => v.chave === "biela")!;
console.log(
  `σ_bie = ${bielaPesada.atuante} MPa contra ${bielaPesada.limite} · ${bielaPesada.atende ? "ATENDE" : "NÃO ATENDE"} · veredito ${pesado.veredito}`
);
if (bielaPesada.atende || pesado.veredito !== "NAO_ATENDE") {
  falhas.push("carga de 900 kN deveria reprovar a biela");
}
if (bielaPesada.folga >= 0) {
  falhas.push("folga deveria ser negativa quando reprova");
}

console.log("\n=== Fase de concretagem ===");
const segunda = calcularConsolo({ ...PADRAO, concretagem: "SEGUNDA" });
conferir({ rotulo: "Fsd na 2ª fase (kN)", obtido: segunda.fsd, esperado: 1.2 * 1.4 * 17, tol: 1e-6 });

console.log("\n=== Aparelhos de apoio ===");
for (const [chave, fator] of [
  ["JUNTA_SECO", 0.8],
  ["JUNTA_ARGAMASSA", 0.5],
  ["CONCRETO_CHAPA", 0.4],
  ["CHAPA_NAO_SOLDADA", 0.25],
  ["ELASTOMERO", 0.16],
  ["PTFE", 0.08],
] as const) {
  const x = calcularConsolo({ ...PADRAO, apoio: chave });
  conferir({
    rotulo: `Hsd — ${chave}`,
    obtido: x.hsd,
    esperado: Math.round(fator * 26.18 * 1000) / 1000,
    tol: 1e-3,
  });
}

if (falhas.length > 0) {
  console.error(`\n${falhas.length} divergência(s):`);
  for (const f of falhas) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nConsolo: todos os casos conferem.");
