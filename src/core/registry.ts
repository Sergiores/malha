/**
 * Registry de módulos e calculadoras.
 *
 * Esta é a ÚNICA fonte de verdade sobre o que o sistema oferece. A rotina
 * `sincronizarModulos()` (src/core/sincronizar-modulos.ts) espelha o que
 * está aqui nas tabelas `modulo` e `calculadora`, para que o superadmin
 * possa licenciar sem ninguém precisar rodar INSERT em produção.
 *
 * Para criar um módulo novo: adicione uma entrada abaixo e rode
 * `npm run db:sync-modulos`. Ele aparece na gestão do superadmin.
 *
 * O `slug` é a chave estável — é ele que aparece na URL
 * (`/o/[idOrg]/m/[slug]`) e o que `requireModulo()` recebe. Renomear um
 * slug quebra links salvos e desvincula licenças: trate como imutável.
 */

export type CalculadoraDef = {
  slug: string;
  nome: string;
  descricao?: string;
};

export type ModuloDef = {
  slug: string;
  nome: string;
  descricao?: string;
  calculadoras: CalculadoraDef[];
};

export const MODULOS: ModuloDef[] = [
  {
    slug: "estrutura-concreto",
    nome: "Estrutura de Concreto",
    descricao:
      "Dimensionamento e verificação de elementos estruturais de concreto armado.",
    calculadoras: [],
  },
  {
    slug: "estrutura-metalica",
    nome: "Estrutura Metálica",
    descricao:
      "Dimensionamento e verificação de elementos e ligações em aço estrutural.",
    calculadoras: [],
  },
  {
    slug: "concreto-fresco-endurecido",
    nome: "Concreto Fresco/Endurecido",
    descricao:
      "Dosagem, controle tecnológico e propriedades do concreto nos estados fresco e endurecido.",
    calculadoras: [
      {
        slug: "dosagem-caa",
        nome: "Dosagem de CAA",
        descricao:
          "Concreto autoadensável pelo método Tutikian: traço unitário, consumo por m³ e composição de custo.",
      },
    ],
  },
];

/** Busca a definição de um módulo pelo slug. */
export function moduloPorSlug(slug: string): ModuloDef | undefined {
  return MODULOS.find((m) => m.slug === slug);
}
