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
- **Tailwind CSS 3 + shadcn/ui** (estilo "new-york", base neutral)
- **Zod** — validação
- **Netlify** — deploy (runtime OpenNext, instalado automaticamente)

> `vercel.json` continua no repo: a Vercel era o plano original e o acesso à
> conta ficou travado no 2FA. Se um dia voltar, o projeto sobe lá também sem
> mudança nenhuma.
>
> **Cloudflare Workers foi avaliado e descartado**: exigiria trocar
> `PrismaClient` por `@prisma/adapter-pg` e provavelmente provisionar um
> Hyperdrive, porque Workers não tem runtime Node completo. Some-se a isso o
> conflito entre `?pgbouncer=true` (parâmetro do motor do Prisma, ignorado
> pelo driver `pg`) e o pooler do Supabase em modo transaction, que não
> aceita prepared statements. Netlify e Vercel rodam Node, então o Prisma
> funciona igual ao ambiente local.

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

4. **A organização vem sempre da URL** (`/o/[idOrg]/...`), nunca de cookie ou
   "organização ativa" em sessão. Um usuário pode pertencer a várias
   organizações, e estado implícito de tenant é a origem clássica de vazamento
   entre clientes. Mesmo padrão do Bolicho com `requireMembro(idTurma)`.

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
src/app/(app)/                área logada
src/app/(app)/o/[idOrg]/      escopo da organização (módulos, membros)
src/app/auth/callback/        route handler dos e-mails do Supabase
src/app/superadmin/           painel do superadmin
src/lib/prisma.ts             cliente Prisma (singleton)
src/lib/auth.ts               requireConta()
src/lib/organizacao.ts        requireMembroOrg / requireAdminOrg
src/lib/modulo.ts             requireModulo() — o gate comercial
src/lib/superadmin.ts         requireSuperadmin()
src/lib/supabase/             clients server/browser/admin + middleware
src/lib/validations/          schemas Zod
src/components/ui/            shadcn
src/middleware.ts             sessão (não autorização)
```

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
| 6 | Calculadoras a partir das planilhas | Planejada |

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

### Módulos ativos

`estrutura-concreto` · `estrutura-metalica` · `concreto-fresco-endurecido`

Para criar outro: adicionar em `src/core/registry.ts` e rodar
`npm run db:sync-modulos`. O slug é a chave estável (vai na URL e no
`requireModulo()`) — trate como imutável.

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
