# Recibos (Histórico de Vendas) — Desktop (web e Electron)

> Layout de tela grande. Conteúdo/fluxo geral: ver [../v2/07-recibos.md](../v2/07-recibos.md).

## Em uma frase

O histórico de vendas em tela larga: filtros sempre visíveis, uma **tabela** de
vendas e um modal de recibo que mostra o **cupom térmico** para reimprimir ou
compartilhar.

## Como a pessoa chega aqui

- **Recibos** na sidebar; ou logo após concluir uma venda (o recibo abre na hora).

## Esboço da tela (desktop)

```
┌──────────────────────────────────────────────┐
│ Histórico  🔎 buscar  Período│Pagto│Vendedor  │  ← filtros na horizontal
├──────────────────────────────────────────────┤
│ Nº    │ Data/Hora     │ Valor │ Pagto  │ ⋯    │
│ 1043  │ 12/08 14:20   │ 90,00 │ Dinheiro│ ver │
│ 1042  │ 12/08 11:05   │240,00 │ Pix     │ ver │
└──────────────────────────────────────────────┘
   (ver) → modal centralizado com o cupom + ações
```

## Blocos de conteúdo (o que aparece)

1. **Filtros na horizontal** — busca + período, forma de pagamento e vendedor
   (na largura do desktop ficam abertos, sem colapsar).
2. **Tabela de vendas** — número, data/hora, valor, forma de pagamento, ações.
3. **Recibo (modal centralizado)** — mostra o **cupom fiscal/térmico**; rodapé com
   **Fechar**, **Compartilhar (WhatsApp)** e **Reimprimir**.
4. **Cancelamento (modal)** — confirmação para anular a venda.

## O que a pessoa pode fazer

- **Buscar/filtrar**, **ver recibo**, **compartilhar/reimprimir**, **cancelar**.

## Fluxos

**Reenviar** → acha a venda → **ver** → **Compartilhar**.
**Cancelar** → abre a venda → **Cancelar** → confirma.

## Estados visuais

- **Carregando**: esqueleto de tabela.
- **Sem resultados**: mensagem neutra.
- **Compartilhando/Imprimindo**: botão em carregamento.
- **Recibo colorido na tela/WhatsApp**; **P&B só na impressão**.

## Diretrizes para o desktop

- **Filtros abertos** (há espaço) — busca rápida por número/cliente/valor.
- **Tabela** com colunas alinhadas; recibo no **modal central**.

## Modo Electron (app instalado)

- **Reimpressão térmica silenciosa**: "Reimprimir" manda direto para a
  **impressora térmica**, sem diálogo.
- No **modo local**, o histórico é o **do próprio computador** e abre **offline**.
- Na web, "Reimprimir" usa o **diálogo de impressão do navegador** e o histórico é
  o da loja online.
