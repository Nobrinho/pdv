# Vendas — Desktop (web e Electron)

> Layout de tela grande. Conteúdo/fluxo geral: ver [../v2/04-vendas.md](../v2/04-vendas.md).

## Em uma frase

O terminal de vendas em tela larga: **carrinho à esquerda e pagamento à direita**,
lado a lado — monta o pedido e recebe na mesma tela, sem trocar de passo.

## Como a pessoa chega aqui

- **Venda / Registrar Venda** na sidebar (a tela mais usada do dia).

## Esboço da tela (desktop)

```
┌──────────────────────────────┬───────────────┐
│ 🔎 Buscar produto     [ 📷 ]  │  Ajustes      │
│ Resultados...                 │  Mão de obra  │
│ • Óleo 1L   R$25  [+]         │  Acrésc/Desc  │
├──────────────────────────────┤  Total R$90   │
│ Carrinho                      │───────────────│
│ Óleo 1L   x2   R$50   [–][+]  │  Pagamento    │
│ Filtro    x1   R$40           │  [Dinheiro ▾] │
│ Cliente: (opcional)      [+]  │  [ 0,00 ] [+] │
│                               │  Pago/Falta   │
│                               │  ☐ CPF recibo │
│                               │ [Concluir ✓]  │
└──────────────────────────────┴───────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Busca de produto** (topo, coluna esquerda) — busca ao parar de digitar
   (com "buscando…"/"nada encontrado") e **leitor de código de barras**.
2. **Resultados + Carrinho** — resultados e itens do pedido na coluna principal;
   quantidade editável, remover item, cliente (com cadastro rápido).
3. **Painel de pagamento (coluna direita, sempre visível)** — no desktop ele fica
   **fixo ao lado**, não em bottom sheet: **Ajustes** (mão de obra + técnico,
   acréscimo/desconto, Total a Pagar) e **Pagamento** (formas, parcelas, Pago/
   Falta/Troco, CPF no recibo, **Concluir venda**).

## O que a pessoa pode fazer

- **Buscar/adicionar** produtos (texto ou código), **ajustar quantidades**.
- **Associar/cadastrar cliente**.
- **Mão de obra + técnico**, **desconto/acréscimo**.
- **Receber em várias formas** e **Concluir a venda** (emite o recibo).

## Fluxos

**Venda comum** → busca → **+** → à direita escolhe Dinheiro → valor → **Concluir**.
**Pagamento dividido** → adiciona Pix + Dinheiro até "Falta" zerar → **Concluir**.

## Estados visuais

- **Buscando / nada encontrado** no campo de busca.
- **Carrinho vazio**: instrução curta.
- **Concluir** bloqueado enquanto faltar valor; botão em "Salvando…".

## Diretrizes para o desktop

- **Duas colunas fixas**: carrinho (esquerda) + pagamento (direita) — o caixa vê
  tudo sem trocar de passo.
- **Teclado/scanner**: foco no campo de busca; código de barras entra direto.
- **Total e Concluir** sempre à vista na coluna direita.

## Modo Electron (app instalado)

- **Leitor de código de barras**: a leitura é **pela câmera** (usa o
  `BarcodeDetector` do sistema). Um **leitor USB físico** também funciona, mas
  como "teclado" — ele digita o código no campo de busca com o foco ativo (não há
  integração serial dedicada no código).
- **Impressão térmica silenciosa**: ao concluir, o recibo sai direto na
  **impressora térmica** configurada, sem o diálogo de impressão do navegador.
- **Offline**: no modo local a venda é gravada no **banco do próprio computador**
  e funciona sem internet; sincroniza/consolida quando online.
- Na web, a impressão usa o **diálogo do navegador**; o leitor por **câmera**
  funciona igual (depende de permissão da câmera no navegador).
