# Login / Criar loja — Desktop (web e Electron)

> Layout de tela grande. Para o conteúdo/fluxo geral, ver também a spec mobile
> ([../v2/01-login.md](../v2/01-login.md)).

## Em uma frase

A porta de entrada em tela larga: um cartão de login centralizado sobre um fundo
com a marca **SysControl** (cores do design system), onde a pessoa confirma a
loja e informa usuário e senha.

## Como a pessoa chega aqui

- Abriu o app (aba do navegador ou janela do Electron) e não está logada.
- A sessão expirou e o app voltou para cá.
- Abriu um **link de convite** com a loja embutida (web).

## Esboço da tela (desktop)

```
┌───────────────────────────────────────────────┐
│                                                │
│      [ marca SysControl · teal petróleo ]      │
│                                                │
│        ┌─────────────────────────────┐         │
│        │ Entrar | Criar loja         │         │
│        │ 🏪 Loja #4 · Minha Loja  ⇄  │         │
│        │ Usuário [ 👤 ............. ] │         │
│        │ Senha   [ 🔒 .......... 👁 ]│         │
│        │ [        ENTRAR       →    ]│         │
│        │ ⚙ Avançado: servidor        │         │
│        └─────────────────────────────┘         │
│           v1.9 • © Minha Loja                  │
└───────────────────────────────────────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Fundo com a marca** — tela cheia com a identidade **SysControl** fixa
   (cores do DS); aproveita o espaço para respiro visual.
2. **Cartão de login centralizado** — abas **Entrar / Criar loja**, contexto da
   **loja** (chip com nome + trocar), **usuário** e **senha** (com mostrar
   senha), botão **Entrar**.
3. **Criar loja** — aba com formulário curto (nome da loja, contato, dados do
   administrador).
4. **Avançado (escondido)** — link que revela o **endereço do servidor**.
5. **Rodapé** — versão do app e crédito da loja.

## O que a pessoa pode fazer

- **Entrar** com usuário e senha (Enter confirma).
- **Trocar de loja** ou **criar loja nova**.
- (Avançado) **apontar para outro servidor**.

## Fluxos

**Entrar**
1. A loja aparece como chip → digita usuário e senha → **Entrar** (ou Enter).
2. Cai no **Painel**.

**Criar loja**
1. Aba **Criar loja** → preenche → cria e já entra; mostra o **número da loja**.

## Estados visuais

- **Abrindo**: "Iniciando terminal…" com a marca.
- **Enviando**: botão em "Entrando…/Criando…".
- **Erro**: aviso claro (senha errada, loja bloqueada, limite de aparelhos).

## Diretrizes para o desktop

- **Cartão centralizado** com largura confortável; nada de esticar campos na tela
  toda.
- **Teclado**: Tab entre campos, Enter para entrar, foco visível.
- **Marca em destaque** no fundo, sem competir com o formulário.

## Modo Electron (app instalado)

- No Electron o login pode ser **local**: valida o usuário no **banco do próprio
  computador** (funciona **offline**), sem depender do servidor.
- O campo **Avançado → servidor** e a escolha **local × online** importam aqui: é
  onde se define se aquele terminal trabalha com dados locais ou conectado à loja
  online.
- **Criar loja** no modo local cria a base no próprio computador; depois dá para
  **migrar para a loja online** (ver Configurações).
- Na web esse controle de modo não existe: é **sempre online**.
