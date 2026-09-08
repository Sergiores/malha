/**
 * Teste de paridade com a planilha "2. Planilha Idade do Concreto".
 *
 * Roda com `npm run verificar:calculos`. É o critério de aceite: se estes
 * números mudarem, o motor divergiu da planilha que o engenheiro já valida
 * na prática — e isso precisa ser decisão, não acidente.
 */
import { calcularIdadeConcreto, beta1 } from "./calc";
import { CIMENTOS, PADRAO } from "./schema";

type Caso = { rotulo: string; obtido: number; esperado: number; tol: number };

const falhas: string[] = [];

function conferir(c: Caso) {
  const dif = Math.abs(c.obtido - c.esperado);
  const ok = dif <= c.tol;
  console.log(
    `${ok ? "OK  " : "FALHA"} ${c.rotulo.padEnd(38)} obtido=${c.obtido}  esperado=${c.esperado}`
  );
  if (!ok) falhas.push(`${c.rotulo}: ${c.obtido} != ${c.esperado}`);
}

console.log("=== Caso de referência da planilha Idade do Concreto ===");
console.log("fck28 = 25 MPa · 7 dias · CP II · carga 100 kN\n");

const r = calcularIdadeConcreto(PADRAO);

conferir({ rotulo: "β₁", obtido: r.beta1, esperado: 0.7788, tol: 1e-4 });
conferir({
  rotulo: "resistência efetiva (MPa)",
  obtido: r.fckEfetivo,
  esperado: 19.47,
  tol: 0.01,
});
conferir({
  rotulo: "carga efetiva (kN)",
  obtido: r.cargaEfetiva,
  esperado: 77.88,
  tol: 0.01,
});
conferir({ rotulo: "coeficiente s (CP II)", obtido: r.s, esperado: 0.25, tol: 0 });

console.log("\n=== Coeficiente s por tipo de cimento ===");
const S_ESPERADO: Record<string, number> = {
  CP_I: 0.25,
  CP_II: 0.25,
  CP_III: 0.38,
  CP_IV: 0.38,
  CP_V: 0.2,
};
for (const c of CIMENTOS) {
  conferir({
    rotulo: `s — ${c.nome}`,
    obtido: c.s,
    esperado: S_ESPERADO[c.chave],
    tol: 0,
  });
}

console.log("\n=== Âncoras da expressão ===");
// Aos 28 dias, por definição, o concreto tem exatamente o fck de projeto.
for (const c of CIMENTOS) {
  conferir({
    rotulo: `β₁ aos 28 dias — ${c.nome}`,
    obtido: beta1(c.s, 28),
    esperado: 1,
    tol: 1e-12,
  });
}
// Aos 7 dias, √(28/7) = 2 exatamente, então β₁ = exp(−s).
conferir({
  rotulo: "β₁ aos 7 dias = exp(−s)",
  obtido: beta1(0.38, 7),
  esperado: Math.exp(-0.38),
  tol: 1e-12,
});

console.log("\n=== Divergência consciente: teto de β₁ ===");
// A planilha extrapola sem avisar: com 60 dias e CP II ela devolveria 1,082,
// contando 8% de resistência que a norma não autoriza. Aqui corta em 1 e diz.
const tardio = calcularIdadeConcreto({ ...PADRAO, idade: 60 });
conferir({ rotulo: "β₁ aos 60 dias (cortado)", obtido: tardio.beta1, esperado: 1, tol: 0 });
conferir({
  rotulo: "β₁ aos 60 dias (bruto, planilha)",
  obtido: tardio.beta1Bruto,
  esperado: 1.0825,
  tol: 1e-3,
});
console.log(
  `aviso emitido: ${tardio.avisos.some((a) => a.campo === "idade")}`
);
console.log(
  `fck efetivo aos 60 dias: ${tardio.fckEfetivo} MPa (não ${(
    tardio.beta1Bruto * 25
  ).toFixed(2)})`
);

console.log("\n=== Monotonia: mais idade nunca reduz resistência ===");
let anterior = 0;
let monotona = true;
for (let dia = 1; dia <= 40; dia++) {
  const b = beta1(0.25, dia);
  if (b < anterior - 1e-12) monotona = false;
  anterior = b;
}
console.log(`curva monótona crescente: ${monotona}`);
if (!monotona) falhas.push("β₁ não é monótona crescente");

console.log("\n=== Validação de domínio ===");
const jovem = calcularIdadeConcreto({ ...PADRAO, idade: 1 });
console.log(
  `idade de 1 dia gera aviso: ${jovem.avisos.some((a) => a.campo === "idade")}`
);
const fraco = calcularIdadeConcreto({ ...PADRAO, fck28: 12 });
console.log(
  `fck de 12 MPa gera aviso de faixa: ${fraco.avisos.some((a) => a.campo === "fck28")}`
);
// Carga não informada não pode virar NaN nem quebrar o laudo.
const semCarga = calcularIdadeConcreto({ ...PADRAO, carga: 0 });
conferir({
  rotulo: "carga efetiva sem carga informada",
  obtido: semCarga.cargaEfetiva,
  esperado: 0,
  tol: 0,
});

if (falhas.length > 0) {
  console.error(`\n${falhas.length} divergência(s):`);
  for (const f of falhas) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nIdade do concreto: todos os casos conferem.");
