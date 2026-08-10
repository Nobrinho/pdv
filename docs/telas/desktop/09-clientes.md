# Clientes & Fiado — Desktop (web e Electron)

> Layout de tela grande. Conteúdo/fluxo geral: ver [../v2/09-clientes.md](../v2/09-clientes.md).

## Em uma frase

A agenda de clientes com fiado em tela larga: uma **tabela** com clientes, contato
e **saldo devedor**, busca ampla e modais para cadastrar e **registrar
pagamentos** da conta.

## Como a pessoa chega aqui

- **Clientes** na sidebar; ou vindo de uma venda ao associar/cadastrar cliente.

## Esboço da tela (desktop)

```
┌──────────────────────────────────────────────┐
│ Clientes  🔎 nome/telefone/documento  [+ Novo] │
├──────────────────────────────────────────────┤
│ Nome         │ Contato      │ Fiado   │ ⋯     │
│ João da Silva│ (11) 9xxxx   │ R$ 120 ⚠│ pagar │
│ Maria Souza  │ (11) 8xxxx   │ em dia  │ conta │
└──────────────────────────────────────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Busca ampla** — nome, telefone ou documento.
2. **Tabela** — nome, contato e **saldo de fiado** (devendo em alerta / em dia),
   ações (ver conta, pagar, editar, excluir).
3. **Cadastro/edição (modal)** — nome, documento, telefone/WhatsApp, endereço.
4. **Conta do cliente (modal)** — o que está em aberto e **registrar pagamento**.

## O que a pessoa pode fazer

- **Cadastrar/editar/excluir**, **buscar**, **ver conta** e **registrar
  pagamento** do fiado.

## Fluxos

**Cadastrar** → **Novo** → dados → **Salvar**.
**Receber fiado** → cliente que deve → **Pagar** → valor → confirma (saldo cai).

## Estados visuais

- **Carregando**: esqueleto de tabela.
- **Sem clientes/busca vazia**: atalho para **Novo**.
- **Em dia × devendo**: cor de alerta no saldo devedor.
- **Salvando/excluindo**: indicador na linha/botão.

## Diretrizes para o desktop

- **Saldo de fiado** como coluna destacada — é o que mais se consulta.
- **Busca por telefone/documento** rápida (uso de balcão).
- **Pagar** como ação primária de quem deve.

## Modo Electron (app instalado)

- No **modo local**, os clientes e o fiado ficam no **banco do computador** e
  funcionam **offline**.
- Como o fiado é um saldo por cliente, ao operar em **vários terminais** o ideal é
  a **loja online** para todos verem o mesmo saldo; no local, cada máquina tem a
  sua base até migrar.
