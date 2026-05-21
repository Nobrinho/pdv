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

Ainda pendente:

- Testar migrations contra um PostgreSQL real.
- Conectar o Electron atual a essa API.
- Criar painel Admin Web.
- Implementar importador SQLite.
- Implementar backup/restore online.
- Criar dashboards e relatorios online.

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
