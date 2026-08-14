# Relatórios — Desktop (web e Electron)

> Layout de tela grande. Conteúdo/fluxo geral: ver [../v2/11-relatorios.md](../v2/11-relatorios.md).

## Em uma frase

A visão gerencial em tela larga: filtros de período/vendedor/pagamento, os
indicadores do período e as quebras (por forma de pagamento e por vendedor), com
**exportar PDF**.

## Como a pessoa chega aqui

- **Relatórios** na sidebar.

## Esboço da tela (desktop)

```
┌──────────────────────────────────────────────┐
│ Relatórios  Início│Fim│Vendedor│Pagto  [PDF]  │
├──────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐              │
│ │Faturam.│ │ Lucro  │ │ ...    │              │
│ └────────┘ └────────┘ └────────┘              │
│ Por forma de pagamento │ Por vendedor         │  ← quebras lado a lado
│ Pix 40% · Dinheiro 35% │ João R$… · Maria R$… │
└──────────────────────────────────────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Filtros na horizontal** — **início/fim**, **vendedor** e **forma de
   pagamento** (abertos, há espaço).
2. **Indicadores** — faturamento, lucro e totais do período.
3. **Quebras lado a lado** — **por forma de pagamento** e **por vendedor**.
4. **Exportar PDF** — o relatório do período.

## O que a pessoa pode fazer

- **Definir período**, **filtrar**, **ler indicadores/quebras**, **exportar PDF**.

## Fluxos

**Fechar o mês** → define início/fim → lê faturamento/lucro e ranking → **PDF**.

## Estados visuais

- **Carregando**: esqueleto dos indicadores.
- **Sem dados**: números zerados com texto neutro.
- **Exportando**: botão em carregamento.

## Diretrizes para o desktop

- **Indicadores + quebras lado a lado** (a largura permite comparar).
- **Filtros de período** com atalhos + intervalo.
- **Exportar PDF** como entrega final.

## Modo Electron (app instalado)

- No **modo local**, os relatórios usam os dados **do computador** e saem
  **offline**.
- **Impressão**: além do PDF, dá para imprimir na impressora configurada.
- Refletem o terminal enquanto local; a visão da loja inteira vem no **online**.
