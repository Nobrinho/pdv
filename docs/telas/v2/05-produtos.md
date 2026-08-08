# Produtos (Estoque) — descrição de conteúdo e fluxo (mobile, online)

> Versão de **conteúdo/design** (não técnica). Foco no modo **online**.

## Em uma frase

É o catálogo/estoque: cadastrar produtos, ver preço e saldo, dar entrada de
mercadoria e importar itens em lote — a base do que se vende.

## Como a pessoa chega aqui

- Toca em **Produtos** na navegação.
- Ou vem de um alerta do Painel ("Zerados", "Baixo Estoque").

## Esboço da tela (celular)

```
┌───────────────────────────┐
│ Produtos          [+ Novo] │
│ 🔎 Buscar por nome/código  │
│ [Todos] [Baixo] [Zerados]  │  ← filtros rápidos
├───────────────────────────┤
│ ┌───────────────────────┐  │
│ │ Óleo de Motor 1L      │  │  ← cartão do produto
│ │ Cód 123 · Novo        │  │
│ │ Venda R$ 25 · Saldo 8 │  │
│ │           [entrada][⋯]│  │
│ └───────────────────────┘  │
│ ┌───────────────────────┐  │
│ │ Pastilha de Freio     │  │
│ │ Venda R$ 90 · Saldo 0 │  │  ← saldo zerado destacado
│ └───────────────────────┘  │
└───────────────────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Cabeçalho** — título, **Novo produto** e busca por nome/código.
2. **Filtros de situação** — Todos / Baixo estoque / Zerados (e novo/usado).
3. **Lista em cartões** — cada produto mostra descrição, código, tipo
   (novo/usado), **preço de venda** e **saldo**, com o saldo baixo/zerado em
   destaque de alerta.
4. **Ações por item** — **entrada de estoque**, **editar** e **excluir**.
5. **Cadastro/edição (modal)** — tipo (novo/usado), código, descrição, **preço
   de custo**, **preço de venda** e **estoque inicial/saldo**.
6. **Entrada de estoque (modal)** — adicionar quantidade que chegou (repõe saldo).
7. **Importação em lote** — colar/subir uma planilha; o sistema mostra quantos
   são novos e quantos são **duplicados**, e a pessoa escolhe **pular** ou
   **atualizar** os repetidos.

## O que a pessoa pode fazer

- **Cadastrar** e **editar** produtos.
- **Dar entrada** de mercadoria (repor saldo).
- **Excluir** produto.
- **Buscar e filtrar** por situação de estoque.
- **Importar** vários produtos de uma vez.

## Fluxos

**Cadastrar produto**
1. **Novo** → preenche descrição, custo, venda e saldo inicial → **Salvar**.

**Repor estoque**
1. No cartão do produto → **entrada** → informa a quantidade que chegou →
   **Confirmar entrada** → o saldo sobe.

**Importar lista**
1. Abre **Importar** → cola/sobe a planilha.
2. Vê o resumo (novos × duplicados) → escolhe **pular** ou **atualizar** os
   duplicados → confirma.

## Estados visuais

- **Carregando**: esqueleto de cartões.
- **Lista vazia / busca sem resultado**: mensagem com atalho para **Novo produto**.
- **Saldo zerado/baixo**: cor de alerta no saldo.
- **Salvando/importando**: botões em carregamento com resumo ao final.

## Diretrizes para o redesenho mobile

- **Lista em cartões**, não tabela — saldo e preço bem visíveis.
- **Ação principal (Novo)** sempre acessível; ações por item discretas (menu ⋯).
- **Filtros de situação** como chips no topo (usa os alertas do Painel).
- **Formulário curto e objetivo** no modal, com os campos de dinheiro agrupados.
- **Importação guiada**: deixar claro o que vai acontecer com os duplicados antes
  de confirmar.
