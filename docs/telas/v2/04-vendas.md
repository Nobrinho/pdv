# Vendas — descrição de conteúdo e fluxo (mobile, online)

> Versão de **conteúdo/design** (não técnica). Foco no modo **online**.

## Em uma frase

É o coração do sistema: onde a pessoa monta o carrinho (produtos e mão de obra),
aplica desconto/acréscimo, recebe o pagamento e fecha a venda emitindo o recibo.

## Como a pessoa chega aqui

- Toca em **Vendas** na navegação inferior (uso mais frequente do dia).

## Esboço da tela (celular)

```
┌───────────────────────────┐
│  🔎 Buscar produto  [ 📷 ] │  ← busca + leitor de código
├───────────────────────────┤
│  Resultado da busca        │
│  • Óleo 1L      R$ 25  [+] │
│  • Filtro       R$ 40  [+] │
├───────────────────────────┤
│  Carrinho (3 itens)        │
│  ┌───────────────────────┐ │
│  │ Óleo 1L   x2   R$ 50  │ │  ← itens com quantidade
│  │ Filtro    x1   R$ 40  │ │
│  └───────────────────────┘ │
│  Cliente: (opcional)  [+]  │
├───────────────────────────┤
│  Total          R$ 90,00   │
│  [      Cobrar        ]    │  ← barra fixa embaixo
└───────────────────────────┘
        (toca em Cobrar) ↓
┌───────────────────────────┐
│  Pagamento (bottom sheet)  │
│  Mão de obra + técnico     │
│  Acréscimo / Desconto      │
│  Total a Pagar  R$ 90,00   │
│  [Dinheiro ▾]  [ 0,00 ][+] │  ← adiciona formas de pagto
│  Pago R$70 · Falta R$20    │
│  ☐ CPF no recibo           │
│  [   Concluir venda   ]    │
└───────────────────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Busca de produto** — campo com busca ao parar de digitar (com "buscando…"
   e "nada encontrado"), e um **leitor de código de barras** pela câmera.
2. **Resultados** — lista curta com nome, preço e botão **+** para jogar no
   carrinho.
3. **Carrinho** — itens com quantidade editável e subtotal; remover item.
4. **Cliente (opcional)** — associar um cliente à venda; dá para **cadastrar um
   cliente rápido** ali mesmo.
5. **Barra "Cobrar"** — fixa no rodapé no celular, mostra o total e leva ao
   pagamento.
6. **Pagamento (bottom sheet)** — no celular o pagamento vira uma folha que sobe:
   - **Mão de obra** (valor + técnico responsável),
   - **Acréscimo** e **Desconto** (em R$ ou %),
   - **Total a Pagar**,
   - **formas de pagamento** (Dinheiro/Pix/Crédito/Débito/Fiado; crédito com
     parcelas), somando vários pagamentos até quitar,
   - **Pago / Falta / Troco**,
   - opção **CPF no recibo**,
   - botão **Concluir venda**.

## O que a pessoa pode fazer

- **Buscar e adicionar** produtos (por texto ou código de barras).
- **Ajustar quantidades** e remover itens.
- **Associar/cadastrar cliente**.
- **Adicionar mão de obra** e escolher o técnico.
- **Dar desconto/acréscimo**.
- **Receber em várias formas** (pagamento dividido).
- **Concluir a venda** e emitir/compartilhar o **recibo**.

## Fluxos

**Venda rápida (só produtos)**
1. Busca o produto → **+** → repete.
2. Toca em **Cobrar** → escolhe Dinheiro → digita valor → **+**.
3. **Concluir venda** → aparece o recibo (imprimir/compartilhar/fechar).

**Venda com serviço**
1. Monta o carrinho.
2. Em Pagamento, informa **mão de obra** e o **técnico** (gera comissão).
3. Recebe e conclui.

**Pagamento dividido**
1. Em Pagamento, adiciona "Pix R$50" e depois "Dinheiro R$40".
2. Quando "Falta" zera, **Concluir venda** libera.

## Estados visuais

- **Buscando**: indicador no campo de busca.
- **Nada encontrado**: mensagem amigável no lugar da lista.
- **Carrinho vazio**: instrução curta ("Busque um produto para começar").
- **Pagamento incompleto**: "Concluir venda" fica bloqueado enquanto faltar valor.
- **Concluindo**: botão em "Salvando…".

## Diretrizes para o redesenho mobile

- **Fluxo em dois momentos**: montar carrinho → **Cobrar** abre o pagamento como
  bottom sheet. Não amontoar tudo numa tela só.
- **Barra de ação fixa** com o total sempre visível (cor de sucesso do DS).
- **Busca no topo, polegar embaixo**: adicionar itens e cobrar devem ficar ao
  alcance do polegar.
- **Menos toques para o caso comum** (produto + dinheiro): o caminho feliz tem
  que ser curtíssimo.
- **Leitor de código** em destaque para quem usa scanner/câmera.
