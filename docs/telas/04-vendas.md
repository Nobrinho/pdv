# 04 — Vendas (PDV)

## Objetivo

Tela principal do balcão: montar uma venda (produtos + serviços/mão de obra),
aplicar acréscimo/desconto, receber em um ou mais pagamentos e emitir o recibo.

## Acesso

- Rota `/vendas`. Item de menu "Venda" (também na bottom nav mobile).
- Permissão de caixa (todos os cargos acessam).
- É a tela inicial natural do operador.

## Dados (React Query)

- `['products']` → `api.products.list()` (compartilhado com Produtos/Orçamentos).
- `['people']` → `api.people.list()` (deriva vendedores e técnicos).
- `['clients']` → `api.clients.list()`.
- Ao concluir venda: invalida `['products']` (estoque) e `['clients']` (fiado/CPF).
- Cadastro rápido de cliente: atualiza o cache `['clients']` direto.
- Cache persiste no `localStorage` (abre com dados após F5); skeleton só na 1ª carga.

## Elementos e campos

**Barra de entrada (SaleEntryBar):**
- **Vendedor** (select, obrigatório para concluir).
- **Cliente**: busca com autocomplete + botão **+** (cadastro rápido: nome, documento, telefone, endereço).
- **Produto**: campo "Código ou Nome" com busca (debounce 350ms, feedback "Buscando…"/"Nenhum produto encontrado") + botão **câmera** (leitor de código de barras).

**Carrinho (SaleCartPanel):**
- Desktop: tabela (Item, Qtd, Unit., Total, remover).
- Mobile: cards com stepper − / + e total por item.
- Rodapé: Subtotal dos itens.

**Painel de pagamento (SalePaymentPanel):**
- **Mão de obra (R$)** + **Técnico** (trocador).
- **Acréscimo** (R$/%) e **Desconto** (R$/%).
- **Total a Pagar**.
- Lista de pagamentos adicionados (método + valor, remover).
- Adicionar pagamento: método (Dinheiro/Pix/Crédito/Débito/Fiado), parcelas (crédito), valor, botão **+**.
- **Pago / Falta / Troco**.
- **CPF no recibo** (checkbox) → busca cliente por documento ou cadastra nome+CPF.
- Botão **CONCLUIR VENDA**.

**Recibo (pós-venda, SaleReceiptModal):** preview (mobile: recibo digital; desktop: cupom térmico), **Compartilhar recibo** (imagem via tela nativa), **Imprimir**, **Fechar**.

## Ações e regras de negócio

- Adicionar produto: por clique no resultado, Enter (match exato/único) ou leitura de código de barras (código exato → adiciona; senão joga na busca).
- Steppers ajustam quantidade (mín. 1).
- **Concluir venda** valida: carrinho não vazio; vendedor selecionado; **falta = 0** (pagamento completo); **desconto ≤ subtotal** das peças; se houver mão de obra, exige técnico; **Fiado exige cliente**.
- Comissão calculada por item (regra híbrida novo/usado) — via `packages/shared/domain/commission`.
- CPF no recibo: se cliente selecionado já tem doc válido, usa; senão pede/cadastra.
- Após concluir: mostra recibo, limpa carrinho/pagamentos/campos, invalida caches.

## Estados

- **1ª carga**: `VendasSkeleton` (espelha busca + carrinho + pagamento).
- **Reentrada**: instantâneo (cache), revalida em background.
- **Carrinho vazio**: "Carrinho Vazio".
- **Busca**: "Buscando produtos…" / "Nenhum produto encontrado".
- **Erro de carga**: banner vermelho.
- **Concluindo**: botão "SALVANDO…".

## Layout mobile proposto (fluxo por passos — já implementado)

- **Passo 1 — montar venda**: busca + carrinho ocupam a tela. Barra fixa **"Cobrar R$ X"** no rodapé (acima da bottom nav), desabilitada com carrinho vazio.
- **Passo 2 — pagamento**: tocar em Cobrar abre o **painel de pagamento em bottom sheet** (ajustes, pagamentos, CPF, concluir). Ao concluir, o sheet fecha e o recibo aparece.
- Desktop: busca+carrinho à esquerda, pagamento à direita (lado a lado).
- Leitor de código de barras em tela cheia (câmera) com degradação graciosa onde não suportado.

## Pendências / melhorias

- Densidade do painel de pagamento no mobile (botões de método maiores/estilo teclado).
- Skeleton específico dentro do sheet de pagamento.
- Descontos/acréscimos com atalhos rápidos (ex.: 5%/10%).
- Devolução parcial de itens (hoje só cancelamento total, via Recibos) — ver MELHORIAS_FUTURAS.
