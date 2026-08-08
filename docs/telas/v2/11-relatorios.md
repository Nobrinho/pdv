# Relatórios — descrição de conteúdo e fluxo (mobile, online)

> Versão de **conteúdo/design** (não técnica). Foco no modo **online**.

## Em uma frase

É a visão gerencial do período: faturamento, lucro, formas de pagamento e
desempenho por vendedor — com opção de **exportar em PDF**.

## Como a pessoa chega aqui

- Toca em **Relatórios** na navegação.

## Esboço da tela (celular)

```
┌───────────────────────────┐
│ Relatórios  [ Filtros ▾ ]  │
│ Início · Fim · Vendedor ·  │
│ Pagamento                  │
├───────────────────────────┤
│ ┌────────┐ ┌────────┐      │
│ │Faturam.│ │ Lucro  │      │  ← indicadores do período
│ └────────┘ └────────┘      │
│ Por forma de pagamento     │  ← quebra por Pix/dinheiro/…
│ Por vendedor               │  ← ranking/valores
├───────────────────────────┤
│ [ Exportar PDF ]           │
└───────────────────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Filtros** — **início/fim** (intervalo), **vendedor** e **forma de
   pagamento**, colapsáveis no celular.
2. **Indicadores** — faturamento, lucro e outros totais do período.
3. **Quebras** — desempenho **por forma de pagamento** e **por vendedor**.
4. **Exportar PDF** — gera o relatório do período para enviar/arquivar.

## O que a pessoa pode fazer

- **Escolher o período** e filtrar por vendedor/pagamento.
- **Ler os indicadores** e as quebras.
- **Exportar em PDF**.

## Fluxos

**Fechar o mês**
1. Define **início/fim** do mês.
2. Lê faturamento/lucro e o ranking por vendedor.
3. **Exportar PDF** para guardar/enviar.

## Estados visuais

- **Carregando**: esqueleto dos indicadores.
- **Sem dados no período**: números zerados com texto neutro.
- **Exportando**: botão em "Exportando…".

## Diretrizes para o redesenho mobile

- **Indicadores primeiro**, quebras depois — nada de tabelão no celular.
- **Filtros de período** fáceis (atalhos hoje/semana/mês + intervalo).
- **Exportar PDF** como entrega final do relatório.
- Consistência com o **Painel** (mesmos números, aqui com mais detalhe/quebra).
