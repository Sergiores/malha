# CLAUDE.md — Projeto Malha

Contexto para o Claude Code continuar o desenvolvimento. Leia antes de começar.

## O que é

Plataforma SaaS de cálculo estrutural para engenheiros, vendida por assinatura.
O usuário tem planilhas Excel de cálculo que usa profissionalmente e quer
transformá-las em produto. Domínio: **malha.personalgestor.com.br**.

O sistema é **modular**: cada módulo é licenciado separadamente para uma
organização, com data de vencimento controlada pelo superadmin.

Material de origem em `docs/`:
- `1. Planilha Dosagem CAA.xlsx` — dosagem de Concreto Autoadensável (Tutikian)
- `2. Planilha Idade do Concreto.xlsx` — NBR 6118 §12.3.3
- `WhatsApp Image 2026-08-02 at 21.23.01.jpeg` — placa de base com momento
  fletor (NBR 8800 + Bellei). **O `.xlsx` desta ainda não foi fornecido.**

## Stack

- **Next.js 15.5** (App Router, TypeScript) — full-stack
- **Prisma 6** (ORM) sobre **Supabase / PostgreSQL**
- **Supabase Auth** — autenticação (e-mail/senha)
- **Tailwind CSS 3 + shadcn/ui** (estilo "new-york")
- **Zod** — validação
- **Vercel** — deploy, funções na região `gru1` (São Paulo)

> **A região da função é a configuração mais importante deste projeto.**
> `gru1` fica ao lado do banco (`sa-east-1`). Não mude sem medir: o projeto
> já rodou com as funções em `us-east-2` e um `SELECT 1` levava **624 ms** —
> só ida e volta, sem trabalho nenhum. Cada navegação pagava esse pedágio 3
> ou 4 vezes, e a tela demorava ~1,8 s. Com `gru1`, caiu para ~250 ms.
> O plano Hobby permite uma região; conferir em Settings → Functions.
>
> **Cloudflare Workers foi avaliado e descartado**: exigiria trocar
> `PrismaClient` por `@prisma/adapter-pg` e provavelmente provisionar um
> Hyperdrive, porque Workers não tem runtime Node completo. Some-se a isso o
> conflito entre `?pgbouncer=true` (parâmetro do motor do Prisma, ignorado
> pelo driver `pg`) e o pooler do Supabase em modo transaction, que não
> aceita prepared statements.
>
> O projeto **mplace** (`D:\Projetos\PersonalGestorMPlace`) roda em Workers,
> mas por outro caminho: usa `supabase-js` (API REST, HTTP) em vez de ORM
> com conexão TCP. O **PersonalComissao** usa `supabase-js` na Vercel. O
> Malha é o único com Prisma — a troca daria migrations versionadas e tipos
> gerados, ao custo de precisar de runtime Node e de conexão ao banco.

> A stack foi copiada do projeto **Bolicho** (`D:\Projetos\Bolicho\Bolicho`),
> que já roda em produção. Quando estiver em dúvida sobre um padrão, olhe lá
> primeiro — a resposta provavelmente já existe.

### Diferenças conscientes em relação ao Bolicho

1. **PKs `Int`, não `BigInt`.** O Bolicho usa `BigInt` e paga o preço em toda
   serialização JSON. Aqui não.
2. **`SUPERADMIN_EMAIL` vem do ambiente**, não hard-coded como em
   `Bolicho/src/lib/superadmin.ts:8`. É produto vendido — trocar o e-mail não
   deve exigir deploy.
3. **`overrides` no `package.json`** fixam `postcss` e `sharp` em versões sem
   CVE. Sem isso o `npm audit` acusa 3 vulnerabilidades altas transitivas do
   Next. Não remova sem rodar `npm audit` depois.

## Comandos

```bash
npm run dev            # desenvolvimento (localhost:3000)
npm run build          # prisma generate + next build
npm run db:migrate     # aplicar migrations (prisma migrate dev)
npm run db:push        # empurrar schema sem migration (dev rápido)
npm run db:seed        # superadmin + sincronização de módulos
npm run db:sync-modulos # só a sincronização do registry -> banco
npm run db:studio      # inspecionar dados
```

## Setup de ambiente

Copie `.env.example` para `.env` e preencha com os dados do projeto Supabase.
Cinco variáveis: `DATABASE_URL` (pooler 6543 + `?pgbouncer=true`), `DIRECT_URL`
(direta 5432, só para o Migrate), `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`. Mais
`SUPERADMIN_EMAIL` e `SUPERADMIN_PASSWORD` (esta última só para o seed).

No Supabase, em Authentication → URL Configuration, configure Site URL e
Redirect URLs (`/auth/callback` e `/redefinir-senha`). Em dev, considere
desativar a confirmação de e-mail.

## Decisões de arquitetura (importantes)

1. **Licença por organização, não por usuário.** Uma `Organizacao` assina
   módulos e tem N membros. O engenheiro autônomo é uma organização de 1.

2. **Dois níveis: `Modulo` contém `Calculadora`.** Módulo é o que se
   *licencia* (Estrutura de Concreto, Estrutura Metálica, Concreto
   Fresco/Endurecido); calculadora é o que se *executa* (placa de base,
   dosagem CAA, idade do concreto). Não confunda os dois.

3. **`Modulo` é tabela, não enum** — o superadmin precisa geri-los sem deploy.
   Um registry no código (`src/core/registry.ts`) declara os módulos e
   `sincronizarModulos()` faz upsert no banco. Criar módulo = adicionar
   entrada no registry. A sincronização **nunca apaga**: módulo removido do
   registry vira `ativo = false`, preservando licenças históricas.

4. **Monousuário por enquanto.** Cada conta ganha uma `Organizacao` própria,
   criada sob demanda por `organizacaoPessoal()` no primeiro acesso e
   invisível na interface. A licença continua morando em `Organizacao`, então
   ligar o multiusuário depois é reativar telas — não migrar dados.

   A organização vem da **sessão**, não da URL: como é 1:1 com a conta, não há
   escolha do usuário e portanto não há como forjar. Quando o multiusuário
   voltar, o `idOrg` volta para a URL (`/o/[idOrg]/...`) e os guards de membro
   voltam junto — aí estado implícito de tenant volta a ser perigoso.

5. **Guards em profundidade.** Todo guard roda no **layout**, é repetido na
   **page** e no topo de **cada server action**. O guard no layout é o que
   impede uma sub-rota criada meses depois de vazar por esquecimento.
   Esconder link do menu não é controle de acesso.

6. **`notFound()` em vez de redirect** quando o recurso não pertence ao
   usuário — 403 confirmaria que a rota existe.

## Estrutura de pastas (alvo)

```
prisma/schema.prisma          modelo de dados
prisma/seed.ts                superadmin + sincronizarModulos()
prisma/sync-modulos.ts        só a sincronização
src/core/registry.ts          declaração de módulos e calculadoras
src/app/(auth)/               login, cadastro, recuperar/redefinir senha
src/app/(app)/                área logada (layout com menu lateral)
src/app/(app)/m/[slug]/       escopo do módulo — calculadoras entram aqui
src/app/(app)/sem-acesso/     licença ausente, vencida ou revogada
src/app/auth/callback/        route handler dos e-mails do Supabase
src/app/superadmin/           painel do superadmin
src/components/menu-modulos.tsx  menu lateral, habilitado por licença
src/lib/prisma.ts             cliente Prisma (singleton)
src/lib/auth.ts               requireConta()
src/lib/organizacao.ts        organizacaoPessoal() — cria sob demanda
src/lib/modulo.ts             requireModulo() — o gate comercial
src/lib/superadmin.ts         requireSuperadmin()
src/lib/supabase/             clients server/browser/admin + middleware
src/lib/validations/          schemas Zod
src/components/ui/            shadcn
src/middleware.ts             sessão (não autorização)
```

## Identidade visual — "prancheta técnica"

A referência é papel de desenho de engenharia. Quem usa isto assina laudo,
então precisão vem antes de efeito: brilho demais atrapalha a leitura de um
número.

- **Malha milimetrada no fundo** (`body` em `globals.css`): dois grids
  sobrepostos, 12 px e 96 px. Some na impressão.
- **Azul de cianotipia** como primária (`199 89%`), nos dois temas.
- **Números em monoespaçada** (JetBrains Mono, `font-mono`) nos indicadores,
  no traço unitário e nas tabelas — coluna de número desalinhada é número
  difícil de conferir.
- **Utilitários próprios**: `.card-tec` (cartão translúcido, deixa a malha
  aparecer), `.canto-tecnico` (cantoneira de cota que acende no hover),
  `.varredura` (luz que cruza o item), `.surgir` (entrada escalonada).
- `prefers-reduced-motion` zera todas as animações.

⚠️ **As variáveis de tema ficam FORA de `@layer base`.** Dentro da layer o
Tailwind descarta regras cujo seletor não aparece no código escaneado — e
como ninguém escreve `className="dark"` à mão, o bloco `.dark` sumia do CSS
final. O tema escuro simplesmente não existia e nada quebrava: a página só
continuava clara.

O alternador (`src/components/alternador-tema.tsx`) tem três estados e grava
em `localStorage`. Um script inline no `layout.tsx` raiz aplica a classe
**antes da primeira pintura** — sem ele, quem usa o tema escuro leva um
clarão branco a cada carregamento.

## Padrões a seguir

- **Forms:** server actions + `useActionState`, retorno tipado `ActionState`
  (`{ error?, success? }`).
- **Validação:** sempre Zod em `src/lib/validations/`, validada no server action.
- **UI:** shadcn em `src/components/ui/` (forwardRef + `cn()`).
- **Idioma:** UI e nomes de domínio em português; código/tipos podem misturar.

## Estado das fases

| Fase | Escopo | Status |
|------|--------|--------|
| 0 | Fundação: andaime, Supabase, deploy | ✅ Concluída (deploy pendente) |
| 1 | Autenticação e Conta | ✅ Concluída |
| 2 | Schema + registry + seed do superadmin | ✅ Concluída |
| 3 | Organizações, membros, papéis | ✅ Concluída |
| 4 | Painel do superadmin (contas, licenças, módulos) | ✅ Concluída |
| 5 | `requireModulo()` + navegação por licença | ✅ Concluída |
| — | Deploy em produção | ✅ No ar |
| 6 | Calculadoras a partir das planilhas | 🔄 Dosagem CAA pronta |

### Fase 0 — o que já está pronto

- Next 15.5.22 + TS + Tailwind 3 + shadcn (button, card, input, label)
- `npm audit` limpo (via `overrides`), `npm run build` e `tsc --noEmit` passando
- Clients Supabase (`server`, `client`, `admin`, `middleware`) e Prisma
- `src/middleware.ts` com o matcher
- `prisma/schema.prisma` só com datasource/generator
- `prisma/seed.ts` e `prisma/sync-modulos.ts` como stubs
- **Conexão com o Supabase validada** — `DATABASE_URL` e `DIRECT_URL` conectam
- **Pendente:** deploy na Vercel + subdomínio (pode esperar a Fase 1)

### Fase 1 — decisões

- **`Conta.trocarSenha`**: quando `true`, `requireConta()` manda para
  `/redefinir-senha` e nada mais da área logada abre. O seed cria o
  superadmin com essa flag ligada; `redefinirSenha()` a desliga.
- **Mensagens que não vazam cadastro**: login errado devolve sempre
  "E-mail ou senha incorretos"; recuperação de senha responde "se o e-mail
  existir…" mesmo quando não existe.
- **`/auth/callback` valida o `next`**: só aceita caminho interno começando
  com `/` e não `//`. Sem isso o link do e-mail viraria redirect aberto.
- **Guard no layout `(app)`**: toda rota criada sob esse grupo já nasce
  protegida; as pages repetem `requireConta()` e o `cache()` do React faz as
  chamadas virarem uma consulta só.
- A troca de senha usa o fluxo de e-mail do Supabase (não há formulário de
  "senha atual + nova"). Simples e sem manipular hash.

### Fase 1 — validado no navegador

`/app` sem sessão → login · login do superadmin → `/redefinir-senha` (flag
`trocarSenha`) · login comum → `/app` · edição de perfil grava · logout
volta ao login · conta inativada → login recusado com aviso.

### Fase 2 — decisões

- **Tabelas**: `Organizacao`, `OrganizacaoMembro` (N:N com `papel`),
  `Modulo`, `Calculadora`, `OrganizacaoModulo` (a licença) e `LogAuditoria`.
- **`Calculadora` nasce vazia** — a estrutura existe, mas nenhuma
  calculadora é semeada. Elas entram só quando as planilhas forem portadas.
- **`OrganizacaoModulo.validoAte` aceita null** = licença sem prazo. E o
  campo `ativo` permite revogar na hora sem mexer nas datas.
- **`Organizacao.ativa = false`** derruba todos os membros de uma vez,
  independentemente das licenças — é o bloqueio comercial.
- **`sincronizarModulos()` nunca apaga.** Verificado por teste: módulo e
  calculadora fora do registry viram `ativo = false`, e a licença que
  apontava para eles é preservada. Apagar destruiria o histórico de quem
  comprou o quê.
- Os scripts em `prisma/` importam de `src/` por **caminho relativo** — o
  alias `@/` do tsconfig não é resolvido pelo tsx fora de `src/`.

### Fase 3 — decisões

- **Qualquer usuário logado pode criar organização** e vira ADMIN dela. É
  inofensivo: sem licença concedida pelo superadmin, a organização não dá
  acesso a nada. Facilita trial e não bloqueia venda.
- **Entrada por código de convite** (`Organizacao.codigoConvite`, Crockford
  Base32 de 6 caracteres, fixo e sem expiração), em vez de convite por
  e-mail — não depende de infra de e-mail transacional. O Zod faz
  `toUpperCase()`, então digitar minúsculo funciona.
- **Nunca fica sem admin**: `alternarPapel` e `removerMembro` recusam a
  operação quando o alvo é o último ADMIN da organização.
- **Actions revalidam o par (organização, membro)** antes de agir. Sem isso,
  um admin poderia mexer no vínculo de outra empresa passando um id
  arbitrário no formulário — o `idMembro` vem do HTML, não é confiável.
- Código de convite e botões de gestão só renderizam para ADMIN, **e** as
  actions checam de novo. Esconder botão não é controle de acesso.

### Fase 3 — validado no navegador

Ana cria organização e vira admin · os 3 módulos aparecem como "Não
contratado" · Bruno (não membro) recebe **404** em `/o/1`, não 403 · Bruno
entra com o código digitado em minúsculas e vira Membro · membro comum não
vê código nem botões · rebaixar o último admin é recusado · Ana promove
Bruno e então consegue se rebaixar.

### Fase 4 — decisões

- **`requireSuperadmin()` também checa `ativa` e `trocarSenha`.** O painel que
  controla o licenciamento de todos os clientes é o último lugar para abrir
  exceção à regra da área logada.
- **Conceder é upsert** sobre `(organizacao, modulo)`: conceder de novo é
  renovar, e reativa licença revogada — o que se espera quando o cliente
  volta a pagar.
- **Revogar não apaga**: `ativo = false` preserva datas e observação. Apagar
  esconderia que o cliente já teve acesso.
- **Trocar senha de terceiro liga `trocarSenha`** na conta alvo: quem definiu
  a senha não deve continuar sabendo a senha de quem usa.
- **Superadmin não se inativa** — seria irreversível pela interface.
- **Datas em UTC puro.** As colunas são `@db.Date` e o `<input type="date">`
  manda `YYYY-MM-DD`; `dataUtc()`/`isoDeData()` em
  `src/lib/validations/superadmin.ts` evitam o dia escorregar por fuso.
- **`registrar()` nunca derruba a operação principal** — perder uma linha de
  auditoria é ruim, abortar uma concessão já gravada é pior.
- `LogAuditoria.idConta` é `onDelete: SetNull`: o log sobrevive à exclusão da
  conta e passa a exibir "sistema". Verificado.

### Fase 4 — validado no navegador

Conta comum recebe **404 nas seis rotas** do painel (verificado por fetch, não
só na primeira) · superadmin com `trocarSenha` pendente é barrado até trocar ·
criar organização já vinculando o admin por e-mail · conceder Estrutura
Metálica com prazo → cliente vê "Liberado" com a vigência certa · data final
anterior à inicial é recusada · recuar as datas → cliente vê "Vencido" ·
auditoria registra tudo com autor e detalhes.

⚠️ **A flag `trocarSenha` do superadmin está desligada** desde a validação
(o Supabase recusa redefinir para a mesma senha). A senha inicial continua
valendo. Para voltar a exigir a troca:
`UPDATE conta SET trocar_senha = true WHERE email = '<superadmin>';`

### Fase 5 — decisões

- **`requireModulo(idOrg, slug)`** em `src/lib/modulo.ts` é o gate comercial.
  Chamado no `layout.tsx` da rota do módulo, então **toda calculadora futura
  já nasce protegida** sem ninguém precisar lembrar.
- **Duas falhas, dois comportamentos**, de propósito:
  - módulo inexistente ou desativado → `notFound()`, porque não há o que
    contratar;
  - licença ausente, vencida ou revogada → `/o/[idOrg]/sem-acesso` com o
    motivo. É cliente legítimo numa porta fechada, não invasor — merece
    saber o que houve e o que fazer.
- **`sem-acesso` lê o nome do módulo do banco**, não da query string: o
  parâmetro vem do usuário e seria refletido na tela.
- **Card só vira link quando vigente** — mas isso é conveniência. Quem digitar
  a URL do módulo bloqueado esbarra em `requireModulo()` do mesmo jeito.

### Fase 5 — validado no navegador

| Situação | Resultado |
|---|---|
| Licença vigente | abre o módulo |
| Vencida | `/sem-acesso?motivo=vencida`, com a data de encerramento |
| Sem licença | `/sem-acesso?motivo=sem_licenca` |
| Revogada | `/sem-acesso?motivo=revogada` — corte imediato |
| Slug inexistente | 404 |
| Não-membro (inclusive o superadmin) | 404 em todas as rotas de `/o/3` |

Reativar a licença devolve o acesso e o card volta a ser link.

### Simplificação para monousuário

As telas de criar organização, entrar por código de convite e gerir membros
**foram removidas** (estão no histórico do git, commits das Fases 3 a 5). O
que sobrou:

- `organizacaoPessoal()` cria a organização da conta no primeiro acesso
- menu lateral fixo com os três módulos, habilitados conforme licença
- módulo bloqueado **continua visível** no menu e leva a `/sem-acesso` — o
  cliente precisa saber que existe para querer contratar
- no painel do superadmin, a aba "Organizações" virou lista de **clientes**,
  mostrando o e-mail do dono; não há mais criação manual

`Organizacao.codigoConvite` continua no schema, preenchido automaticamente.
Volta a ter uso quando o multiusuário chegar.

### Calculadoras — como adicionar

Cada calculadora vive em `src/core/calculators/<slug>/`:

- `schema.ts` — Zod das entradas, faixas de validade e valores padrão
- `calc.ts` — **função pura**: sem I/O, sem data, sem banco. É o que torna o
  resultado reproduzível e testável.
- `verificar.ts` — paridade com a planilha de origem

Depois: registrar em `src/core/registry.ts` (dentro do módulo certo), rodar
`npm run db:sync-modulos`, e criar a rota em
`src/app/(app)/m/[slug]/<calc-slug>/`.

Cada `schema.ts` expõe dois conjuntos de valores, e eles não devem ser
confundidos:

- **`VAZIO`** — o que o formulário mostra ao abrir uma análise nova. Campos
  em branco. Pré-preencher com exemplo fazia o engenheiro apagar campo por
  campo e, pior, permitia salvar um laudo com número de amostra achando que
  era o seu.
- **`PADRAO`** — o caso de referência da planilha. Serve só ao
  `verificar.ts`; nenhuma tela usa.

**`npm run verificar:calculos` é o critério de aceite.** Se os números
mudarem, o motor divergiu da planilha que o engenheiro já valida na prática
— isso precisa ser decisão, não acidente.

### Dosagem CAA — decisões

- **Resultado recalculado no servidor ao salvar**, nunca aceito do
  formulário. Senão daria para forjar um laudo com números que a fórmula não
  produz.
- **Snapshot em `Analise.resultados`**: o laudo mostra o que foi gravado, não
  um recálculo. Um laudo de março tem de exibir os mesmos números em
  dezembro, mesmo que preços ou fórmula mudem.
- **Preços são entradas**, não constantes na fórmula — era o defeito da
  planilha original e o que fazia o custo envelhecer sozinho.
- **Avisos em vez de bloqueio** para valores fora da faixa usual; erro só
  quando a matemática deixa de ter sentido físico (ex.: massa específica que
  não cobre cimento + água).
- Custo do caso de referência dá **R$ 405,03** contra R$ 405,06 da planilha:
  3 centavos de diferença por arredondamento dos preços unitários. Dentro da
  tolerância do teste.
- **Gráficos em SVG puro**, sem lib de charting: economiza dezenas de kB num
  app que o engenheiro abre no canteiro, e SVG imprime bem no laudo — canvas
  não.
- **Laudo em PDF pela impressão do navegador** (`@media print` em
  `globals.css`), sem biblioteca de geração no servidor.

### Granulometria de Areias — decisões

- **Peneiras têm dois atributos independentes**: `serieNormal` (entra no
  módulo de finura) e `temLimite` (tem zona na NBR 7211). A 6,3 mm tem
  limite mas não entra no MF; abaixo de 0,15 mm não há zona normativa, e
  essas peneiras aparecem na curva sem enquadrar nem reprovar. Confundir os
  dois é o erro clássico ao portar esse cálculo.
- **Curva com eixo Y invertido e X logarítmico** — é a convenção do ensaio.
  Desenhada linear e crescente, fica irreconhecível para um engenheiro.
- **`melhorTeor()` varre de 0 a 100%** e sugere o teor de mistura com melhor
  enquadramento. Era o que a planilha obrigava a fazer por tentativa manual.
- **MF da mescla dá 2,46**, não os 2,39 exibidos na planilha. A própria
  coluna Mescla da planilha leva a 2,46:
  `(0 + 1,2 + 9,4 + 25,1 + 41,1 + 73,7 + 95,7)/100`, e a média ponderada
  confirma: `0,10 × 0,76 + 0,90 × 2,65`. Adotado o valor normativo; se a
  planilha estiver certa, o teste de paridade é que vai acusar.
- O laudo escolhe o corpo pelo **slug da calculadora** — cada uma tem seu
  formato de resultado, e não há um schema único para todas.

### Módulo Geral e Clientes — decisões

- **`Geral` é módulo base**: liberado automaticamente na criação da
  organização (`MODULOS_BASE` em `src/lib/organizacao.ts`) e sem prazo. Sem
  a carteira de clientes as análises perdem a identificação, então travar
  isso atrás de licença criaria um impasse. O superadmin ainda pode revogar.
  Para organizações antigas: `npm run db:liberar-base`.
- **O cadastro entra como `Calculadora`** — a tabela é "o que se executa
  dentro do módulo", e um cadastro cabe nisso. Evita um segundo conceito de
  item de menu. `MODULOS_SEM_ANALISE` no registry impede que o menu ofereça
  "Análises" num módulo que só tem cadastro.
- **CPF/CNPJ guardado só com dígitos**, com validação dos dígitos
  verificadores (`src/lib/documento.ts`). Guardar com máscara faria a mesma
  empresa entrar duas vezes na carteira. A busca também tira a máscara, então
  "12.345" encontra "12345…".
- **Unique é `(organizacao, cpfCnpj)`**, não global: duas empresas podem ter
  o mesmo cliente em suas carteiras.
- **`Analise.idCliente` é opcional e `onDelete: SetNull`** — excluir um
  cliente não pode apagar laudos já emitidos.
- **Filtros da consulta ficam na URL**, não em estado local: dá para mandar o
  link de uma consulta pronta e o botão voltar funciona.
- **`/m/geral/clientes/[id]/analises` atravessa os módulos.** A carteira mora
  no Geral, mas as análises são de dosagem, de granulometria, do que vier —
  quem abre a ficha quer o histórico inteiro. Cada linha aponta para o
  módulo da *própria análise* (`calculadora.modulo.slug`), e é lá que o
  `requireModulo()` decide se a licença ainda vale. Montar o link com o slug
  da URL atual mandaria a análise de dosagem para a rota do Geral e daria
  404.
- 🚨 **O React 19 dá `form.reset()` quando a action termina — e isso zera
  `<select>`.** Comprovado num formulário de teste: depois do "Calcular", o
  `<input>` e o `<textarea>` voltam com o mesmo valor (o React mantém o
  atributo em dia), mas o `<select>` controlado não ganha `selected` em
  nenhuma `<option>`, então o reset escolhe a primeira — "— sem cliente —".
  Como o estado do React continuava correto, ele não via diferença para
  reaplicar: a tela mostrava um valor que o DOM já não tinha, e o "Salvar"
  seguinte mandava vazio. Tornar o campo controlado **não resolve**; a
  correção é o `useRef` + `useEffect` sem dependências em
  `src/components/seletor-cliente.tsx`, que reafirma o valor no DOM a cada
  commit. Vale para qualquer `<select>` que apareça dentro de um form com
  server action.
- ⚠️ **`<select>` precisa de `bg-background`, não `bg-transparent`.** A lista
  aberta é desenhada pelo sistema operacional: no tema escuro o Windows
  pintava o popup de branco enquanto o texto vinha do `--foreground` quase
  branco. A regra `select option` em `globals.css` cobre o caso para todo
  select, inclusive os que ainda não existem.

### Ciclo de vida da análise — decisões

- **Só `RASCUNHO` aceita alteração.** A regra mora em `gravarAnalise()`
  (`src/lib/analise-comum.ts`), no servidor, e não no botão: o `editarId`
  vem do HTML e não é confiável. Concluída ou aprovada, a análise vira
  laudo — e laudo emitido não se reescreve, se copia.
- **Copiar funciona em qualquer status** e sempre cria registro novo
  (`?copiar=<id>`), com o original intacto. É o caminho para revisar valores
  ou trocar o cliente depois que o laudo fechou.
- **O parecer não é copiado.** Ele é a leitura de um resultado específico;
  arrastá-lo para outra análise convidaria a assinar uma conclusão que
  ninguém releu. Título ganha "(cópia)", validade volta a vazio.
- **`aprovadaEm` é carimbo do servidor**, gravado por `alterarStatus` quando
  o status vira `APROVADA` e zerado quando sai. Não existe campo de data de
  aprovação no formulário — seria data declarada, não registrada.
- **`validoAte` é `@db.Date`**, gravada por `dataUtc()`, mesma defesa de fuso
  das licenças. Vencida aparece em vermelho no laudo e na lista.
- **Envio por WhatsApp foi retirado** (commit da remoção; o
  `src/lib/whatsapp.ts` original está no histórico). O motivo: `wa.me` só
  aceita o parâmetro `text` — não existe anexo por link. E o laudo em PDF
  nasce da impressão do navegador, que não devolve `Blob` ao JavaScript,
  então nem `navigator.share({files})` tem o que compartilhar. Mandar só
  resumo em texto entrega menos do que o engenheiro espera do botão.
  Para voltar, a decisão pendente é entre **link público com token**
  (barato, mas expõe o laudo a quem tiver a URL) e **gerar o PDF de fato**
  (`@react-pdf/renderer` obriga a reescrever o laudo inteiro, e aí o layout
  passa a existir em duas versões que podem divergir).
- ⚠️ **Parecer e validade são campos controlados**, pelo mesmo motivo do
  `<select>` de cliente: o botão "Calcular" reenvia o formulário, e perder um
  parecer longo num recálculo seria o pior defeito possível desse campo.

### Módulos ativos

`geral` (base) · `estrutura-concreto` · `estrutura-metalica` ·
`concreto-fresco-endurecido`

Para criar outro: adicionar em `src/core/registry.ts` e rodar
`npm run db:sync-modulos`. O slug é a chave estável (vai na URL e no
`requireModulo()`) — trate como imutável.

### Produção

- **https://malha.personalgestor.com.br** — Vercel, funções em `gru1`.
  Certificado automático. Deploy a cada push em `main`.
- Repositório: `github.com/Sergiores/malha` (o remote usa
  `https://Sergiores@github.com/...` porque o Windows guarda a credencial de
  outra conta GitHub; sem o usuário na URL o push dá 403).
- DNS do domínio fica na **Cloudflare**: CNAME `malha` →
  `cname.vercel-dns.com`, com o proxy **desligado** (DNS only). Com proxy
  ligado a emissão do certificado não valida.
- Latência esperada de uma navegação autenticada: **~250 ms**. Se subir para
  a casa do segundo, o primeiro suspeito é a região da função.

⚠️ **Dev e produção usam o MESMO banco Supabase.** Enquanto não houver
cliente pagando, tudo bem. Antes do primeiro, crie um segundo projeto
Supabase para desenvolvimento — hoje um teste local mexe em dados reais e
uma migration errada derruba o sistema de quem pagou.

### Skew protection

Cada build gera IDs novos para as server actions. Quem estava com a aba
aberta durante um deploy passa a chamar um ID que não existe mais — sintoma:
`UnrecognizedActionError` no console e 404 nos chunks, ou seja, um botão que
simplesmente para de responder. Já aconteceu aqui.

Na Vercel isso se ativa em **Settings → Advanced → Skew Protection**. Vale
ligar antes do primeiro cliente pagante: sem isso, publicar enquanto alguém
usa o sistema quebra a sessão dessa pessoa no meio de um cálculo.

Quando acontece, `Ctrl+Shift+R` resolve para o usuário.

### Correção do Prisma nas funções (não remova)

As funções rodam Amazon Linux + OpenSSL 3, e o Prisma carrega o engine por
caminho em runtime — o tracer do Next não o enxerga. Sem as duas correções
abaixo, **toda server action devolve 500**, inclusive as que nem tocam o
banco (o módulo importa o client no topo):

1. `binaryTargets = ["native", "rhel-openssl-3.0.x"]` em `schema.prisma`
2. `outputFileTracingIncludes` em `next.config.ts` copiando
   `node_modules/.prisma/client/**`

Sintoma característico: middleware funciona, formulários morrem em silêncio.

### Dados do projeto Supabase (confirmados por teste)

- ref: `btcighnzuaomovgpehru` · região: `sa-east-1` · host do pooler: `aws-0-…`
- Pooler transaction 6543 → `DATABASE_URL` (app)
- Pooler session 5432 → `DIRECT_URL` (Prisma Migrate)

## Notas / pegadinhas

- `.gitignore` ignora `.env*` mas tem exceção `!.env.example`. Se criar novos
  arquivos de exemplo, adicione a exceção.
- `DIRECT_URL` é obrigatória: migration não funciona pelo pooler do Supabase.
- 🚨 **NUNCA passe `--shadow-database-url` apontando para o banco real.**
  O Prisma trata a shadow database como descartável: dropa tudo e reaplica
  as migrations para calcular o diff. Isso já apagou os dados uma vez aqui.
  Se precisar do SQL de uma migration, use `prisma migrate dev` (ele cria a
  shadow sozinho) ou escreva o `migration.sql` à mão e rode
  `prisma migrate deploy`.
- **`prisma migrate dev` falha em ambiente não-interativo** quando o
  Prisma quer confirmar um aviso (ex.: `UNIQUE` em coluna nova). Saída:
  criar a pasta em `prisma/migrations/<timestamp>_<nome>/migration.sql` à
  mão e aplicar com `prisma migrate deploy`.
- **`prisma db execute` trava** contra o pooler transaction (6543) — o
  Supavisor nesse modo não fecha a sessão como o comando espera. Não é sinal
  de credencial errada. Para testar conexão use `prisma db pull` (que usa a
  `DIRECT_URL`) ou um script com o driver `pg`.
- Senha do banco com símbolos precisa de percent-encoding na connection
  string (`@` → `%40`). A atual é alfanumérica justamente para evitar isso.
- A senha do superadmin **nunca** deve ser escrita em arquivo versionado. O
  seed lê de `SUPERADMIN_PASSWORD` e o Supabase Auth guarda o hash.
