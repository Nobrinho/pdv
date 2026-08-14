# Como Rodar A API Online Localmente

Este guia sobe um PostgreSQL local em Docker e valida o fluxo multi-loja da API.

## Requisitos

- Docker Desktop ligado.
- Node.js instalado.
- Dependencias instaladas com `npm install`.

## Arquivos Criados

- `docker-compose.yml`: Postgres local.
- `apps/pdv-back/.env`: configuracao local da API.
- `apps/pdv-back/.env.example`: modelo de configuracao.
- `apps/pdv-back/scripts/smoke.js`: teste ponta a ponta via HTTP.

## Subir Banco

```bash
npm run db:up
```

O Postgres sobe em:

```txt
localhost:54329
database: syscontrol
user: syscontrol
password: syscontrol
```

## Rodar Migrations

```bash
npm run server:migrate
```

Isso cria:

- plataforma/admin
- lojas
- usuarios
- dispositivos
- produtos
- clientes
- pessoas/cargos
- vendas
- configuracoes

## Subir API

```bash
npm run server:dev
```

API local:

```txt
http://localhost:3333
```

Healthcheck:

```txt
GET http://localhost:3333/health
```

## Rodar Smoke Test

Com a API ligada:

```bash
npm run server:smoke
```

O teste valida:

- login do admin da plataforma
- criacao de loja
- login do admin da loja
- cargos padrao
- cadastro de vendedor
- cadastro de produto
- cadastro de cliente
- venda com baixa de estoque
- bloqueio da loja
- acesso negado para loja bloqueada
- liberacao da loja

## Rodar PDV Web Conectado Na API

Com Postgres e API ligados:

```bash
npm run dev
```

Acesse:

```txt
http://localhost:5173
```

No modo web, o PDV usa HTTP diretamente contra `http://localhost:3333`.
Na tela de login informe:

```txt
ID da loja
usuario
senha
```

O ID da loja aparece no resultado do `npm run server:smoke` como `store created: N`.

Exemplo local, se o smoke criou a loja `3`:

```txt
ID da loja: 3
usuario: admin...
senha: 1234
```

## Rodar Electron Em Modo Online

Com Postgres e API ligados:

```bash
npm run electron:dev
```

Na tela de login do Electron, use o seletor:

```txt
Local  |  Online
```

- `Local`: usa o SQLite local via IPC, comportamento legado.
- `Online`: usa HTTP contra `http://localhost:3333`, igual ao modo web.

Ao mudar o modo, o app recarrega automaticamente. Em `Online`, informe:

```txt
ID da loja
usuario
senha
```

O modo online fica salvo no navegador/Electron via `localStorage`. Para voltar ao SQLite, selecione `Local` na tela de login.

## Admin Local Da Plataforma

```txt
email: admin@syscontrol.local
senha: admin123
```

Esses dados ficam em `apps/pdv-back/.env`.

## Problema Com Docker

Se aparecer erro parecido com:

```txt
dockerDesktopLinuxEngine: The system cannot find the file specified
```

o Docker Desktop nao esta ligado. Abra o Docker Desktop e aguarde ele ficar em estado "running", depois rode:

```bash
npm run db:up
```

## Parar Banco

```bash
npm run db:down
```
