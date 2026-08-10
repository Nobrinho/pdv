# Serviços — Desktop (web e Electron)

> Layout de tela grande. Conteúdo/fluxo geral: ver [../v2/06-servicos.md](../v2/06-servicos.md).

## Em uma frase

O registro de serviços/mão de obra em tela larga: indicadores do período no topo
e uma **tabela** com os serviços feitos, o técnico responsável e o valor.

## Como a pessoa chega aqui

- **Serviços** na sidebar (serviços também nascem dentro das vendas).

## Esboço da tela (desktop)

```
┌──────────────────────────────────────────────┐
│ Serviços      [Mês ▾]            [+ Registrar] │
│ ┌──────────────┐ ┌──────────────┐             │
│ │ Qtd Serviços │ │ Total Pago   │             │
│ │     18       │ │  R$ 2.340    │             │
│ └──────────────┘ └──────────────┘             │
├──────────────────────────────────────────────┤
│ Data  │ Serviço          │ Técnico │ Valor    │
│ 12/08 │ Troca de óleo    │ João    │  60,00   │
│ 11/08 │ Revisão freios   │ Maria   │ 180,00   │
└──────────────────────────────────────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Cabeçalho** — título, **período** e **Registrar serviço**.
2. **Indicadores** — Qtd. de serviços e Total pago no período.
3. **Tabela** — data, serviço, **técnico** e **valor**, ordenável.
4. **Registro (modal)** — descrição, técnico e valor.

## O que a pessoa pode fazer

- **Registrar** serviço, **ver totais** e **filtrar por período**.

## Fluxos

**Registrar** → **Registrar** → descrição + técnico + valor → salva (entra na
tabela, soma nos indicadores e na comissão do técnico quando aplica).

## Estados visuais

- **Carregando**: esqueleto.
- **Sem serviços**: mensagem neutra com atalho para **Registrar**.
- **Salvando**: botão em carregamento.

## Diretrizes para o desktop

- **Indicadores no topo, tabela abaixo** (técnico e valor bem alinhados).
- Coerência com **Vendas** (mesmo conceito de mão de obra + técnico).

## Modo Electron (app instalado)

- No **modo local**, os serviços ficam no **banco do computador** e funcionam
  **offline**.
- Refletem o **terminal** enquanto local; consolidam com a loja ao usar online.
