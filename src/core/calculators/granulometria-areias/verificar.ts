/**
 * Paridade com a planilha "Granul. Areias".
 *
 * Roda junto com `npm run verificar:calculos`.
 */
import { calcularGranulometria, melhorTeor } from "./calc";
import { PADRAO } from "./schema";

const falhas: string[] = [];

function conferir(rotulo: string, obtido: number, esperado: number, tol: number) {
  const ok = Math.abs(obtido - esperado) <= tol;
  console.log(
    `${ok ? "OK  " : "FALHA"} ${rotulo.padEnd(38)} obtido=${obtido}  esperado=${esperado}`
  );
  if (!ok) falhas.push(`${rotulo}: ${obtido} != ${esperado}`);
}

console.log("=== Granulometria de areias — caso da planilha ===");
const r = calcularGranulometria(PADRAO);

// Massas totais conferidas na linha "%" da planilha.
conferir("massa total areia fina (g)", r.areiaA.massaTotal, 557, 0.1);
conferir("massa total areia regular (g)", r.areiaB.massaTotal, 580, 0.1);

// Módulos de finura — a planilha mostra 0,76 e 2,65.
conferir("módulo de finura — areia fina", r.areiaA.moduloFinura, 0.76, 0.01);
conferir("módulo de finura — areia regular", r.areiaB.moduloFinura, 2.65, 0.01);

// Acumulados da areia fina (coluna G da planilha).
const a = r.areiaA.linhas;
conferir("fina: acumulado 0,3 mm", a[6].acumulado, 1.3, 0.15);
conferir("fina: acumulado 0,15 mm", a[7].acumulado, 74.6, 0.15);
conferir("fina: acumulado 0,075 mm", a[8].acumulado, 99.8, 0.15);

// Acumulados da areia regular (coluna M).
const b = r.areiaB.linhas;
conferir("regular: acumulado 4,75 mm", b[2].acumulado, 1.3, 0.15);
conferir("regular: acumulado 2,36 mm", b[3].acumulado, 10.4, 0.15);
conferir("regular: acumulado 1,18 mm", b[4].acumulado, 27.9, 0.15);
conferir("regular: acumulado 0,6 mm", b[5].acumulado, 45.7, 0.15);
conferir("regular: acumulado 0,3 mm", b[6].acumulado, 81.7, 0.15);
conferir("regular: acumulado 0,15 mm", b[7].acumulado, 98.0, 0.15);

// Mescla com 10% de areia fina (coluna O).
const m = r.mescla;
conferir("mescla: 4,75 mm", m[2].acumulado, 1.2, 0.15);
conferir("mescla: 2,36 mm", m[3].acumulado, 9.4, 0.15);
conferir("mescla: 1,18 mm", m[4].acumulado, 25.1, 0.15);
conferir("mescla: 0,6 mm", m[5].acumulado, 41.1, 0.15);
conferir("mescla: 0,3 mm", m[6].acumulado, 73.7, 0.15);
conferir("mescla: 0,15 mm", m[7].acumulado, 95.7, 0.15);

/*
 * A planilha exibe 2,39 para o módulo de finura da mescla, mas a própria
 * coluna Mescla dela leva a 2,46:
 *   (0 + 1,2 + 9,4 + 25,1 + 41,1 + 73,7 + 95,7) / 100 = 2,462
 * e a média ponderada dá o mesmo:
 *   0,10 × 0,76 + 0,90 × 2,65 = 2,461
 * Adotamos o valor normativo. Se a planilha estiver certa e nós errados,
 * este é o teste que vai acusar.
 */
conferir("módulo de finura — mescla", r.moduloFinuraMescla, 2.46, 0.02);

console.log("\n=== Enquadramento NBR 7211 ===");
console.log(`enquadramento: ${r.enquadramento}`);
console.log(
  `peneiras fora da zona utilizável: ${r.peneirasForaDaZona.length ? r.peneirasForaDaZona.join(", ") : "nenhuma"}`
);
console.log(`diâmetro máximo característico: ${r.diametroMaximo} mm`);

// Com 10% de fina, a mescla da planilha fica dentro da zona utilizável.
if (r.enquadramento === "fora") {
  falhas.push("o caso da planilha não deveria sair da zona utilizável");
}

console.log("\n=== Busca do melhor teor ===");
const melhor = melhorTeor(PADRAO);
console.log(
  `melhor teor = ${melhor.teor}% (${melhor.otimas} peneira(s) na zona ótima, ${melhor.enquadramento})`
);

console.log("\n=== Módulo de finura ignora peneiras intermediárias ===");
/*
 * Com tudo retido na 9,5 mm (série normal), as 7 peneiras da série ficam com
 * 100% acumulado -> MF = 7,00.
 * Com tudo retido na 6,3 mm (intermediária), a 9,5 fica com 0% e as outras 6
 * com 100% -> MF = 6,00. A diferença de exatamente 1,00 é a prova de que a
 * 6,3 não foi somada: se fosse, os dois casos dariam 7.
 */
const so95 = calcularGranulometria({
  ...PADRAO,
  areiaA1: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  areiaA2: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  teorMistura: 100,
});
const so63 = calcularGranulometria({
  ...PADRAO,
  areiaA1: [0, 100, 0, 0, 0, 0, 0, 0, 0, 0],
  areiaA2: [0, 100, 0, 0, 0, 0, 0, 0, 0, 0],
  teorMistura: 100,
});
conferir("MF com tudo retido na 9,5 mm", so95.areiaA.moduloFinura, 7, 0.01);
conferir("MF com tudo retido na 6,3 mm", so63.areiaA.moduloFinura, 6, 0.01);

console.log("");
if (falhas.length) {
  console.error(`${falhas.length} FALHA(S):`);
  falhas.forEach((f) => console.error(` - ${f}`));
  process.exit(1);
}
console.log("Granulometria: todos os casos conferem.");
