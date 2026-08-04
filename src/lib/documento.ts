/**
 * Validação e formatação de CPF/CNPJ.
 *
 * Guardamos só os dígitos. Máscara é assunto de exibição — misturar os dois
 * faz a mesma empresa entrar duas vezes na carteira, uma com pontuação e
 * outra sem.
 */

export function apenasDigitos(v: string): string {
  return v.replace(/\D/g, "");
}

/** Dígitos verificadores do CPF. */
function cpfValido(cpf: string): boolean {
  if (cpf.length !== 11) return false;
  // Rejeita sequências repetidas (00000000000, 11111111111…), que passam
  // no cálculo dos dígitos mas não existem.
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  for (const [tamanho, posicao] of [
    [9, 10],
    [10, 11],
  ] as const) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) {
      soma += Number(cpf[i]) * (posicao - i);
    }
    let dv = (soma * 10) % 11;
    if (dv === 10) dv = 0;
    if (dv !== Number(cpf[tamanho])) return false;
  }
  return true;
}

/** Dígitos verificadores do CNPJ. */
function cnpjValido(cnpj: string): boolean {
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calcular = (base: string, pesos: number[]) => {
    const soma = base
      .split("")
      .reduce((s, d, i) => s + Number(d) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const dv1 = calcular(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (dv1 !== Number(cnpj[12])) return false;

  const dv2 = calcular(
    cnpj.slice(0, 13),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  );
  return dv2 === Number(cnpj[13]);
}

/** Aceita CPF (11) ou CNPJ (14), já sem máscara. */
export function documentoValido(digitos: string): boolean {
  if (digitos.length === 11) return cpfValido(digitos);
  if (digitos.length === 14) return cnpjValido(digitos);
  return false;
}

/** Formata para exibição: 000.000.000-00 ou 00.000.000/0000-00. */
export function formatarDocumento(v: string | null | undefined): string {
  if (!v) return "—";
  const d = apenasDigitos(v);
  if (d.length === 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (d.length === 14) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return v;
}

/** Formata CEP: 00000-000. */
export function formatarCep(v: string | null | undefined): string {
  if (!v) return "";
  const d = apenasDigitos(v);
  return d.length === 8 ? d.replace(/(\d{5})(\d{3})/, "$1-$2") : v;
}

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;
