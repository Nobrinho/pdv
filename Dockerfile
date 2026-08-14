# =============================================================
# Dockerfile de producao da API SysControl (apps/pdv-back).
# Portavel: funciona no Railway, Fly.io, Render ou qualquer VPS.
# O app desktop (Electron) e o painel admin NAO entram nesta imagem.
# =============================================================
FROM node:20-alpine

WORKDIR /app

# Instala apenas dependencias de producao, sem compilar modulos nativos
# (better-sqlite3/electron sao do desktop e nao sao usados pela API) e
# sem rodar o postinstall do electron-builder.
COPY package.json package-lock.json ./
# npm install (nao ci) para tolerar drift do lock; --omit=dev pula deps de
# desenvolvimento (vite/electron/pglite) e --ignore-scripts pula builds nativos.
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund

# Codigo da API + migrations.
COPY apps/pdv-back ./apps/pdv-back
# Codigo compartilhado (contratos + funcoes puras) usado pela API em runtime.
COPY packages ./packages

ENV NODE_ENV=production
ENV SERVER_PORT=3333
EXPOSE 3333

CMD ["node", "apps/pdv-back/src/server.js"]
