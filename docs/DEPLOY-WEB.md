# Deploy do app PDV como Web/PWA

O mesmo `apps/pdv` (React + Vite) roda no navegador em **modo online** — sem Electron,
sem SQLite local. Assim a loja registra vendas, cadastra produtos, etc. de qualquer
dispositivo (desktop, tablet, celular), instalando como PWA se quiser.

Pre-requisitos: a API (Render) e o Neon ja no ar (ver `docs/DEPLOY-FREE.md`).

---

## 1. Build

O build e o mesmo do desktop (`npm run build`), saida em `apps/pdv/dist`. Aponte para a API:

```bash
VITE_API_URL="https://pdv-w4es.onrender.com" npm run build
```

O app usa **HashRouter** (rotas com `#`), entao **nao precisa** de regra de rewrite no host.

---

## 2. Hospedar (estatico, gratis)

Use Cloudflare Pages, Netlify ou Vercel — como um projeto **separado** do painel admin.

Configuracao:
- **Build command:** `rm -rf node_modules package-lock.json && npm install --ignore-scripts && npm run build`
  (o `rm` evita o bug do Rollup em Linux quando o lockfile foi gerado no Windows)
- **Build output directory:** `apps/pdv/dist`
- **Production branch:** `feature-turso-implement` (ou `main`, apos o merge)
- **Environment variables:**
  ```txt
  VITE_API_URL = https://pdv-w4es.onrender.com
  NODE_VERSION = 20
  ```

No fim, anote a URL (ex.: `https://pdv-loja.pages.dev`).

---

## 3. Liberar o CORS da API para o app web

O app web chama a API de outra origem, entao a URL precisa entrar na allowlist.
No **Render → Environment**, ajuste `CORS_ORIGINS` para incluir **as duas** URLs
(painel admin + app web), separadas por virgula:

```txt
CORS_ORIGINS=https://pdv.emerson-14.workers.dev,https://pdv-loja.pages.dev
```

Salve (o Render reinicia). O app desktop (Electron) continua liberado automaticamente
(origem `localhost`/`file://`), sem precisar entrar na lista.

---

## 4. Usar

Abra a URL do app web -> tela de login em **modo online** (sem toggle Local/Online, ja que
nao ha Electron). Entre com o ID da loja + usuario/senha, ou crie/entre numa loja.

**Instalar como app (PWA):** no Chrome/Edge (desktop ou Android), menu -> "Instalar app";
no iPhone (Safari), Compartilhar -> "Adicionar a Tela de Inicio". Abre em tela cheia,
com icone proprio.

---

## Observacoes

- **Impressao**: na web nao ha impressao termica silenciosa; o botao Imprimir abre a
  caixa de impressao do navegador. Para enviar o recibo ao cliente, use **Compartilhar
  recibo** (gera a imagem e abre o compartilhamento nativo).
- **Backup/importacao local**: recursos que leem o `.sqlite3` sao exclusivos do desktop;
  na web ficam indisponiveis (a migracao de dados locais e feita pelo app desktop).
- **Offline**: o service worker cacheia o app (network-first), entao ele abre offline,
  mas as operacoes exigem conexao com a API.
