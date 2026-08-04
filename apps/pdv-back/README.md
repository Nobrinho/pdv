# SysControl API

API Node.js central para a versao online multi-loja do SysControl.

## Comandos

```bash
npm run db:up
npm run server:migrate
npm run server:dev
npm run server:smoke
```

## Variaveis

Configure em `apps/pdv-back/.env`:

```txt
DATABASE_URL=postgres://syscontrol:syscontrol@localhost:54329/syscontrol
SERVER_PORT=3333
SERVER_TOKEN_SECRET=dev-local-syscontrol-token-secret
PLATFORM_ADMIN_EMAIL=admin@syscontrol.local
PLATFORM_ADMIN_PASSWORD=admin123
PLATFORM_ADMIN_NAME=Administrador
```

## Cobranca automatica (dunning)

Marca assinaturas vencidas como `past_due` e bloqueia a loja apos a carencia
(`BILLING_GRACE_DAYS`, padrao 5). Rode diariamente:

```bash
npm run server:dunning
```

Agende via cron do SO (ex.: `0 3 * * *`), systemd timer ou agendador da nuvem.
Tambem pode ser disparado manualmente por `POST /platform/billing/run-dunning`
ou pelo botao "Rodar cobranca" no painel admin. O pagamento
(`register-payment`) reativa a loja e avanca o vencimento.

## Documentacao interativa (Swagger)

Com a API rodando (`npm run server:dev`):

- **Swagger UI navegavel:** http://localhost:3333/docs
- **Spec OpenAPI (JSON):** http://localhost:3333/openapi.json

No Swagger, clique em **Authorize** e cole um Bearer token (obtido em `/platform/auth/login`, `/auth/login`, `/store/onboarding/create` ou `/store/onboarding/join`) para testar as rotas protegidas com o botao **Try it out**.

## Modulos Implementados

- Plataforma: lojas, planos, assinaturas, dispositivos e usuarios admin.
- Autenticacao: plataforma e loja.
- Produtos.
- Clientes e contas a receber.
- Pessoas e cargos.
- Vendas, itens, pagamentos, cancelamento e comissoes.
- Configuracoes e tenant.
