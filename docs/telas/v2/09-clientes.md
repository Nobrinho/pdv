# Clientes & Fiado — descrição de conteúdo e fluxo (mobile, online)

> Versão de **conteúdo/design** (não técnica). Foco no modo **online**.

## Em uma frase

É a agenda de clientes com o controle de **fiado**: cadastrar clientes, ver quem
deve, e registrar pagamentos da conta em aberto.

## Como a pessoa chega aqui

- Toca em **Clientes** na navegação.
- Ou vem de uma venda ao associar/cadastrar um cliente.

## Esboço da tela (celular)

```
┌───────────────────────────┐
│ Clientes      [+ Novo]     │
│ 🔎 nome, telefone, doc     │
├───────────────────────────┤
│ ┌───────────────────────┐  │
│ │ João da Silva         │  │  ← cartão do cliente
│ │ (11) 9xxxx · CPF ...  │  │
│ │ Deve: R$ 120   [pagar]│  │  ← saldo de fiado
│ └───────────────────────┘  │
│ ┌───────────────────────┐  │
│ │ Maria Souza · em dia  │  │
│ └───────────────────────┘  │
└───────────────────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Cabeçalho + busca** — procurar por **nome, telefone ou documento**.
2. **Novo cliente** — cadastro (nome, documento, telefone/WhatsApp, endereço).
3. **Lista em cartões** — nome, contato e **saldo de fiado** (quanto deve ou
   "em dia").
4. **Conta do cliente** — ver o que está em aberto e **registrar pagamento**
   (abater o fiado).
5. **Editar/excluir** cliente.

## O que a pessoa pode fazer

- **Cadastrar/editar/excluir** clientes.
- **Buscar** por nome/telefone/documento.
- **Ver a conta** e **registrar pagamento** do fiado.

## Fluxos

**Cadastrar cliente**
1. **Novo** → preenche dados → **Salvar**.

**Receber um fiado**
1. Acha o cliente que **deve** → **Pagar** → informa o valor recebido → confirma
   → o saldo devedor diminui.

## Estados visuais

- **Carregando**: esqueleto de cartões.
- **Sem clientes / busca vazia**: mensagem com atalho para **Novo**.
- **Em dia × devendo**: cor neutra para quem está em dia, cor de alerta para saldo
  devedor.
- **Excluindo/salvando**: indicador no item/botão.

## Diretrizes para o redesenho mobile

- **Saldo de fiado em destaque** no cartão — é a informação mais usada.
- **Pagar** como ação primária de quem deve.
- **Busca poderosa** (telefone/doc), porque no balcão se procura rápido.
- Reuso do **cadastro rápido** que também aparece em Vendas/Orçamentos.
