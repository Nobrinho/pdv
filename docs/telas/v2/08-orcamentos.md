# Orçamentos — descrição de conteúdo e fluxo (mobile, online)

> Versão de **conteúdo/design** (não técnica). Foco no modo **online**.

## Em uma frase

É onde se montam orçamentos para o cliente (produtos + serviços), gera-se um
documento bonito para enviar e, quando aprovado, converte-se o orçamento em venda.

## Como a pessoa chega aqui

- Toca em **Orçamentos** na navegação.

## Esboço da tela (celular)

```
┌───────────────────────────┐
│ Orçamentos    [+ Novo]     │
├───────────────────────────┤
│ • ORC-0007 · Minha Loja    │
│   R$ 320 · aberto   [ver]  │
│ • ORC-0006 · João          │
│   R$ 90 · convertido       │
└───────────────────────────┘
        (ver / preview) ↓
┌───────────────────────────┐
│ Preview ORC-0007           │
│  [ documento do orçamento ]│
│  ...                       │
│ [Fechar][Imagem][PDF][Impr]│
├───────────────────────────┤
│ [ Converter em venda ]     │
└───────────────────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Cabeçalho** — título e **Novo orçamento**.
2. **Lista** — código, cliente, valor e situação (aberto/convertido).
3. **Montagem do orçamento** — itens (produtos/serviços), valores e **nome do
   cliente** (dá para cadastrar cliente no fluxo).
4. **Preview (documento)** — visualização do orçamento pronto para enviar, com
   **exportar imagem**, **exportar PDF** e **imprimir**. Tem versão adaptada ao
   celular.
5. **Conversão em venda (modal)** — transforma o orçamento aprovado em venda.

## O que a pessoa pode fazer

- **Criar** um orçamento com produtos/serviços.
- **Associar/cadastrar cliente**.
- **Ver o preview** e **exportar/enviar** (imagem, PDF, impressão).
- **Converter em venda** quando aprovado.

## Fluxos

**Fazer e enviar orçamento**
1. **Novo** → adiciona itens → informa o **cliente** → salva.
2. **Preview** → **PDF/Imagem** → envia ao cliente.

**Aprovar → vender**
1. Abre o orçamento → **Converter em venda** → confirma → vira uma venda no
   histórico.

## Estados visuais

- **Carregando**: esqueleto da lista/preview.
- **Sem orçamentos**: mensagem com atalho para **Novo**.
- **Exportando/Imprimindo/Convertendo**: botões em carregamento.

## Diretrizes para o redesenho mobile

- **Preview legível no celular** (o documento é o produto que o cliente vê).
- **Exportar/compartilhar** com destaque — é o objetivo do orçamento.
- **Converter em venda** como ação clara de "ganhou o negócio".
- Reaproveitar o **fluxo de cliente** de Vendas (mesma experiência de cadastro
  rápido).
