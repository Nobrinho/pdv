# Deploy — SysControl (API + Painel Admin)

Guia para publicar a **API** (`apps/pdv-back`) e o **painel admin** (`apps/pdv-admin`).
O app desktop (Electron) continua sendo distribuido via GitHub Releases (auto-update)
e nao precisa de hospedagem. Este guia foca no Railway, mas o `Dockerfile` da raiz
e portavel (Fly.io, Render, VPS).

---

## 1. Banco de dados (PostgreSQL no Railway)

1. Crie uma conta em railway.com e um novo projeto.
2. **+ New → Database → Add PostgreSQL**. O Railway provisiona o banco e expoe a
   variavel `DATABASE_URL` (aba **Variables** do servico do Postgres).

> Quer os dados no Brasil (LGPD) / menor latencia? Use o **Neon** na regiao
> `São Paulo (sa-east-1)` em vez do Postgres do Railway e cole a connection string
> dele em `DATABASE_URL`. O resto do guia continua igual.

---

## 2. API (a partir do Dockerfile)

1. No mesmo projeto: **+ New → GitHub Repo** e selecione `Nobrinho/pdv`. O Railway
   detecta o `Dockerfile` da raiz automaticamente.
2. Na aba **Variables** do servico da API, configure (o boot **falha de proposito**
   em producao se faltar segredo forte):

   ```txt
   NODE_ENV=production
   DATABASE_URL=${{Postgres.DATABASE_URL}}   # referencia a variavel do Postgres
   SERVER_TOKEN_SECRET=<gere: openssl rand -hex 32>
   PLATFORM_ADMIN_EMAIL=voce@suaempresa.com
   PLATFORM_ADMIN_PASSWORD=<senha forte>
   PLATFORM_ADMIN_NAME=Administrador
   CORS_ORIGINS=https://admin.suaempresa.com  # URL do painel (passo 4)
   ENABLE_DOCS=0                               # 1 para expor /docs em producao
   BILLING_GRACE_DAYS=5
   ```

3. Em **Settings → Networking**, gere um **dominio publico** (ex.:
   `pdv-api.up.railway.app`). Railway ja entrega **HTTPS**.
4. Confirme que a API subiu acessando `https://SEU-DOMINIO/health` →
   `{"success":true,"status":"ok"}`.

### Migrations

Rode uma vez (e a cada release com migrations novas). Opcoes:

- **Local, apontando para o banco de producao:**
  ```bash
  DATABASE_URL="<url-do-railway>" npm run server:migrate
  ```
- **Ou** via Railway (aba do servico da API → **Deploy → Run command**):
  ```bash
  npm run server:migrate
  ```

As migrations criam as tabelas e o **seed do platform admin** (usando
`PLATFORM_ADMIN_EMAIL`/`PASSWORD`). Depois disso, `POST /platform/auth/login` ja funciona.

---

## 3. Cobranca automatica (dunning)

Crie um servico agendado que roda a rotina diariamente:

1. **+ New → Cron** (ou um servico duplicado da API) usando o mesmo repo/imagem.
2. **Start command:** `npm run server:dunning`
3. **Schedule:** `0 6 * * *` (6h UTC = 3h de Brasilia). Use as mesmas variaveis
   (`DATABASE_URL`, etc.).

Isso marca assinaturas vencidas como `past_due` e bloqueia apos a carencia. Pagamento
no painel reativa a loja.

---

## 4. Painel admin (estatico)

O painel e um build estatico do Vite. Hospede de graca no Cloudflare Pages, Netlify
ou Vercel.

1. Build apontando para a API:
   ```bash
   VITE_API_URL="https://SEU-DOMINIO-API" npm run admin:build
   ```
   Saida em `apps/pdv-admin/dist`.
2. Publique a pasta `dist` no host estatico escolhido. Anote a URL final e
   **coloque-a em `CORS_ORIGINS`** da API (passo 2) para o navegador liberar as chamadas.

---

## 5. App desktop (Electron) apontando para a nuvem

No app, o usuario escolhe o modo **Online** e informa a URL da API
(`https://SEU-DOMINIO-API`) na tela de login (campo "Servidor da API"). Para nao pedir
isso a cada instalacao, defina `VITE_API_URL` no build do desktop
(`apps/pdv/vite.config.js`/env) antes de gerar o `.exe`.

---

## Checklist de produção

- [ ] `NODE_ENV=production` e `SERVER_TOKEN_SECRET` forte (o boot falha sem isso).
- [ ] `PLATFORM_ADMIN_PASSWORD` diferente do padrao `admin123`.
- [ ] `CORS_ORIGINS` com a URL do painel (nao deixar `*`).
- [ ] `ENABLE_DOCS=0` (ou proteja o `/docs`).
- [ ] Migrations aplicadas; `/health` responde 200.
- [ ] Dunning agendado.
- [ ] **Backups automaticos do banco** habilitados no provedor (Railway/Neon fazem;
      confira a retencao).
- [ ] Monitor de uptime no `/health` (ex.: UptimeRobot) e, opcional, Sentry para erros.
