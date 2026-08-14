# Deploy de teste — pilha 100% grátis

Stack para validar sem custo:

| Peça | Serviço grátis | Papel |
|------|----------------|-------|
| Banco | **Neon** (região São Paulo) | PostgreSQL |
| API | **Render** (free web) — ou **Northflank** (always-on) | `apps/pdv-back` via `Dockerfile` |
| Painel admin | **Cloudflare Pages** (ou Netlify) | build estático do `apps/pdv-admin` |
| Cobrança (cron) | **GitHub Actions** | roda o `dunning` 1x/dia |

Limites do grátis: banco hiberna quando ocioso (acorda em <1s), instância pequena,
sem SLA. Ótimo para teste; não para carga real. O app desktop continua via GitHub Releases.

---

## 1. Banco — Neon

1. Crie conta em **neon.com** → **New Project** → região **AWS South America (São Paulo)**.
2. Copie a **connection string** (algo como
   `postgresql://user:senha@ep-xxx.sa-east-1.aws.neon.tech/neondb?sslmode=require`).
   Mantenha o `?sslmode=require` no fim.
3. Aplique as migrations a partir da sua máquina (cria tabelas + admin da plataforma):
   ```bash
   DATABASE_URL="<connection-string-do-neon>" \
   PLATFORM_ADMIN_EMAIL="voce@empresa.com" \
   PLATFORM_ADMIN_PASSWORD="<senha forte>" \
   npm run server:migrate
   ```

> Se der erro de SSL, confirme que a URL termina com `?sslmode=require`.

---

## 2. API — Render (free)

> Nota: a **Koyeb** foi comprada pela Mistral e fechou o tier grátis para novos
> usuários (virou foco em IA). Use o **Render**, que roda o mesmo `Dockerfile`.

1. Crie conta em **render.com** → **New → Web Service** → conecte o repo `Nobrinho/pdv`.
2. Em **Runtime**, escolha **Docker** (ele usa o `Dockerfile` da raiz). Instance Type: **Free**.
3. **Environment variables** (a API se recusa a subir em produção sem segredo forte):
   ```txt
   NODE_ENV=production
   DATABASE_URL=<connection-string-do-neon>
   SERVER_TOKEN_SECRET=<gere: openssl rand -hex 32>
   PLATFORM_ADMIN_EMAIL=voce@empresa.com
   PLATFORM_ADMIN_PASSWORD=<mesma senha forte do passo 1>
   PLATFORM_ADMIN_NAME=Administrador
   CORS_ORIGINS=<URL do painel, do passo 3>
   ENABLE_DOCS=0
   BILLING_GRACE_DAYS=5
   ```
   Não precisa setar porta — o Render injeta `PORT` e a API já o respeita.
4. **Health Check Path:** `/health`.
5. Deploy. A URL pública (ex.: `https://pdv-api.onrender.com`) já vem com **HTTPS**.
   Teste `https://SUA-URL/health` → `{"success":true,"status":"ok"}`.

> **Limitação do free do Render:** o serviço "dorme" após 15 min sem uso e a
> primeira requisição depois disso leva ~50s para responder. Como não é uso ao vivo
> no balcão, tudo bem. Se quiser **always-on grátis**, use o **Northflank**
> (northflank.com) — também deploya pelo `Dockerfile`, sem sleep no free tier.

---

## 3. Painel admin — Cloudflare Pages

1. Em **pages.cloudflare.com** → **Create project** → conecte o repo `Nobrinho/pdv`.
2. Configuração de build:
   - **Build command:** `npm ci --ignore-scripts && npm run admin:build`
   - **Build output directory:** `apps/pdv-admin/dist`
   - **Environment variable:** `VITE_API_URL = https://SUA-URL-DA-API`
3. Publique. Anote a URL final (ex.: `https://pdv-admin.pages.dev`) e **coloque-a em
   `CORS_ORIGINS`** da API (passo 2) — senão o navegador bloqueia as chamadas.
4. Acesse o painel e faça login com o `PLATFORM_ADMIN_EMAIL` / senha.

---

## 4. Cobrança automática — GitHub Actions

O workflow já está no repo em `.github/workflows/dunning.yml` (roda às 03:00 BRT).

1. No GitHub: **Settings → Secrets and variables → Actions → New repository secret**.
2. Crie o secret **`DATABASE_URL`** com a connection string do Neon.
3. Pronto. Para testar agora: aba **Actions → Cobranca (dunning) → Run workflow**.

---

## 5. App desktop apontando para a nuvem

Na tela de login do app (modo **Online**), preencha o campo "Servidor da API" com
`https://SUA-URL-DA-API`. Para já vir preenchido no `.exe`, defina `VITE_API_URL`
no build do desktop antes de gerar o instalador.

---

## Checklist

- [ ] Neon criado em São Paulo, migrations aplicadas, `/health` responde 200.
- [ ] API no Koyeb com `NODE_ENV=production` e `SERVER_TOKEN_SECRET` forte.
- [ ] `CORS_ORIGINS` = URL do painel (não deixar `*`).
- [ ] Painel no Cloudflare Pages logando com o admin da plataforma.
- [ ] Secret `DATABASE_URL` no GitHub e workflow de dunning testado.
- [ ] App desktop conectando no modo Online.
