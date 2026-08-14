# Configurações — descrição de conteúdo e fluxo (mobile, online)

> Versão de **conteúdo/design** (não técnica). Foco no modo **online**.

## Em uma frase

É o painel de ajustes da loja: identidade (nome/logo do recibo), taxas de
comissão, cargos, usuários e ferramentas do sistema — o "quarto dos fundos" que
o dono usa de vez em quando.

## Como a pessoa chega aqui

- Toca em **Configurações** (geralmente no menu "Mais"/perfil).

## Esboço da tela (celular)

```
┌───────────────────────────┐
│ Configurações              │
├───────────────────────────┤
│ 🎨 Identidade da Loja      │
│    nome, logo do recibo    │
│    [ Salvar identidade ]   │
├───────────────────────────┤
│ % Comissões (taxas)        │
│    [ Atualizar taxas ]     │
├───────────────────────────┤
│ 👥 Usuários e Cargos       │
│    criar usuário / cargo   │
├───────────────────────────┤
│ 🛠 Ferramentas do sistema  │
│    link de acesso, migrar, │
│    impressora              │
└───────────────────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Identidade da loja** — **nome** e **logo do recibo**. A logo é **colorida**
   na tela e no compartilhamento (WhatsApp) e vira **preto e branco só na
   impressão** do recibo. Botão **Salvar identidade**.
2. **Comissões** — as **taxas** de comissão da equipe; **Atualizar taxas**.
3. **Usuários** — criar/gerenciar usuários (login da equipe) com **status**.
4. **Cargos** — funções (ex.: Vendedor, Técnico) que definem regras de comissão.
5. **Ferramentas do sistema** — gerar **link de acesso** por convite, **migrar
   para a loja online**, e ajuste de **impressora**.

> Não aparecem mais: a seção de **créditos ao desenvolvedor** (removida) e o
> **Log de Eventos** (oculto do menu).

## O que a pessoa pode fazer

- **Editar a identidade** (nome + logo do recibo) e salvar.
- **Ajustar as taxas de comissão**.
- **Criar/gerenciar usuários e cargos**.
- **Gerar link de acesso**, **migrar** a loja e configurar **impressora**.

## Fluxos

**Trocar a logo do recibo**
1. Em **Identidade** → sobe a nova logo (fica colorida na tela).
2. **Salvar identidade** → passa a valer; na **impressão** sai em P&B.

**Convidar alguém**
1. Em **Ferramentas** → **gerar link de acesso** → compartilha o link (a pessoa
   entra já na loja certa).

## Estados visuais

- **Salvando**: botões em carregamento (identidade/taxas).
- **Confirmações**: aviso de sucesso ao salvar.
- **Ações sensíveis** (migrar): confirmação antes de executar.

## Diretrizes para o redesenho mobile

- **Seções em cartões** empilhados, cada uma autoexplicativa.
- **Marca fixa SysControl**: aqui se edita a **identidade da loja** (nome/logo do
  recibo), não as cores do app — as cores são do design system.
- **Ações claras por seção** (um botão de salvar por bloco).
- **Esconder o avançado**: ferramentas de sistema por último; nada de expor
  logs/telas que confundem o usuário comum.
