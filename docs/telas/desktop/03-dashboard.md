# Dashboard (Painel) — Desktop (web e Electron)

> Layout de tela grande. Conteúdo/fluxo geral: ver [../v2/03-dashboard.md](../v2/03-dashboard.md).

## Em uma frase

O resumo do negócio em tela larga: uma grade de indicadores (faturamento, lucro,
vendas, mão de obra, comissões) mais valor de estoque e alertas — tudo visível de
uma vez, sem rolar.

## Como a pessoa chega aqui

- Ao entrar no app (tela inicial) ou clicando em **Painel** na sidebar.

## Esboço da tela (desktop)

```
┌──────────────────────────────────────────────┐
│ Painel de Controle      [Hoje ▾]        [ ↻ ] │
├──────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│ │Fatur.│ │Lucro │ │Vendas│ │M.Obra│ │Comiss│ │  ← 5 cards em linha
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ │
├──────────────────────────────────────────────┤
│ 💰 Venda Potencial      │ ⚠ Estoque          │
│ R$ 8.400 em prateleira  │ Zerados 3 · Baixo 7 │
└──────────────────────────────────────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Cabeçalho** — título, **seletor de período** e **atualizar**.
2. **Grade de indicadores** — 5 cartões numa linha (a largura permite ver todos):
   Faturamento, Lucro Líquido, Vendas, Mão de Obra e Comissões, cada um com dica
   ao passar o mouse.
3. **Venda Potencial** — valor do estoque a preço de venda.
4. **Alertas de estoque** — Zerados e Baixo Estoque, clicáveis (atalho para
   Produtos).

## O que a pessoa pode fazer

- **Trocar período**, **atualizar**, **abrir os alertas** de estoque.

## Fluxos

**Ver o dia** → entra no Painel → lê os 5 indicadores de uma vez.
**Investigar estoque** → clica em "Zerados" → vai a Produtos filtrado.

## Estados visuais

- **Carregando**: esqueleto dos cartões.
- **Sem vendas**: números zerados com texto neutro.
- **Erro**: aviso com "tentar de novo".

## Diretrizes para o desktop

- **Indicadores numa linha** (não empilhar): a leitura "de relance" é o valor da
  tela.
- **Dicas no hover** para explicar cada número.
- **Densidade equilibrada**: aproveitar a largura sem virar um painel apertado.

## Modo Electron (app instalado)

- No **modo local**, os números vêm do **banco do próprio computador** e aparecem
  mesmo **sem internet**.
- Refletem apenas as vendas **daquele terminal** enquanto local; ao **migrar/usar
  online**, passam a refletir a loja inteira (todos os aparelhos).
