# Orçamentos — Desktop (web e Electron)

> Layout de tela grande. Conteúdo/fluxo geral: ver [../v2/08-orcamentos.md](../v2/08-orcamentos.md).

## Em uma frase

Os orçamentos em tela larga: uma **tabela** com os orçamentos e um **preview
grande** do documento pronto para exportar (imagem/PDF/impressão) ou converter em
venda.

## Como a pessoa chega aqui

- **Orçamentos** na sidebar.

## Esboço da tela (desktop)

```
┌──────────────────────────────────────────────┐
│ Orçamentos                        [+ Novo]     │
│ Código │ Cliente     │ Valor │ Situação │ ⋯   │
│ ORC-07 │ Minha Loja  │ 320   │ aberto   │ ver │
│ ORC-06 │ João        │  90   │convertido│ ver │
└──────────────────────────────────────────────┘
  (ver) → preview grande (documento) + ações
          [Fechar][Imagem][PDF][Imprimir]
          [ Converter em venda ]
```

## Blocos de conteúdo (o que aparece)

1. **Cabeçalho** — título e **Novo orçamento**.
2. **Tabela** — código, cliente, valor, situação (aberto/convertido), ações.
3. **Montagem** — itens (produtos/serviços), valores e **cliente** (com cadastro
   rápido).
4. **Preview (modal grande)** — o documento do orçamento em tamanho de tela,
   com **exportar imagem**, **exportar PDF** e **imprimir**.
5. **Conversão em venda (modal)** — transforma o orçamento aprovado em venda.

## O que a pessoa pode fazer

- **Criar** orçamento, **associar/cadastrar cliente**, **exportar/enviar**,
  **converter em venda**.

## Fluxos

**Fazer e enviar** → **Novo** → itens + cliente → **Preview** → **PDF/Imagem**.
**Aprovar → vender** → abre o orçamento → **Converter em venda** → confirma.

## Estados visuais

- **Carregando**: esqueleto de tabela/preview.
- **Sem orçamentos**: atalho para **Novo**.
- **Exportando/Imprimindo/Convertendo**: botões em carregamento.

## Diretrizes para o desktop

- **Preview generoso** (o documento é o que o cliente vê) — a largura ajuda.
- **Exportar** com destaque; **converter** como "ganhou o negócio".

## Modo Electron (app instalado)

- **Impressão térmica**: além de imagem/PDF, dá para **imprimir** o orçamento
  direto na impressora configurada.
- No **modo local**, orçamentos ficam no **computador** e funcionam **offline**.
- A geração de **PDF/imagem** funciona igual na web e no Electron.
