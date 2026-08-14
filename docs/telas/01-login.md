# 01 — Login / Criar loja / Setup inicial

## Objetivo

Autenticar o operador numa loja e entrar no terminal. Concentra três fluxos:
entrar em loja existente, criar uma loja nova (modo online) e o setup do primeiro
administrador (modo local/Electron sem usuários).

## Acesso

- Tela pré-autenticação (renderizada quando não há `user` no `AuthContext`).
- Sem menu. É o ponto de entrada.
- Pré-condições: no web, a sessão é restaurada do `localStorage` (token) — se
  válida, pula direto pro app; se o token expirou, cai aqui via 401 global.

## Dados

- `api.auth.joinStore({ lojaId, codigo, username, password, device })` — login online (registra dispositivo, respeita limite do plano).
- `api.auth.login({ lojaId, username, password })` — login local (Electron).
- `api.auth.createStore({ store, admin, settings })` — cria loja + admin (online).
- `api.auth.register(...)` — cria o primeiro admin (setup local).
- `api.invites.resolve(codigo)` — resolve o convite do link (`?c=CÓDIGO`).
- `api.config.getVersion()` — versão do app no rodapé.
- Sessão persistida: `syscontrol_online_token`, `syscontrol_online_loja_id`, `syscontrol_online_user`, `syscontrol_device_id`.
- Identidade da loja (logo, cores, nome, fundo) vem do cache de branding (`TenantContext`), que sobrevive ao F5.

## Elementos e campos

**Cabeçalho (branding):** logo da loja (ou ícone padrão), nome da loja, subtítulo, cores do tenant no gradiente.

**Seletor de modo (só Electron):** abas Local / Online.

**Bloco online:**
- Abas Entrar / Criar loja.
- Toggle "Avançado: servidor" → revela campo **Servidor da API** (URL).
- **Loja lembrada**: chip "Loja #X · trocar" (se já logou antes) OU campo **ID da loja**.
- **Banner de convite**: se veio por link (`?c=`), mostra "Entrando na loja: {nome}".

**Formulário Entrar:** ID da loja (quando não lembrada), Usuário, Senha, botão **ENTRAR**.

**Formulário Criar loja:** Nome da loja*, Cidade/UF, Telefone, e bloco Administrador (Nome*, Login*, Senha*), botão **CRIAR LOJA**.

**Formulário Setup (local, 1º acesso):** Nome completo*, Usuário*, Senha*, Confirmação*, botão **Ativar Sistema**.

**Rodapé:** versão/build e créditos (se o tenant tiver `devNome`).

## Ações e regras de negócio

- **Entrar (online)**: exige `lojaId` (ou convite) + usuário + senha. Registra o dispositivo; se exceder o limite de dispositivos do plano, bloqueia com mensagem. Persiste token/loja/usuário. Recarrega o tenant.
- **Entrar (local)**: valida usuário/senha contra o SQLite local.
- **Criar loja**: valida nome da loja, nome/login do admin e senha (mín. 4). Cria e já faz login automático (join) na loja recém-criada; mostra o **ID da loja** para o dono anotar.
- **Setup**: senha e confirmação devem bater (mín. 4). Cria o admin e volta pro login.
- **Trocar loja**: limpa a loja lembrada e mostra o campo de ID.
- Feedback de carregamento em todos os botões (estado `submitting`).

## Estados

- **Carregando inicial**: spinner "Iniciando Terminal…".
- **Enviando**: botões com spinner e texto ("ENTRANDO…", "CRIANDO…").
- **Erro**: alertas (credenciais inválidas, loja bloqueada, limite de dispositivos, senha curta).
- **Sessão expirada**: 401 global limpa a sessão e retorna aqui.

## Layout mobile proposto

- Já refeito recentemente: usa `100dvh`, rola como rede de segurança e compacta o cabeçalho/paddings no mobile (`sm:` breakpoints) — o botão de login não fica mais escondido.
- Card único centralizado, largura total no celular. Cabeçalho enxuto (logo menor, título 3xl).
- Manter o campo de servidor sempre escondido atrás de "Avançado" (não poluir).
- Loja como chip (não campo) reduz digitação no balcão.
- Teclado: `inputMode` numérico no ID da loja; foco automático no primeiro campo relevante.

## Pendências / melhorias

- Opção "lembrar usuário" (além da loja) para logins repetidos no mesmo aparelho.
- Mostrar/ocultar senha (olho) nos campos de senha.
- Mensagem clara de "sem internet" no modo online antes de tentar logar.
