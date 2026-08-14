# Despesas — descrição de conteúdo e fluxo (mobile, online)

> Versão de **conteúdo/design** (não técnica). Foco no modo **online**.

## Em uma frase

É o controle de saídas de dinheiro: registrar contas e gastos (aluguel, compras,
etc.), classificá-los e acompanhar o total por período — o outro lado do lucro.

## Como a pessoa chega aqui

- Toca em **Despesas** na navegação.

## Esboço da tela (celular)

```
┌───────────────────────────┐
│ Despesas     [+ Adicionar] │
│ De · Até · Categoria       │  ← filtros
├───────────────────────────┤
│ Total no período: R$ 1.850 │
├───────────────────────────┤
│ • Aluguel · 05/08          │
│   R$ 1.200 · Pix           │
│ • Peças · 08/08            │
│   R$ 650 · Dinheiro        │
└───────────────────────────┘
        (adicionar) ↓
┌───────────────────────────┐
│ Nova despesa               │
│ Descrição                  │
│ Categoria ▾   Valor        │
│ Data          Pagamento ▾  │
│ ☐ Despesa recorrente       │
│ Observações                │
│ [ Salvar ]                 │
└───────────────────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Cabeçalho** — título e **Adicionar despesa**.
2. **Filtros** — período (de/até) e **categoria**.
3. **Total do período** — soma das saídas filtradas.
4. **Lista** — descrição, data, valor, categoria e forma de pagamento.
5. **Cadastro (formulário)** — descrição, **categoria**, **valor**, **data**,
   **forma de pagamento** (select com as mais comuns), marcador **recorrente
   (mensal)** e observações.

## O que a pessoa pode fazer

- **Registrar** uma despesa (avulsa ou **recorrente**).
- **Filtrar** por período/categoria.
- **Ver o total** de saídas do período.
- **Editar/excluir** uma despesa.

## Fluxos

**Lançar uma conta**
1. **Adicionar** → descrição, categoria, valor, data e forma de pagamento.
2. (Opcional) marca **recorrente** se for mensal → **Salvar**.

## Estados visuais

- **Carregando**: esqueleto da lista.
- **Sem despesas no período**: mensagem neutra com atalho para **Adicionar**.
- **Salvando**: botão em carregamento.

## Diretrizes para o redesenho mobile

- **Total do período em destaque** (é o número que importa).
- **Formulário curto** com categoria e forma de pagamento em selects.
- **Recorrente** como atalho para contas fixas (evita relançar todo mês).
- Coerência com **Relatórios**: as despesas entram no cálculo de lucro.
