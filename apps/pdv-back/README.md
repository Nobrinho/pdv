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

## Modulos Implementados

- Plataforma: lojas, planos, assinaturas, dispositivos e usuarios admin.
- Autenticacao: plataforma e loja.
- Produtos.
- Clientes e contas a receber.
- Pessoas e cargos.
- Vendas, itens, pagamentos, cancelamento e comissoes.
- Configuracoes e tenant.
