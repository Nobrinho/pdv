# Ambientes e variáveis (dev × prod)

Modelo de configuração do SysControl. Regra de ouro: **segredo nunca vai para o
frontend**. O navegador (web/Electron/admin) só recebe a URL pública da API.

## Visão geral

| App | Onde roda | Como escolhe dev/prod | O que lê |
|---|---|---|---|
| Backend (`apps/pdv-back`) | Render (Web Service) | `NODE_ENV` | `process.env` (via `config.js`) |
| Web/Electron (`apps/pdv`) | Render Static / desktop | modo do Vite (`dev`/`build`) | só `VITE_API_URL` |
| Admin (`apps/pdv-admin`) | Render Static | modo do Vite | só `VITE_API_URL` |
| Banco | **Neon** (Postgres) | — | `DATABASE_URL` no backend |

## Frontend (web/Electron/admin)

Só variáveis com prefixo `VITE_` entram no bundle, e o Vite lê os `.env` da
**pasta do próprio app**. Por isso os `.env` do backend nunca vazam para o front.

Três tiers (arquivos commitados — só têm `VITE_API_URL` público):

| Tier | Arquivo | `VITE_API_URL` | Como builda |
|---|---|---|---|
| Local (sua máquina) | `.env.development` | `http://localhost:3333` | `npm run dev` / `admin:dev` |
| Dev online (homolog) | `.env.staging` | URL do backend **de dev** na Render | `npm run build:staging` / `admin:build:staging` |
| Produção | `.env.production` | `https://pdv-w4es.onrender.com` | `npm run build` / `admin:build` |

O Vite escolhe pelo **mode**: `vite dev` = development; `vite build` = production;
`vite build --mode staging` = staging. Para um override pessoal, crie
`.env.local` (ignorado pelo git).

> O `.env.staging` está com placeholder `https://TROQUE-URL-DEV.onrender.com` —
> troque pela URL do 2º serviço quando criá-lo.

## Backend (`apps/pdv-back`)

`config.js` lê `process.env` e tem seu próprio carregador de `.env` local
(`apps/pdv-back/.env` e o `.env` da raiz). Na Render, as variáveis vêm do painel.

Variáveis (segredos — **nunca** commitar; ficam no `.env` local e no painel da Render):

| Variável | Uso |
|---|---|
| `NODE_ENV` | `development` local / `production` na Render |
| `DATABASE_URL` | Postgres do **Neon** (string *pooled*, com `?sslmode=require`) |
| `SERVER_TOKEN_SECRET` | segredo do JWT (32+ chars aleatórios) |
| `PLATFORM_ADMIN_EMAIL` / `_PASSWORD` / `_NAME` | admin da plataforma |
| `CORS_ORIGINS` | origens permitidas (URLs do web e do admin, por vírgula) |
| `BILLING_GRACE_DAYS` | carência do dunning (default 5) |
| `PORT` | injetado pela Render (local usa 3333) |

`validateConfig()` derruba o boot em produção se `SERVER_TOKEN_SECRET`/`DATABASE_URL`
faltarem ou forem fracos.

## Scripts

```
npm run dev          # web (Vite dev, localhost)
npm run admin:dev    # admin (Vite dev, localhost)
npm run server:dev   # backend em NODE_ENV=development
npm run dev:all      # backend + web juntos (dev)

npm run build        # web em produção (assa VITE_API_URL de .env.production)
npm run admin:build  # admin em produção
npm run server:start # backend em produção (NODE_ENV vem do host/Render)
npm run server:migrate  # roda as migrations no DATABASE_URL atual
```

## Dois ambientes ONLINE (dev + prod)

A ideia é ter um ambiente de **homologação online** separado da produção, para
testar sem risco. Cada ambiente = um serviço na Render + um banco no Neon.

| | Dev online (homolog) | Produção |
|---|---|---|
| Backend (Render) | 2º Web Service (ex.: `pdv-dev.onrender.com`) | `pdv-w4es.onrender.com` |
| Banco (Neon) | **branch `dev`** do mesmo projeto | branch principal |
| `DATABASE_URL` | connection string do branch `dev` | do branch principal |
| Segredos/admin | próprios do dev | próprios da prod |
| Front (Static Sites) | build `build:staging` / `admin:build:staging` | build `build` / `admin:build` |

Notas:

- **Neon branches:** no projeto do Neon, crie um branch `dev` (cópia do principal).
  Cada branch tem sua própria connection string — use a do `dev` no serviço de dev.
- **NODE_ENV:** mantenha `production` **nos dois** serviços online (staging também é
  um servidor real; rodar em `development` afrouxa CORS/segredos). O que diferencia
  dev de prod é o `DATABASE_URL` (branch dev) e os segredos, não o `NODE_ENV`.
- **Migrations:** rode `server:migrate` em cada serviço — cada um migra o seu banco.

## Deploy (Render + Neon) — resumo

1. **Neon:** copiar a *pooled connection string* → `DATABASE_URL` (com `?sslmode=require`).
2. **Render — backend (Web Service):** setar as variáveis acima; Build `npm ci`;
   Start `npm run server:start`; Pre-Deploy `npm run server:migrate`.
3. **Render — web e admin (Static Sites):** Build `npm ci && npm run build`
   (ou `admin:build`); Publish `apps/pdv/dist` (ou `apps/pdv-admin/dist`);
   env `VITE_API_URL=https://pdv-w4es.onrender.com`.
4. **Electron:** `npm run dist` local — usa `apps/pdv/.env.production`.

## Limpeza pendente

O `.env` da raiz ainda tem `TURSO_URL`/`TURSO_AUTH_TOKEN` de um experimento
antigo — **não são usados em lugar nenhum** do código. Pode apagar essas duas
linhas (é um arquivo local, ignorado pelo git).
