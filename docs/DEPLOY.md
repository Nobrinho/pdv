# Deploy — Cloudflare Workers (Git integration) + Render + Neon

Fronts nos **Cloudflare Workers** (Builds via Git), backends na **Render**, banco no
**Neon**. Branches: `main` = produção, `staging` = dev online.

## Fronts — Cloudflare Workers Builds (4 projetos)

Cada projeto conecta o repo (Nobrinho/pdv) e usa os campos abaixo. O
`VITE_API_URL` NÃO vai em variável do Cloudflare — é assado no build a partir dos
arquivos `.env.production` (prod) e `.env.staging` (dev), já commitados.

> Importante 1: **não** defina `NODE_ENV=production` no Cloudflare. Isso faz o
> install pular as devDependencies e o `vite` some (build quebra com "vite: not found").
>
> Importante 2: o **Comando da build apaga o lockfile e reinstala** — isso contorna
> o bug do npm com deps opcionais nativas (Rollup: `@rollup/rollup-linux-x64-gnu`),
> que acontece porque o `package-lock.json` é gerado no Windows e não traz o binário
> nativo do Linux. NÃO use `npm ci` aqui (ele respeita o lock e quebra no Linux).

### syscontrol-web-prod  ·  Branch de produção: `main`
- **Comando da build:** `rm -rf node_modules package-lock.json && npm install && npm run build`
- **Comando de implantação:** `npx wrangler deploy -c wrangler.web.jsonc`
- **Comando da versão:** `npx wrangler versions upload -c wrangler.web.jsonc`
- **Diretório raiz:** `/`

### syscontrol-web-staging  ·  Branch de produção: `staging`
- **Comando da build:** `rm -rf node_modules package-lock.json && npm install && npm run build:staging`
- **Comando de implantação:** `npx wrangler deploy -c wrangler.web.jsonc --env staging`
- **Comando da versão:** `npx wrangler versions upload -c wrangler.web.jsonc --env staging`
- **Diretório raiz:** `/`

### pdv-admin-prod  ·  Branch de produção: `main`
- **Comando da build:** `rm -rf node_modules package-lock.json && npm install && npm run admin:build`
- **Comando de implantação:** `npx wrangler deploy -c wrangler.jsonc`
- **Comando da versão:** `npx wrangler versions upload -c wrangler.jsonc`
- **Diretório raiz:** `/`

### pdv-admin-staging  ·  Branch de produção: `staging`
- **Comando da build:** `rm -rf node_modules package-lock.json && npm install && npm run admin:build:staging`
- **Comando de implantação:** `npx wrangler deploy -c wrangler.jsonc --env staging`
- **Comando da versão:** `npx wrangler versions upload -c wrangler.jsonc --env staging`
- **Diretório raiz:** `/`

Resultado: push em `main` → deploy dos dois `*-prod` (API de prod). Push em
`staging` → deploy dos dois `*-staging` (API de dev). Sem `wrangler` na mão, sem warning.

Os arquivos de config ficam na raiz: `wrangler.web.jsonc` (web) e `wrangler.jsonc`
(admin), cada um com o ambiente `staging` embutido (`--env staging` muda só o nome
do Worker; o diretório de assets é o mesmo, o que muda é o build).

## Backends — Render (2 serviços)

- `pdv-w4es` (prod) e `pdv-api-staging` (dev). Variáveis no painel (segredos):
  `NODE_ENV=production`, `DATABASE_URL` (Neon: branch principal no prod / branch
  `dev` no staging), `SERVER_TOKEN_SECRET`, `PLATFORM_ADMIN_*`, `CORS_ORIGINS`.
- **CORS_ORIGINS** (sem barra no fim, `https://`, vírgula):
  - prod: `https://syscontrol-web-prod.emerson-14.workers.dev,https://pdv-admin-prod.emerson-14.workers.dev`
  - staging: `https://syscontrol-web-staging.emerson-14.workers.dev,https://pdv-admin-staging.emerson-14.workers.dev`
- Build `npm ci`; Start `npm run server:start`; Pre-Deploy `npm run server:migrate`.

## Banco — Neon

Branch principal (prod) e branch `dev` (staging), cada um com sua connection
string *pooled* (`?sslmode=require`) → vai no `DATABASE_URL` do backend correspondente.
