# Recibos (Histórico de Vendas) — descrição de conteúdo e fluxo (mobile, online)

> Versão de **conteúdo/design** (não técnica). Foco no modo **online**.

## Em uma frase

É o histórico das vendas: consultar o que foi vendido, reimprimir/compartilhar o
recibo e, se preciso, cancelar uma venda.

## Como a pessoa chega aqui

- Toca em **Recibos** (ou "Histórico") na navegação.
- Logo após concluir uma venda, o recibo aparece direto (com opção de fechar).

## Esboço da tela (celular)

```
┌───────────────────────────┐
│ Histórico de Vendas        │
│ 🔎 Buscar   [ Filtros ▾ ]  │  ← filtros colapsáveis
├───────────────────────────┤
│ • #1043 · 12/08 14:20      │
│   R$ 90 · Dinheiro   [ver] │
│ • #1042 · 12/08 11:05      │
│   R$ 240 · Pix       [ver] │
└───────────────────────────┘
        (toca em ver) ↓
┌───────────────────────────┐
│ Recibo #1043               │
│  [ recibo digital / cupom ]│
│  ...                       │
│ [Fechar][WhatsApp][Reimpr.]│  ← rodapé de ações
└───────────────────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Cabeçalho + busca** — procurar por número/cliente/valor.
2. **Filtros colapsáveis** — período, forma de pagamento, vendedor (escondidos por
   padrão no celular para não ocupar espaço).
3. **Lista de vendas** — número, data/hora, valor e forma de pagamento; toque
   abre o recibo.
4. **Recibo (modal)** — no celular um **recibo digital amigável**; nos bastidores
   o **cupom térmico** para imprimir/compartilhar. Rodapé com **Fechar**,
   **Compartilhar (WhatsApp)** e **Reimprimir**.
5. **Cancelamento (modal)** — motivo/confirmação para anular uma venda.

## O que a pessoa pode fazer

- **Buscar e filtrar** vendas.
- **Ver o recibo** de uma venda.
- **Compartilhar por WhatsApp** ou **reimprimir**.
- **Cancelar** uma venda (com confirmação).

## Fluxos

**Reenviar recibo**
1. Acha a venda → **ver** → **Compartilhar (WhatsApp)** → segue para o contato.

**Cancelar venda**
1. Abre a venda → **Cancelar** → confirma → a venda fica marcada como cancelada.

## Estados visuais

- **Carregando**: esqueleto da lista.
- **Sem resultados**: mensagem neutra.
- **Compartilhando/Imprimindo**: botão em "Gerando…/Imprimindo…".
- **Recibo colorido na tela/WhatsApp**, **preto e branco só na impressão**.

## Diretrizes para o redesenho mobile

- **Filtros colapsados** por padrão; abrir só quando precisa.
- **Recibo digital** legível no celular (o cupom térmico fica para a impressão).
- **Ações de recibo** claras no rodapé, sempre com **Fechar** à mão.
- **Compartilhar** em destaque — é o uso mais comum no dia a dia.
