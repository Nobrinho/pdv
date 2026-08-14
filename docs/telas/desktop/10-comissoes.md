# Comissões — Desktop (web e Electron)

> Layout de tela grande. Conteúdo/fluxo geral: ver [../v2/10-comissoes.md](../v2/10-comissoes.md).

## Em uma frase

A apuração e baixa de comissões em tela larga: filtros na horizontal, um
**extrato em tabela** com seleção múltipla e uma ação em lote para marcar as
comissões como pagas.

## Como a pessoa chega aqui

- **Comissões** na sidebar.

## Esboço da tela (desktop)

```
┌──────────────────────────────────────────────┐
│ Comissões  Período│Vendedor│Status  Extrato▾  │
│ Resumo: pendente R$ 340                        │
├──────────────────────────────────────────────┤
│ ☑ │ Data  │ Vendedor │ Fat.Prod │ Comissão    │
│ ☑ │ 12/08 │ João     │ 600,00   │ 60,00       │
│ ☑ │ 11/08 │ João     │ 400,00   │ 40,00       │
│ ☐ │ 10/08 │ Maria    │ ...      │ paga        │
├──────────────────────────────────────────────┤
│                     [ Baixar 2 selecionada(s) ]│
└──────────────────────────────────────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Filtros na horizontal** — período, **vendedor**, **status de repasse** e
   alternância de **extrato** (condensado/detalhado).
2. **Resumo** — total pendente / vendas listadas.
3. **Extrato em tabela** — data, vendedor, faturamento e **comissão gerada**, com
   **checkbox por linha** e **selecionar tudo**; pagas ficam desabilitadas.
4. **Ação em lote** — **baixar (marcar como pagas)** as selecionadas.

## O que a pessoa pode fazer

- **Filtrar**, **selecionar várias**, **dar baixa em lote**, **alternar extrato**.

## Fluxos

**Pagar comissões** → filtra vendedor + pendentes → seleciona → confere total →
**Baixar selecionadas**.

## Estados visuais

- **Carregando**: esqueleto do extrato.
- **Intervalo inválido**: seleção/baixa bloqueadas com aviso.
- **Sem pendências**: mensagem neutra.
- **Baixando**: botão em carregamento; linhas viram "paga".

## Diretrizes para o desktop

- **Tabela com seleção múltipla** confortável (checkbox + selecionar tudo no
  cabeçalho).
- **Total pendente** e **ação de baixa** sempre visíveis.
- **Extrato detalhado** aproveita a largura para mostrar as vendas por trás da
  comissão.

## Modo Electron (app instalado)

- No **modo local**, a apuração usa as vendas **do próprio computador**; **offline**.
- Para uma equipe em vários terminais, a apuração completa faz mais sentido na
  **loja online** (junta todos os aparelhos).
