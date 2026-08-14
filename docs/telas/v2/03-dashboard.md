# Dashboard (Painel) — descrição de conteúdo e fluxo (mobile, online)

> Versão de **conteúdo/design** (não técnica). Foco no modo **online**.

## Em uma frase

É a primeira tela depois do login: um resumo do dia (e do período escolhido)
com faturamento, lucro, vendas e alertas de estoque — para a pessoa saber, de
relance, como o negócio está indo.

## Como a pessoa chega aqui

- Logo após entrar no app.
- Ao tocar em **Painel** na navegação inferior.

## Esboço da tela (celular)

```
┌───────────────────────────┐
│ Painel de Controle    ↻    │  ← título + atualizar
│ Hoje ▾   (período)         │  ← seletor de período
├───────────────────────────┤
│ ┌─────────┐ ┌─────────┐    │
│ │Faturam. │ │ Lucro   │    │  ← cartões de indicador
│ │ R$ 1.2k │ │ R$ 480  │    │
│ └─────────┘ └─────────┘    │
│ ┌─────────┐ ┌─────────┐    │
│ │ Vendas  │ │Comissões│    │
│ └─────────┘ └─────────┘    │
├───────────────────────────┤
│ 💰 Venda Potencial         │  ← valor do estoque a preço de venda
│    R$ 8.400 em prateleira  │
├───────────────────────────┤
│ ⚠ Estoque                  │
│  • Zerados: 3              │  ← alertas clicáveis
│  • Baixo estoque: 7        │
└───────────────────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Cabeçalho** — título "Painel de Controle", botão **atualizar** e um
   **seletor de período** (hoje / semana / mês / intervalo).
2. **Cartões de indicador** — Faturamento, Lucro Líquido, Vendas (quantidade),
   Mão de Obra e Comissões do período. Cada cartão tem um número grande e um
   ícone; alguns têm dica explicativa ao tocar.
3. **Venda Potencial** — quanto o estoque atual vale a preço de venda ("ticket
   total em prateleira").
4. **Alertas de estoque** — **Produtos Zerados** e **Baixo Estoque**, com
   contagem; servem de atalho para agir.

## O que a pessoa pode fazer

- **Trocar o período** e ver os números recalcularem.
- **Atualizar** os dados manualmente.
- **Tocar num alerta de estoque** para ir tratar os produtos.

## Fluxos

**Ver o dia**
1. Entra no app → cai no Painel com o período "Hoje".
2. Lê faturamento/lucro/vendas de relance.

**Investigar estoque**
1. Vê "Zerados: 3" → toca.
2. Vai para Produtos já filtrado nos itens que precisam de reposição.

## Estados visuais

- **Carregando**: esqueleto dos cartões (placeholders animados).
- **Sem vendas no período**: números zerados com um texto neutro ("Nenhuma
  venda no período").
- **Erro**: aviso curto com opção de tentar de novo.

## Diretrizes para o redesenho mobile

- **Cartões em grade 2×N**, número grande e legível, ícone discreto — cor do DS
  para o indicador principal.
- **Período sempre à mão** no topo (chips ou dropdown), sem esconder.
- **Alertas como atalho**: o que é problema (zerados, baixo estoque) deve levar
  direto à ação.
- **Hierarquia**: dinheiro primeiro (faturamento/lucro), depois volume, depois
  alertas. Nada de tabela densa no celular.
