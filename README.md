# 🏍️ SysControl — Sistema de Gestão & PDV

Plataforma de gestão para comércio e oficinas: PDV desktop, painel administrativo web e API multi-loja.
Foco em agilidade no balcão, controle financeiro, segurança de dados e atualizações automáticas.

> Versão atual: **1.9.1** — projeto organizado como **monorepo**.

---

## 📦 Estrutura do monorepo

```txt
apps/
  pdv/          → Aplicativo desktop (Electron + React + Vite) usado pelas lojas
  pdv-admin/    → Painel web administrativo da plataforma (React + Vite)
  pdv-back/     → API Node.js multi-loja (PostgreSQL)
packages/
  shared/       → Código de domínio compartilhado entre os apps
```

Todos os scripts abaixo são executados a partir da **raiz do projeto** (`npm run <script>`).

---

## 🛠️ Stack

- **Desktop:** Electron + React + Vite + Tailwind CSS
- **Estado/dados:** TanStack Query (React Query)
- **Banco local (PDV):** SQLite (`better-sqlite3` + Knex)
- **Backend online:** Node.js + PostgreSQL (Knex) + Swagger
- **Sincronização online:** Turso (libSQL)
- **Distribuição:** Electron Builder + GitHub Releases (auto-update OTA)

---

## ✅ Pré-requisitos

- **Node.js LTS v20** — [nodejs.org](https://nodejs.org/)
- **Visual Studio Build Tools** (Windows, obrigatório) — necessário para compilar o `better-sqlite3` (módulo nativo).
  Na instalação, marque **"Desenvolvimento para desktop com C++"**. [Baixar Build Tools](https://visualstudio.microsoft.com/downloads/)
- **Docker** — apenas se for rodar a API backend (`apps/pdv-back`) com PostgreSQL local.

---

## 🚀 Instalação

```bash
# 1. Clonar o repositório
git clone https://github.com/Nobrinho/pdv.git
cd pdv

# 2. Instalar dependências (o postinstall recompila os módulos nativos)
npm install
```

Se aparecer erro de módulo nativo (`better-sqlite3`) após instalar/atualizar:

```bash
npm run postinstall
```

---

## ▶️ Como rodar

### 1. PDV Desktop (Electron) — uso principal

```bash
# App desktop completo (Electron + Vite com hot-reload)
npm run electron:dev

# Apenas o frontend no navegador (sem Electron) → http://localhost:5173
npm run dev
```

> Na primeira execução, o sistema cria o banco `syscontrol.sqlite3` automaticamente
> e pede para cadastrar o usuário **Administrador**.

### 2. Painel Admin (web)

```bash
npm run admin:dev        # → http://localhost:5174
```

### 3. API Backend (multi-loja)

```bash
npm run db:up            # sobe o PostgreSQL via Docker (porta 54329)
npm run server:migrate   # aplica as migrations
npm run server:dev       # inicia a API → http://localhost:3333

npm run db:down          # derruba o PostgreSQL quando terminar
```

- **Swagger UI:** http://localhost:3333/docs
- **Spec OpenAPI:** http://localhost:3333/openapi.json

Scripts auxiliares da API:

```bash
npm run server:start        # inicia a API (modo produção)
npm run server:smoke        # teste de fumaça (smoke test) contra o banco
npm run server:smoke:local  # smoke test local (sqlite)
npm run server:dunning      # rotina de cobrança (marca assinaturas vencidas)
```

---

## 🗄️ Banco de dados

### PDV (SQLite local)

- **Dev:** `syscontrol.sqlite3` na raiz do projeto.
- **Prod:** `%APPDATA%/SysControl/`.

```bash
npm run migrate:make     # cria uma nova migration do PDV
npm run migrate:latest   # aplica as migrations pendentes
```

**Resetar o banco em desenvolvimento** (apaga todos os dados):

1. Pare o terminal.
2. Delete o arquivo `syscontrol.sqlite3`.
3. Rode `npm run electron:dev` novamente (ele recria do zero).

### Backend (PostgreSQL)

```bash
npm run server:migrate   # aplica as migrations da API
npm run schema:parity    # compara o schema do SQLite com o do PostgreSQL
```

---

## 🔐 Variáveis de ambiente

**Raiz** — `.env` (sincronização Turso):

```txt
TURSO_URL=
TURSO_AUTH_TOKEN=
```

**Backend** — `apps/pdv-back/.env`:

```txt
DATABASE_URL=postgres://syscontrol:syscontrol@localhost:54329/syscontrol
SERVER_PORT=3333
SERVER_TOKEN_SECRET=dev-local-syscontrol-token-secret
PLATFORM_ADMIN_EMAIL=admin@syscontrol.local
PLATFORM_ADMIN_PASSWORD=admin123
PLATFORM_ADMIN_NAME=Administrador
```

---

## 🧪 Testes

```bash
npm test           # roda toda a suíte (Vitest) uma vez
npm run test:watch # modo interativo (re-roda ao salvar)
```

---

## 🔄 Atualizar o projeto

### Atualizar o ambiente de desenvolvimento

```bash
git pull                 # traz as últimas mudanças
npm install              # atualiza dependências (recompila nativos via postinstall)
npm run migrate:latest   # aplica novas migrations do PDV (se houver)
npm run server:migrate   # aplica novas migrations do backend (se usar a API)
```

Se der erro de módulo nativo depois de atualizar:

```bash
npm run postinstall
```

### Publicar uma atualização para os clientes (OTA via GitHub Releases)

1. **Incremente a versão** no `package.json` (ex.: `1.9.1` → `1.9.2`).
2. **Gere a build:**
   ```bash
   npm run dist
   ```
   Os artefatos ficam em `dist_electron/`.
3. **Publique no GitHub:** *Releases → Draft a new release*.
   - Crie uma **tag igual à versão** (ex.: `v1.9.2`).
   - Anexe em **Assets** os arquivos gerados:
     - `PDV-<versão>-x64.exe` (instalador)
     - `latest.yml`
   - Clique em **Publish**.

O aplicativo do cliente detecta a atualização ao abrir e oferece o download automaticamente.

---

## 📋 Referência rápida de comandos

| Comando | O que faz |
| --- | --- |
| `npm install` | Instala dependências (+ recompila nativos) |
| `npm run electron:dev` | PDV desktop completo (Electron + Vite) |
| `npm run dev` | Só o frontend do PDV → `localhost:5173` |
| `npm run build` | Build de produção do frontend do PDV |
| `npm run dist` | Gera o instalador `.exe` do PDV |
| `npm run postinstall` | Recompila módulos nativos (better-sqlite3) |
| `npm run admin:dev` | Painel admin web → `localhost:5174` |
| `npm run admin:build` | Build de produção do painel admin |
| `npm run db:up` / `db:down` | Sobe/derruba o PostgreSQL (Docker) |
| `npm run server:dev` | Inicia a API → `localhost:3333` |
| `npm run server:migrate` | Migrations do backend (PostgreSQL) |
| `npm run server:dunning` | Rotina de cobrança de assinaturas |
| `npm run migrate:make` / `migrate:latest` | Migrations do PDV (SQLite) |
| `npm run schema:parity` | Compara schema SQLite × PostgreSQL |
| `npm test` / `npm run test:watch` | Testes (Vitest) |

---

## ❓ Solução de problemas

**`node-gyp` / "Could not find any Visual Studio installation"**
Falta o compilador C++ no Windows. Instale o **Visual Studio Build Tools** (carga de trabalho C++) e reinicie o computador.

**`Cannot find module 'better-sqlite3'` após instalar o `.exe`**
A dependência nativa não foi recompilada para a versão do Electron empacotada. Rode `npm run postinstall` antes de `npm run dist`.

**Tela branca ao abrir o `.exe`**
Geralmente erro de caminho ou banco. Verifique se o `apps/pdv/electron/main.js` detecta corretamente o ambiente de produção (`!app.isPackaged`) e aponta para as migrações em `process.resourcesPath`.

---

## 📝 Licença

Desenvolvido por **Emerson Nobre**. Todos os direitos reservados.
