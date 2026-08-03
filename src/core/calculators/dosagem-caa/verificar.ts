/**
 * Teste de paridade com a planilha de origem.
 *
 * Roda com `npm run verificar:calculos`. É o critério de aceite do módulo:
 * se estes números mudarem, o motor divergiu da planilha que o engenheiro
 * já valida na prática — e isso precisa ser uma decisão, não um acidente.
 *
 * Sem framework de teste de propósito: uma dependência a menos para manter,
 * e o que importa aqui é a conferência numérica.
 */
import { calcularDosagemCaa } from "./calc";
import { PADRAO } from "./schema";

type Caso = { rotulo: string; obtido: number; esperado: number; tol: number };

const falhas: string[] = [];

function conferir(c: Caso) {
  const dif = Math.abs(c.obtido - c.esperado);
  const ok = dif <= c.tol;
  const marca = ok ? "OK  " : "FALHA";
  console.log(
    `${marca} ${c.rotulo.padEnd(34)} obtido=${c.obtido}  esperado=${c.esperado}`
  );
  if (!ok) falhas.push(`${c.rotulo}: ${c.obtido} != ${c.esperado}`);
}

console.log("=== Caso de referência da planilha Dosagem CAA ===");
const r = calcularDosagemCaa(PADRAO);
const mat = (k: string) => r.materiais.find((m) => m.chave === k)!;

conferir({ rotulo: "m (agregados secos)", obtido: r.m, esperado: 4.25, tol: 1e-4 });
conferir({ rotulo: "α (miúdo + fíler)", obtido: r.alfa, esperado: 2.045, tol: 1e-4 });

conferir({ rotulo: "traço fíler", obtido: mat("filer").traco, esperado: 0.409, tol: 1e-3 });
conferir({ rotulo: "traço miúdo", obtido: mat("miudo").traco, esperado: 1.636, tol: 1e-3 });
conferir({ rotulo: "traço graúdo", obtido: mat("graudo").traco, esperado: 2.205, tol: 1e-3 });
conferir({ rotulo: "traço água", obtido: mat("agua").traco, esperado: 0.5, tol: 1e-4 });
conferir({ rotulo: "traço aditivo", obtido: mat("aditivo").traco, esperado: 0.008, tol: 1e-4 });

conferir({ rotulo: "consumo cimento (kg/m³)", obtido: mat("cimento").consumo, esperado: 400, tol: 0.01 });
conferir({ rotulo: "consumo fíler (kg/m³)", obtido: mat("filer").consumo, esperado: 163.6, tol: 0.05 });
conferir({ rotulo: "consumo miúdo (kg/m³)", obtido: mat("miudo").consumo, esperado: 654.4, tol: 0.05 });
conferir({ rotulo: "consumo graúdo (kg/m³)", obtido: mat("graudo").consumo, esperado: 882, tol: 0.05 });
conferir({ rotulo: "consumo água (kg/m³)", obtido: mat("agua").consumo, esperado: 200, tol: 0.01 });
conferir({ rotulo: "consumo aditivo (kg/m³)", obtido: mat("aditivo").consumo, esperado: 3.2, tol: 0.01 });

conferir({ rotulo: "custo total (R$/m³)", obtido: r.custoTotal, esperado: 405.06, tol: 0.5 });
conferir({ rotulo: "massa total (kg/m³)", obtido: r.consumoTotal, esperado: 2303.2, tol: 0.05 });
// O método não conta o aditivo no fechamento — a diferença É o aditivo.
conferir({ rotulo: "diferença de massa", obtido: r.diferencaMassa, esperado: 3.2, tol: 0.01 });

console.log("\n=== Propagação: o que a planilha original falhava ===");
// Na planilha, cinco células viraram constantes e não propagavam. Aqui,
// dobrar o cimento tem de dobrar TODOS os consumos e o custo.
const dobro = calcularDosagemCaa({ ...PADRAO, cimento: 800 });
const mDobro = dobro.materiais.find((x) => x.chave === "graudo")!;
console.log(
  `com C=800: m=${dobro.m} (muda, como esperado) · graúdo=${mDobro.consumo} kg/m³`
);
if (mDobro.consumo === 882) {
  falhas.push("graúdo não propagou ao mudar o consumo de cimento");
}

console.log("\n=== Validação de domínio ===");
const forte = calcularDosagemCaa({ ...PADRAO, fatorAC: 1.5 });
const temAviso = forte.avisos.some((a) => a.campo === "fatorAC");
console.log(`a/c = 1,5 gera aviso: ${temAviso}`);
if (!temAviso) falhas.push("a/c fora de faixa não gerou aviso");

const arg = calcularDosagemCaa({ ...PADRAO, teorArgamassa: 99 });
const avisoArg = arg.avisos.some((a) => a.campo === "teorArgamassa");
console.log(`teor de argamassa = 99% gera aviso de faixa: ${avisoArg}`);
if (!avisoArg) falhas.push("teor de argamassa fora de faixa não gerou aviso");

// m <= 0 quebra de verdade: a massa específica não cobre nem cimento + água.
// Com C=400 e a/c=0,5, qualquer γ <= 600 kg/m³ zera os agregados.
const semAgregado = calcularDosagemCaa({ ...PADRAO, massaEspecifica: 500 });
const erroMassa = semAgregado.avisos.some((a) => a.severidade === "erro");
console.log(`massa específica = 500 kg/m³ gera erro: ${erroMassa}`);
if (!erroMassa) falhas.push("massa específica impossível não gerou erro");

console.log("");
if (falhas.length) {
  console.error(`${falhas.length} FALHA(S):`);
  falhas.forEach((f) => console.error(` - ${f}`));
  process.exit(1);
}
console.log("Todos os casos conferem com a planilha.");
