# Despesas — Desktop (web e Electron)

> Layout de tela grande. Conteúdo/fluxo geral: ver [../v2/12-despesas.md](../v2/12-despesas.md).

## Em uma frase

O controle de saídas em tela larga: filtros de período/categoria, o total do
período e uma **tabela** de despesas, com formulário para lançar contas (avulsas
ou recorrentes).

## Como a pessoa chega aqui

- **Despesas** na sidebar.

## Esboço da tela (desktop)

```
┌──────────────────────────────────────────────┐
│ Despesas   De│Até│Categoria       [+ Adicionar]│
│ Total no período: R$ 1.850                     │
├──────────────────────────────────────────────┤
│ Data  │ Descrição │ Categoria │ Valor │ Pagto │
│ 05/08 │ Aluguel   │ Fixas     │ 1.200 │ Pix   │
│ 08/08 │ Peças     │ Compras   │  650  │Dinheiro│
└──────────────────────────────────────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Cabeçalho** — título, **Adicionar despesa** e **filtros** (período,
   categoria).
2. **Total do período** — soma das saídas filtradas.
3. **Tabela** — descrição, data, valor, categoria e forma de pagamento.
4. **Cadastro (formulário/modal)** — descrição, **categoria**, **valor**,
   **data**, **forma de pagamento**, **recorrente (mensal)** e observações.

## O que a pessoa pode fazer

- **Registrar** (avulsa ou recorrente), **filtrar**, **ver total**,
  **editar/excluir**.

## Fluxos

**Lançar conta** → **Adicionar** → descrição/categoria/valor/data/pagamento →
(opcional) **recorrente** → **Salvar**.

## Estados visuais

- **Carregando**: esqueleto de tabela.
- **Sem despesas**: atalho para **Adicionar**.
- **Salvando**: botão em carregamento.

## Diretrizes para o desktop

- **Total em destaque**; **tabela** com valores alinhados à direita.
- **Formulário** com categoria/pagamento em selects, campos de dinheiro juntos.
- **Recorrente** para contas fixas.

## Modo Electron (app instalado)

- No **modo local**, as despesas ficam no **banco do computador** e funcionam
  **offline**.
- Entram no cálculo de **lucro** dos Relatórios do próprio terminal; consolidam na
  loja ao usar online.
