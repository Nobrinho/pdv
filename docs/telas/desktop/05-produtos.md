# Produtos (Estoque) — Desktop (web e Electron)

> Layout de tela grande. Conteúdo/fluxo geral: ver [../v2/05-produtos.md](../v2/05-produtos.md).

## Em uma frase

O catálogo/estoque em tela larga: uma **tabela** com produtos, preços e saldos,
busca e filtros no topo, e modais centralizados para cadastrar, dar entrada e
importar.

## Como a pessoa chega aqui

- **Produtos** na sidebar, ou por um alerta do Painel (Zerados/Baixo Estoque).

## Esboço da tela (desktop)

```
┌──────────────────────────────────────────────┐
│ Produtos    🔎 buscar   [Todos▾] [+ Novo][Importar]│
├──────────────────────────────────────────────┤
│ Cód │ Descrição      │ Tipo │ Venda │ Saldo │ ⋯ │
│ 123 │ Óleo Motor 1L  │ Novo │ 25,00 │  8    │…  │
│ 210 │ Pastilha Freio │ Novo │ 90,00 │  0 ⚠  │…  │  ← saldo 0 em alerta
│ ... │                │      │       │       │   │
└──────────────────────────────────────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Barra de topo** — busca por nome/código, **filtros de situação** (Todos/
   Baixo/Zerados, novo/usado), **Novo produto** e **Importar**.
2. **Tabela de produtos** — colunas Código, Descrição, Tipo, **Preço de venda**,
   **Saldo** e ações; saldo baixo/zerado destacado. Ordenação por coluna.
3. **Cadastro/edição (modal centralizado)** — tipo, código, descrição, custo,
   venda, estoque.
4. **Entrada de estoque (modal)** — quantidade recebida.
5. **Importação (modal)** — colar/subir planilha; resumo novos × **duplicados**
   com escolha **pular/atualizar**.

## O que a pessoa pode fazer

- **Cadastrar/editar/excluir**, **dar entrada**, **buscar/filtrar**, **importar**.

## Fluxos

**Cadastrar** → **Novo** → dados → **Salvar**.
**Repor** → linha do produto → **entrada** → quantidade → **Confirmar**.
**Importar** → **Importar** → planilha → resolve duplicados → confirma.

## Estados visuais

- **Carregando**: esqueleto de tabela.
- **Vazio/sem resultado**: mensagem com atalho para **Novo**.
- **Saldo baixo/zerado**: cor de alerta.
- **Salvando/importando**: botões em carregamento + resumo.

## Diretrizes para o desktop

- **Tabela** com ordenação e colunas alinhadas (números à direita).
- **Ações por linha** discretas (menu ⋯) + ações globais no topo.
- **Importação** é caso clássico de desktop: planilha grande, revisão antes de
  confirmar.

## Modo Electron (app instalado)

- **Modo local**: o catálogo fica no **banco do computador**; cadastros e entradas
  funcionam **offline**.
- **Leitor de código de barras** ajuda no cadastro/entrada (bipar o item).
- **Importação em lote** é especialmente útil no app instalado para montar o
  estoque inicial de uma vez.
- Ao **migrar para online**, o catálogo local é enviado para a loja online.
