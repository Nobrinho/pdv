# Comissões — descrição de conteúdo e fluxo (mobile, online)

> Versão de **conteúdo/design** (não técnica). Foco no modo **online**.

## Em uma frase

É onde se apura e se paga a comissão da equipe: ver as vendas que geraram
comissão no período, selecionar as pendentes e dar **baixa** (marcar como pagas).

## Como a pessoa chega aqui

- Toca em **Comissões** na navegação.

## Esboço da tela (celular)

```
┌───────────────────────────┐
│ Comissões    [ Filtros ▾ ] │
│ Período · Vendedor · Status│
├───────────────────────────┤
│ Resumo: pendente R$ 340    │
├───────────────────────────┤
│ ☑ 12/08 · João · R$ 60     │  ← seleção múltipla
│ ☑ 11/08 · João · R$ 40     │
│ ☐ 10/08 · Maria (paga)     │  ← paga: não selecionável
├───────────────────────────┤
│ [ Baixar 2 selecionada(s) ]│  ← ação em lote
└───────────────────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Filtros** — período, **vendedor** e **status de repasse** (tudo/pendentes/
   pagas), colapsáveis no celular.
2. **Resumo** — total pendente / número de vendas listadas.
3. **Extrato selecionável** — cada linha é uma venda com data, vendedor e
   comissão gerada; um **checkbox** por linha e um **selecionar tudo**. Vendas já
   pagas ficam desabilitadas.
4. **Visualização** — modo condensado × detalhado do extrato.
5. **Ação em lote** — **baixar (marcar como pagas)** as selecionadas.

## O que a pessoa pode fazer

- **Filtrar** por período/vendedor/status.
- **Selecionar** várias comissões pendentes.
- **Dar baixa** em lote (registrar o repasse).
- **Alternar** entre extrato condensado e detalhado.

## Fluxos

**Pagar comissões do vendedor**
1. Filtra por **vendedor** + status **pendentes**.
2. **Seleciona tudo** (ou algumas) → confere o total.
3. **Baixar selecionadas** → elas viram "pagas".

## Estados visuais

- **Carregando**: esqueleto do extrato.
- **Intervalo de datas inválido**: seleção/baixa bloqueadas com aviso.
- **Sem pendências**: mensagem neutra.
- **Baixando**: botão em carregamento; linhas mudam para "paga".

## Diretrizes para o redesenho mobile

- **Seleção em lote confortável** (checkbox grande, "selecionar tudo" visível).
- **Total pendente sempre à vista** para saber quanto vai pagar.
- **Filtros colapsados** por padrão.
- **Feedback claro** ao dar baixa (o que foi pago, quanto).
