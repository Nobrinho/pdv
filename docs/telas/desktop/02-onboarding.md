# Onboarding — Desktop (web e Electron)

> Layout de tela grande. Conteúdo/fluxo geral: ver [../v2/02-onboarding.md](../v2/02-onboarding.md).

## Em uma frase

O assistente de primeira configuração em tela larga: um cartão central com
**3 etapas** (identidade da loja → comissões padrão → administrador), com barra
de progresso, que deixa o sistema pronto para vender.

## Como a pessoa chega aqui

- Logo após **criar a loja**, antes de usar o app.

## Esboço da tela (desktop)

```
┌───────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────┐ │
│  │ ← voltar                     Passo 1 / 3   │ │
│  │ ▓▓▓▓░░░░░                                  │ │
│  │ 🏪 Identidade da Loja                      │ │
│  │  Nome *          Endereço                  │ │
│  │  Telefone        Documento     (2 colunas) │ │
│  │  ...                                       │ │
│  │                          [ Prosseguir → ]  │ │
│  └───────────────────────────────────────────┘ │
└───────────────────────────────────────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Cartão do assistente** — centralizado, com **progresso "Passo X de 3"** e
   **voltar etapa**.
2. **Etapa 1 — Identidade da Loja** — dados que saem nos recibos, em **duas
   colunas** (aproveita a largura). Aviso se faltarem nome/endereço/telefone.
3. **Etapa 2 — Comissões Padrão** — percentuais (0–100) lado a lado.
4. **Etapa 3 — Administrador do Sistema** — usuário com acesso total.
5. **Avançar** — **Prosseguir** (1–2) e **Finalizar setup** (3).

## O que a pessoa pode fazer

- **Preencher** cada etapa, **avançar/voltar**.
- **Prosseguir com dados faltando** (com aviso).
- **Finalizar** e entrar no app.

## Fluxos

**Configurar a loja**
1. Identidade → **Prosseguir**.
2. Comissões → **Prosseguir**.
3. Administrador → **Finalizar setup** → entra no Painel.

## Estados visuais

- **Validação**: bloqueia comissão fora de 0–100.
- **Aviso de recibo incompleto** antes de pular a etapa 1.
- **Finalizando**: botão em carregamento.

## Diretrizes para o desktop

- **Duas colunas** nos formulários das etapas (largura ajuda a caber sem rolar).
- **Progresso e voltar** sempre visíveis.
- **Teclado**: Tab/Enter para andar rápido.

## Modo Electron (app instalado)

- No Electron o onboarding configura a **loja local** (banco no computador); tudo
  já funciona **offline** ao terminar.
- A etapa de **identidade** define os dados do **recibo térmico** impresso pelo
  app.
- Depois é possível **migrar para a loja online** em Configurações — o onboarding
  em si é igual nos dois modos.
