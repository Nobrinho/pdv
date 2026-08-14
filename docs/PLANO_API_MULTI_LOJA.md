# Plano de Migracao Para API Multi-Loja

## Decisao

Vamos seguir com a arquitetura recomendada:

- Banco principal online em PostgreSQL.
- API Node.js central usando Knex.
- PDV Electron atual consumindo a API.
- Painel Admin Web para gerenciar todas as lojas.
- Compatibilidade com backup SQLite atual por meio de importador.

O objetivo e transformar o sistema atual em uma plataforma multi-loja sem descartar a base existente.

## Organizacao Atual Das Pastas

```txt
apps/
  pdv/        Aplicativo desktop Electron + React atual.
  pdv-back/   API Node.js + PostgreSQL multi-loja.
  pdv-admin/  Painel web administrativo futuro.

packages/
  shared/     Codigo compartilhado futuro.

docs/         Planejamento e guias de execucao.
```

## Arquitetura Alvo

```txt
PDV Desktop Electron
        |
        v
Electron IPC / API client local
        |
        v
API Node.js central
        |
        v
PostgreSQL online

Painel Admin Web
        |
        v
API Node.js central
```

## Principios

- O app desktop nunca acessa o banco online diretamente.
- O frontend nunca envia `loja_id` como fonte de verdade.
- A API identifica a loja pelo token autenticado.
- Todas as tabelas operacionais devem ser filtradas por `loja_id`.
- Vendas, estoque, fiado e cancelamentos devem usar transacoes.
- Backups antigos `.sqlite3` devem continuar importaveis.
- Bloqueio/liberacao de loja deve surtir efeito rapidamente.

## Modulos Do Sistema

### PDV Desktop

Usado pela loja para:

- Vender.
- Cadastrar produtos.
- Controlar estoque.
- Cadastrar clientes.
- Gerenciar fiado.
- Emitir recibos.
- Configurar loja.
- Entrar em uma loja online existente.
- Criar uma nova loja online.
- Importar backup SQLite antigo.

### API Central

Responsavel por:

- Autenticacao.
- Autorizacao.
- Isolamento por loja.
- Regras de negocio.
- Controle de status da loja.
- Controle de dispositivos.
- Operacoes transacionais.
- Backup/exportacao/importacao.
- Endpoints do painel admin.

### Painel Admin Da Plataforma

Usado pelo dono da plataforma para:

- Listar lojas.
- Criar loja manualmente.
- Bloquear/liberar/cancelar loja.
- Alterar plano.
- Ver usuarios e dispositivos.
- Autorizar ou remover dispositivos.
- Ver faturamento operacional das lojas.
- Ver faturamento da plataforma.
- Ver logs de auditoria.
- Resetar acesso de administradores de loja.

## Modelo De Acesso

### Platform Admin

Acesso global ao painel da plataforma.

Pode:

- Ver todas as lojas.
- Bloquear/liberar lojas.
- Gerenciar planos.
- Ver indicadores gerais.
- Gerenciar dispositivos e usuarios das lojas.

### Store Admin

Administrador de uma loja especifica.

Pode:

- Gerenciar usuarios da loja.
- Configurar loja.
- Cadastrar produtos, clientes e equipe.
- Vender e cancelar vendas, conforme permissao.

### Store User

Usuario operacional da loja.

Pode:

- Usar funcoes liberadas pelo cargo.
- Acessar apenas dados da propria loja.

## Tabelas Novas

### `lojas`

```txt
id
nome
documento
telefone
email
cidade
status
plano_id
trial_ends_at
bloqueada_em
bloqueio_motivo
criado_em
atualizado_em
```

Status previstos:

```txt
trial
active
past_due
blocked
cancelled
suspended
```

### `planos`

```txt
id
nome
preco_mensal
limite_usuarios
limite_dispositivos
limite_vendas_mes
recursos_json
ativo
criado_em
atualizado_em
```

### `assinaturas`

```txt
id
loja_id
plano_id
status
valor
vencimento
ultimo_pagamento_em
cancelada_em
criado_em
atualizado_em
```

### `dispositivos`

```txt
id
loja_id
nome_maquina
device_id
autorizado
ultimo_acesso_em
criado_em
atualizado_em
```

### `platform_users`

```txt
id
nome
email
password_hash
salt
role
ativo
criado_em
atualizado_em
```

### `platform_audit_logs`

```txt
id
platform_user_id
loja_id
acao
entidade
entidade_id
metadata_json
ip
user_agent
criado_em
```

### `store_invites`

```txt
id
loja_id
codigo
criado_por_usuario_id
expira_em
usado_em
ativo
criado_em
```

## Tabelas Atuais Que Devem Receber `loja_id`

- `usuarios`
- `configuracoes`
- `cargos`
- `pessoas`
- `produtos`
- `historico_produtos`
- `clientes`
- `contas_receber`
- `vendas`
- `venda_itens`
- `venda_pagamentos`
- `servicos_avulsos`
- `orcamentos`
- `orcamento_itens`
- `event_logs`

## Indices Iniciais Recomendados

```sql
CREATE INDEX idx_produtos_loja_ativo ON produtos(loja_id, ativo);
CREATE INDEX idx_produtos_loja_codigo ON produtos(loja_id, codigo);
CREATE INDEX idx_clientes_loja_nome ON clientes(loja_id, nome);
CREATE INDEX idx_vendas_loja_data ON vendas(loja_id, data_venda DESC);
CREATE INDEX idx_contas_receber_loja_cliente ON contas_receber(loja_id, cliente_id);
CREATE INDEX idx_event_logs_loja_data ON event_logs(loja_id, occurred_at_ms DESC);
CREATE INDEX idx_dispositivos_loja_device ON dispositivos(loja_id, device_id);
```

## Endpoints Do PDV

### Onboarding

```txt
POST /store/onboarding/create
POST /store/onboarding/join
POST /store/onboarding/import-sqlite
```

### Auth

```txt
POST /auth/login
POST /auth/logout
POST /auth/refresh
GET /auth/me
```

### Produtos

```txt
GET /products
GET /products/search
POST /products
PUT /products/:id
DELETE /products/:id
GET /products/:id/history
POST /products/import-batch
```

### Clientes

```txt
GET /clients
POST /clients
PUT /clients/:id
DELETE /clients/:id
GET /clients/:id/debts
POST /clients/:id/pay-debt
```

### Vendas

```txt
POST /sales
GET /sales
GET /sales/:id/items
POST /sales/:id/cancel
POST /sales/commissions/pay
```

### Configuracoes

```txt
GET /config
GET /config/:key
PUT /config/:key
GET /tenant
```

### Relatorios E Dashboard

```txt
GET /dashboard/stats
GET /dashboard/weekly-sales
GET /dashboard/low-stock
GET /dashboard/inventory
GET /reports/sales
```

## Endpoints Do Painel Admin

```txt
POST /platform/auth/login
POST /platform/auth/logout
GET /platform/me

GET /platform/dashboard
GET /platform/stores
POST /platform/stores
GET /platform/stores/:id
PUT /platform/stores/:id

POST /platform/stores/:id/block
POST /platform/stores/:id/unblock
POST /platform/stores/:id/cancel
POST /platform/stores/:id/change-plan

GET /platform/stores/:id/users
POST /platform/stores/:id/users/:userId/reset-password
POST /platform/stores/:id/users/:userId/deactivate

GET /platform/stores/:id/devices
POST /platform/stores/:id/devices/:deviceId/authorize
POST /platform/stores/:id/devices/:deviceId/block

GET /platform/billing
GET /platform/audit-logs
```

## Fluxo De Criacao De Loja

```txt
1. PDV chama POST /store/onboarding/create.
2. API cria loja com status `trial` ou `active`.
3. API cria configuracoes iniciais.
4. API cria usuario `store_admin`.
5. API registra dispositivo atual.
6. API retorna tokens.
7. PDV salva credenciais locais.
8. PDV entra no sistema.
```

## Fluxo De Entrada Em Loja Existente

```txt
1. Usuario escolhe "Entrar em loja existente".
2. Informa convite, codigo ou credenciais de admin.
3. API valida loja, plano e limite de dispositivos.
4. API registra ou reativa dispositivo.
5. API retorna token scoped para a loja.
6. PDV carrega dados online.
```

## Bloqueio De Loja

```txt
1. Platform admin bloqueia loja no painel.
2. API atualiza `lojas.status = blocked`.
3. Middleware da API passa a negar operacoes.
4. PDV exibe mensagem de acesso suspenso.
```

Operacoes de leitura basicas podem ser permitidas ou bloqueadas conforme regra comercial. Operacoes de escrita devem ser bloqueadas.

## Backup E Restore

### Compatibilidade Com SQLite Atual

Manter importador de backup antigo:

```txt
syscontrol.sqlite3
        |
        v
leitor/importador
        |
        v
API
        |
        v
loja online
```

Esse fluxo deve importar:

- Configuracoes.
- Usuarios.
- Cargos.
- Pessoas.
- Produtos.
- Clientes.
- Vendas.
- Pagamentos.
- Contas a receber.
- Orcamentos.
- Logs, quando aplicavel.

### Novo Backup Online Por Loja

Formato sugerido:

```txt
backup_loja_{loja_id}_{data}.zip
  metadata.json
  configuracoes.json
  usuarios.json
  cargos.json
  pessoas.json
  produtos.json
  historico_produtos.json
  clientes.json
  vendas.json
  venda_itens.json
  venda_pagamentos.json
  contas_receber.json
  servicos_avulsos.json
  orcamentos.json
  orcamento_itens.json
```

Modos de restore:

- Restaurar em nova loja.
- Restaurar sobre loja atual, com backup automatico antes.
- Mesclar dados, em fase futura.

## Fases De Execucao

### Fase 1 - Base Da API

Entregas:

- Criar projeto da API Node.
- Configurar Knex com PostgreSQL.
- Criar migrations de plataforma.
- Criar autenticacao base.
- Criar middleware de loja, usuario, dispositivo e status.
- Criar seed de `platform_admin`.

Criterio de aceite:

- API sobe localmente.
- Consegue criar loja.
- Consegue fazer login.
- Consegue bloquear/liberar loja.
- Middleware impede loja bloqueada.

### Fase 2 - Schema Multi-Loja

Entregas:

- Migrar schema atual para PostgreSQL.
- Adicionar `loja_id` nas tabelas operacionais.
- Criar indices.
- Ajustar diferencas SQLite/PostgreSQL.

Criterio de aceite:

- Banco novo sobe do zero por migrations.
- Uma loja consegue ter dados isolados de outra.

### Fase 3 - Produtos, Clientes E Configuracoes

Entregas:

- Migrar handlers de produtos para services da API.
- Migrar clientes.
- Migrar pessoas/cargos.
- Migrar configuracoes.
- Adaptar Electron para consumir endpoints.

Criterio de aceite:

- Dois PCs autenticados na mesma loja veem os mesmos produtos/clientes/configuracoes.

### Fase 4 - Vendas, Estoque E Fiado

Entregas:

- Migrar criacao de venda.
- Migrar cancelamento.
- Migrar pagamentos.
- Migrar contas a receber.
- Garantir transacoes.
- Garantir consistencia de estoque.

Criterio de aceite:

- Duas instalacoes vendem na mesma loja sem conflito de estoque.
- Cancelamento devolve estoque corretamente.
- Fiado e pagamento de divida funcionam online.

### Fase 5 - Onboarding Online

Entregas:

- Atualizar tela de onboarding.
- Criar fluxo "Criar nova loja".
- Criar fluxo "Entrar em loja existente".
- Registrar dispositivo.
- Salvar sessao local.

Criterio de aceite:

- Primeira instalacao cria loja.
- Segunda instalacao entra na mesma loja.

### Fase 6 - Painel Admin

Entregas:

- Criar admin web.
- Login de platform admin.
- Dashboard geral.
- Lista/detalhe de lojas.
- Bloquear/liberar/cancelar loja.
- Ver usuarios/dispositivos.
- Ver faturamento operacional por loja.

Criterio de aceite:

- Platform admin consegue controlar acesso de uma loja sem mexer no banco manualmente.

### Fase 7 - Backup E Importacao

Entregas:

- Importar backup SQLite antigo.
- Exportar backup online por loja.
- Restaurar backup em nova loja.
- Criar backup automatico antes de restore destrutivo.

Criterio de aceite:

- Um `syscontrol.sqlite3` atual pode virar uma loja online.
- Uma loja online pode ser exportada e restaurada.

### Fase 8 - Producao

Entregas:

- HTTPS.
- Logs estruturados.
- Monitoramento.
- Rate limit.
- Backups automaticos.
- Ambiente staging.
- Rotina de migracao segura.

Criterio de aceite:

- Sistema pronto para lojas reais com processo de recuperacao definido.

## Ordem Recomendada Para Comecar

1. Criar API em `apps/pdv-back/`.
2. Criar conexao PostgreSQL por variavel `DATABASE_URL`.
3. Criar migrations iniciais de plataforma.
4. Criar login de platform admin e store admin.
5. Criar endpoint de onboarding `create-store`.
6. Criar bloqueio/liberacao de loja.
7. Migrar produtos como primeiro modulo real.

## Status Atual De Implementacao

Implementado no repositório:

- Estrutura inicial da API em `apps/pdv-back/`.
- Configuracao Knex/PostgreSQL por `DATABASE_URL`.
- Scripts `server:migrate` e `server:dev`.
- Migrations de plataforma:
  - `planos`
  - `lojas`
  - `assinaturas`
  - `dispositivos`
  - `platform_users`
  - `platform_audit_logs`
  - `store_invites`
  - `usuarios`
  - `configuracoes`
- Migrations operacionais multi-loja:
  - `produtos`
  - `historico_produtos`
  - `event_logs`
  - `clientes`
  - `contas_receber`
  - `cargos`
  - `pessoas`
  - `vendas`
  - `venda_itens`
  - `venda_pagamentos`
- Autenticacao inicial para plataforma e lojas.
- Middleware de token, loja ativa e permissao administrativa.
- Onboarding online inicial de criacao de loja.
- Bloqueio/liberacao de loja pelo admin da plataforma.
- APIs iniciais para:
  - produtos
  - clientes/fiado
  - pessoas/cargos
  - vendas/cancelamento/comissoes
  - configuracoes/tenant

## Atualizacao MVP (29/07/2026)

Rodada de fechamento do MVP do SaaS. O que foi validado e entregue:

### Validacao contra PostgreSQL real

- As migrations rodam limpas do zero em um Postgres real (validado com PGlite = Postgres 16), criando as 24 tabelas e o seed do platform admin + plano `Basico`.
- Smoke test E2E completo passando: login plataforma, criar loja, login de loja, roles, pessoa, produto, cliente, venda com baixa de estoque transacional, bloqueio de loja -> 403 -> desbloqueio.
- Novo comando `npm run server:smoke:local`: sobe um Postgres embarcado (PGlite), aplica migrations, inicia a API e roda o smoke completo — sem precisar de Postgres instalado. Ideal para CI e para validar antes de cada release.
- `apps/pdv-back/src/db.js` agora aceita `DATABASE_POOL_MIN`/`DATABASE_POOL_MAX` por env (tuning de producao).

### Onboarding online — entrar em loja (join)

- Endpoint `POST /store/onboarding/join` implementado (`authService.joinStore`).
- Autentica usuario da loja, valida status da loja, registra/reativa o dispositivo e **aplica o limite de dispositivos do plano** (`registerDevice`). Suporta codigo de convite (`store_invites`) como alternativa ao ID da loja.
- Cliente do Electron (`apps/pdv/src/services/api.js`): novos metodos `auth.createStore` e `auth.joinStore`, device-id persistente por instalacao, e `setApiUrl` para configurar o servidor.
- Tela de login do Electron: seletor Local/Online, campo de URL da API, e sub-modos **Entrar** (join com registro de dispositivo) e **Criar loja** (cria a loja online e ja entra). Removidas as credenciais de dev hardcoded.

### Painel Admin (pdv-admin)

- Backend: `GET /platform/me`, `GET /platform/dashboard` (agregados da plataforma), `POST /platform/stores` (criar loja pelo admin), `GET /platform/stores/:id/users`, `GET /platform/stores/:id/devices`, `POST .../devices/:deviceId/authorize|block`. Acoes registram em `platform_audit_logs`.
- Frontend: abas **Lojas**, **Faturamento** (ranking por faturamento + totais) e **Acessos**; drawer de detalhe da loja com usuarios e dispositivos, com autorizar/bloquear dispositivo. Alem do bloqueio/liberacao de loja que ja existia.

### Importador SQLite -> loja online (Fase 7) — FEITO

- Endpoint `POST /store/import-sqlite` (`importService.importSqliteBackup`): recebe um dump no formato local, **remapeia os IDs** (os PKs online sao globais), **reescreve as chaves estrangeiras** em ordem de dependencia e **coage booleanos** (SQLite usa 0/1). Roda em transacao e por padrao so importa em loja vazia (protege contra duplicacao; aceita `force`).
- Introspecta as colunas do destino em runtime (`columnInfo`), entao ignora colunas locais que nao existem online — resiliente a drift de schema.
- Electron: handler `export-local-data` (dump de todas as tabelas locais), exposto no preload como `exportLocalData`, e `api.migrateLocalToOnline()` (le local via IPC + envia para a loja online logada). Botao "Migrar para a loja online" em Configuracoes > Ferramentas (visivel no modo online).
- Validado E2E: import com IDs colidentes, FK reescrita, boolean 0/1, config e bloqueio de reimportacao.

### Backup/restore online por loja (Fase 7) — FEITO

- `GET /backup/export?persist=1`: exporta a loja e opcionalmente salva um snapshot no servidor.
- `POST /backup/restore`: restaura SOBRE a loja atual e **gera automaticamente um snapshot `pre_restore`** antes de qualquer escrita destrutiva (recuperavel).
- `GET /backup/list` e `GET /backup/:id`: lista e recupera snapshots salvos (tabela nova `store_backups`, migration `20260729_0007`).
- `POST /platform/stores/restore`: restaura um backup em uma **loja nova**, remapeando ids e reescrevendo FKs (reusa o `importService`) — resolve a colisao de PKs globais.
- Painel admin: botao "Restaurar de backup" (upload de arquivo -> cria loja nova). Electron ja tinha backup/restore da loja atual em Configuracoes > Ferramentas.
- Validado E2E: export+persist, restore sobre a loja com snapshot automatico, listagem, restore em loja nova com dados remapeados.

### Documentacao da API — FEITO

- Swagger UI navegavel em `GET /docs` e spec OpenAPI 3.0.3 em `GET /openapi.json` (53 rotas, schemas, agrupadas por Publico/Plataforma/Loja). Sem dependencias novas (Swagger UI via CDN).

### Relatorios online (Fase 6/relatorios) — FEITO

- Endpoint `GET /reports/sales?startDate&endDate&sellerId&payment` (`reportsService.getSalesReport`): computa no servidor faturamento, custo, mao de obra, acrescimos, descontos, comissoes e lucro, alem de resumo por forma de pagamento e por responsavel de mao de obra. Reusa `listSales`/`listServices` (ja enriquecidos com `custo_total_real`, `comissao_real`, `lista_pagamentos`).
- Cliente online `api.reports.sales(filtros)`; o hook `useReportData` usa o relatorio do servidor no modo online (caminho local intacto). A pagina Relatorios funciona online sem alteracoes de UI.
- Validado E2E com numeros conferidos: faturamento/custo/comissoes/lucro, filtro por forma de pagamento e mao de obra por pessoa. Adicionado ao Swagger.

### Billing / assinaturas na plataforma — FEITO

- `billingService`: planos (listar/criar/atualizar), troca de plano, cancelamento, registro de pagamento (avanca vencimento, ativa a loja) e visao geral (`getBillingOverview`).
- Endpoints: `GET /platform/billing` (MRR/ARR, receita por plano, contagem por status, assinaturas vencidas), `GET/POST /platform/plans`, `POST /platform/stores/:id/change-plan`, `POST /platform/stores/:id/cancel`, `POST /platform/stores/:id/register-payment`. Todas com audit log.
- Painel admin: nova aba **Assinaturas** com MRR/ARR/vencidas, tabela de planos com receita e tabela de assinaturas com trocar plano, registrar pagamento e cancelar.
- Validado E2E: criar plano Pro, trocar plano, registrar pagamento -> MRR = 99,90 / ARR = 1198,80, cancelamento bloqueia o login da loja. Adicionado ao Swagger.

### Acoes de usuario de loja pelo admin — FEITO

- `authService.resetStoreUserPassword` (aceita senha ou gera temporaria) e `setStoreUserActive` (com trava do ultimo admin).
- Endpoints: `POST /platform/stores/:id/users/:userId/reset-password`, `.../deactivate`, `.../activate`. Com audit log.
- Painel admin: no drawer da loja, cada usuario tem botoes **Senha** (mostra a nova senha gerada) e **Desativar/Ativar**.
- Validado E2E: reset gera senha e o login passa a usar a nova; desativar bloqueia o login; reativar libera; desativar o ultimo admin e bloqueado.

### Cobranca automatica ao vencer (dunning) — FEITO

- `billingService.runDunning(knex, { graceDays })`: passo 1 marca assinaturas `active` vencidas como `past_due` (loja continua funcionando durante a carencia); passo 2 bloqueia a loja apos `BILLING_GRACE_DAYS` (padrao 5). Idempotente. O `registerPayment` reverte (reativa a loja e avanca o vencimento).
- Disparo: `POST /platform/billing/run-dunning` (manual/teste) e script `npm run server:dunning` (para agendar via cron/agendador do SO, ex.: diariamente as 3h). Botao "Rodar cobranca" na aba Assinaturas do painel.
- Validado E2E: vencida na carencia -> past_due (ainda loga); alem da carencia -> blocked (nao loga); pagamento -> active; execucao idempotente.

### Hardening de producao — quick wins de codigo FEITOS

- **CORS restrito**: `http.js/applySecurity` usa allowlist `CORS_ORIGINS` (vazio = `*`, comportamento de dev inalterado). Origem permitida e ecoada; origem desconhecida nao recebe `Access-Control-Allow-Origin`. Observacao: a allowlist vale para o painel web; o Electron e cliente nativo (requisicoes sem Origin de navegador passam) — em producao, inclua a origem do painel em `CORS_ORIGINS`.
- **Segredo obrigatorio**: `config.validateConfig()` (chamado no boot do `server.js`) aborta em producao se `SERVER_TOKEN_SECRET`/`PLATFORM_ADMIN_PASSWORD` estiverem ausentes, no default ou fracos, ou sem `DATABASE_URL`.
- **Rate limit** anti brute-force em `/platform/auth/login`, `/auth/login`, `/store/onboarding/join` (`AUTH_RATE_LIMIT_MAX`/`_WINDOW_MS`, padrao 20/15min) -> 429. Em memoria (multi-instancia exigiria Redis).
- **Logs estruturados** (`logger.js`, JSON) + handler de erro central que **nao vaza detalhes internos em producao** (retorna "Erro interno.").
- **Headers de seguranca** (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) e **Swagger `/docs` desligavel** (`ENABLE_DOCS`, off por padrao em producao).
- Validado E2E: CORS allowlist, headers, 429 no rate limit, docs 404 quando off, e validacao de config de producao. Variaveis documentadas no `.env.example`.

### Deploy — artefatos prontos

- Decisao: **Railway** (API + Postgres juntos) como caminho inicial, por ser o mais simples/barato; o sistema **nao esta em uso ao vivo no balcao**, entao latencia nao e fator agora. Banco e so Postgres — da pra migrar para **Neon (Sao Paulo)** depois, se quiser dados no Brasil.
- `Dockerfile` (raiz, portavel Railway/Fly/Render/VPS) + `.dockerignore`; script `server:start`; guia passo a passo em `docs/DEPLOY.md` (banco, API, migrations, dunning agendado, painel estatico, app desktop apontando para a nuvem, checklist).
- Validado o boot de producao in-process: `validateConfig` passa com segredos fortes, `/docs` off, login funciona, erro interno nao vaza detalhes.

### Deploy de teste GRATIS — artefatos prontos

- Pilha 100% gratuita para validar: **Neon** (Postgres, Sao Paulo) + **Render** free (API via `Dockerfile`; Northflank como alternativa always-on) + **Cloudflare Pages** (painel estatico) + **GitHub Actions** (cron do dunning). Obs.: a Koyeb foi comprada pela Mistral e encerrou o free tier.
- `.github/workflows/dunning.yml` (roda `server:dunning` 1x/dia direto no banco; so precisa do secret `DATABASE_URL`) e guia `docs/DEPLOY-FREE.md` com o passo a passo.
- Ajuste de portabilidade: `config.port` agora respeita `PORT` (injetado por Koyeb/Render/Railway).
- Nota: Railway nao tem mais free tier real (so trial de 30 dias); por isso a pilha gratis usa Koyeb.

### Ainda pendente (infra e operacao)

1. **Executar o deploy** seguindo `docs/DEPLOY-FREE.md` (Neon + Koyeb + Cloudflare Pages + secret do GitHub Actions). `docs/DEPLOY.md` cobre a variante paga no Railway.
2. **Monitoramento**: uptime no `/health` (ex.: UptimeRobot), coletor de erros (ex.: Sentry).
3. **Backups automaticos do banco** habilitados no provedor + staging.
4. **Rodar a suite existente** (`npm test`) no Windows; adicionar testes de backend com o harness PGlite.
5. **Lembretes de vencimento por e-mail** (depende de canal de e-mail, inexistente).
6. **Modo offline somente-leitura** no Electron quando a internet cair.

## Roadmap de produto

### Versao web responsiva do app (PWA) — FEITO

O mesmo `apps/pdv` roda no navegador (desktop/tablet/celular) em modo online, sem
Electron/SQLite. Entregue:
- **Web-safe**: nenhum componente usa `window.api` direto (tudo via `api.js`); o
  `online.system` ja tem no-ops (auto-update vira no-op na web). Impressao na web passou a
  abrir a **caixa de impressao do navegador** (`online.print.silent`).
- **Layout responsivo**: sidebar vira **drawer** com hamburguer no mobile (backdrop +
  top bar), colapso so no desktop (via `matchMedia`). Login/onboarding online ja existiam.
- **PWA**: `manifest.webmanifest`, icone SVG, `theme-color`, meta Apple e **service worker**
  (network-first, nao intercepta a API) registrado so na web. Instalavel na tela inicial.
- **Deploy**: `docs/DEPLOY-WEB.md` (build `apps/pdv/dist` com `VITE_API_URL`, host estatico,
  incluir a URL do app web no `CORS_ORIGINS` da API). O app desktop e liberado no CORS
  automaticamente (origem localhost/file).
- Validado: bundle completo do app compila (esbuild, todo o grafo de imports resolve).

Refinos futuros: ajustar telas densas (Vendas/Produtos) para telas bem pequenas; leitor de
codigo de barras via camera no celular; icones PNG dedicados.

Resultado: mesma base de codigo servindo Electron (balcao Windows) e Web (qualquer
dispositivo), ambos falando com a API multi-loja.

### Exportacao de recibos para WhatsApp — FEITO

Compartilha o recibo da venda direto pra qualquer app (WhatsApp incluso). Entregue:
- Util `utils/whatsapp.js`: `shareReceiptImage` captura o cupom como **imagem PNG**
  (`html2canvas`) e abre a **tela nativa de compartilhamento** (Web Share API com arquivo)
  — o usuario escolhe o app. Fallbacks: baixa a imagem + abre o WhatsApp em texto (desktop
  sem file-share), ou so o texto (`wa.me`) se a captura falhar.
- `buildReceiptMessage` monta o recibo em texto e `normalizePhone` formata o telefone do
  cliente para o link `wa.me` (com DDI Brasil).
- Botao **"Compartilhar recibo"** no `SaleReceiptModal` (pos-venda) e na pagina **Recibos**
  (recibos antigos). `html2canvas` fixado como dependencia direta.
- Validado: compilacao, normalizacao de telefone e geracao da mensagem.

Futuro opcional: template de mensagem configuravel por loja.

### Secao de despesas da loja — FEITO

Registra as despesas de cada loja para calcular o **lucro liquido real** e o resultado
consolidado no painel. Entregue:
- **Tabelas `despesas`** (online: migration `20260805_0008`, com indices por data/categoria;
  local SQLite: migration `20260805_expenses`).
- **API**: CRUD `/expenses` (listar por periodo/categoria com total, criar, editar, excluir;
  escrita restrita a admin) + `/expenses/categories`. No Swagger.
- **App**: pagina **Despesas** (menu, admin-only) com formulario, filtros por periodo/categoria,
  cards de resumo e resumo por categoria — funciona em modo local (IPC) e online (HTTP).
  Handlers Electron + preload adicionados; importador SQLite->online inclui `despesas`
  (converte data ms->timestamp e boolean).
- **Relatorios**: `reportsService` traz `despesas` e `lucro_liquido`
  (faturamento - custo - comissao - despesas).
- **Painel admin**: `listStores` agrega `despesas` e `resultado_liquido` por loja; aba
  Faturamento mostra colunas Despesas/Resultado + cards de despesas e resultado liquido.
- Validado E2E: CRUD, relatorio com lucro liquido, agregado no admin e importacao de despesas.

### Login por convite/link — FEITO

Reduz a friccao do login online: um link embute a loja, o caixa so digita usuario/senha.
- **Backend** (`inviteService`): gerar/listar/revogar convite (codigo reutilizavel, sem
  ambiguidade) + **resolver publico** (`GET /invite/:codigo` -> nome da loja, sem token).
  `joinStore` aceita `codigo` e nao consome o convite (link reutilizavel ate expirar/revogar).
  Rotas admin `POST/GET /invites`, `DELETE /invites/:id`. No Swagger.
- **Frontend**: o login le `?c=<codigo>` da URL, resolve a loja e mostra "Entrando na loja X",
  logando por codigo (sem pedir o ID). Painel em Config > Ferramentas (so na web) para o admin
  **gerar, copiar e revogar** o link. Servidor da API virou opcao "avancada" (oculta); a loja
  fica lembrada num chip "Loja #X - trocar".
- Validado E2E: criar, resolver, login por codigo, reutilizacao, listar e revogar.

## Riscos Principais

- Vendas simultaneas sem transacao correta.
- Falta de indice com `loja_id`.
- Permitir que o frontend escolha `loja_id`.
- Restore sobrescrever dados recentes.
- Importador SQLite duplicar dados.
- App desktop ficar dependente de internet sem uma mensagem clara.

## Decisoes Em Aberto

- Provedor inicial do PostgreSQL: Supabase, Neon, Railway, VPS ou outro.
- Hospedagem da API.
- Se o painel admin ficara no mesmo repo ou em app separado.
- Se lojas bloqueadas podem consultar dados antigos ou se tudo sera bloqueado.
- Se o primeiro lancamento tera cache offline somente leitura.
