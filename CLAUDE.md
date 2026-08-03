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
- **Vercel** — deploy, região `gru1`

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
| 3 | Organizações, membros, papéis | Planejada |
| 4 | Painel do superadmin (contas, licenças, módulos) | Planejada |
| 5 | `requireModulo()` + navegação por licença | Planejada |
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
- **`prisma db execute` trava** contra o pooler transaction (6543) — o
  Supavisor nesse modo não fecha a sessão como o comando espera. Não é sinal
  de credencial errada. Para testar conexão use `prisma db pull` (que usa a
  `DIRECT_URL`) ou um script com o driver `pg`.
- Senha do banco com símbolos precisa de percent-encoding na connection
  string (`@` → `%40`). A atual é alfanumérica justamente para evitar isso.
- A senha do superadmin **nunca** deve ser escrita em arquivo versionado. O
  seed lê de `SUPERADMIN_PASSWORD` e o Supabase Auth guarda o hash.
