# Especificações de tela — Desktop (web e Electron)

Descrição tela por tela do app (`apps/pdv`) no **desktop**: navegador (web) e
**app instalado (Electron)**. Mesma estrutura das specs mobile ([`../v2/`](../v2)),
mas descrevendo o layout de tela grande e, em cada doc, uma seção **Modo
Electron** com o que só existe no app instalado.

Marca fixa **SysControl** (cores do design system), sem white-label.

## Shell do desktop (comum a todas as telas)

No desktop o app usa uma **barra lateral fixa** (sidebar) à esquerda, no lugar da
navegação inferior do celular. A área de conteúdo ocupa o restante, larga, e
aproveita o espaço para **painéis lado a lado** e **tabelas** (em vez de cartões
empilhados).

```
┌───────────┬───────────────────────────────────────┐
│ SysControl│  Cabeçalho da tela        [ ações ]    │
│           ├───────────────────────────────────────┤
│ ▸ Painel  │                                        │
│ ▸ Venda   │      Conteúdo largo da tela            │
│ ▸ Produtos│      (2–3 colunas, tabelas, painéis)   │
│ ▸ Serviços│                                        │
│ ▸ Recibos │                                        │
│ ▸ Orçam.  │                                        │
│ ▸ Clientes│                                        │
│ ▸ Comiss. │                                        │
│ ▸ Relat.  │                                        │
│ ▸ Despesas│                                        │
│ ▸ Equipe  │                                        │
│ ▸ Auditoria│                                       │
│ ▸ Config  │                                        │
│  usuário ⏻│                                        │
└───────────┴───────────────────────────────────────┘
```

- **Sidebar** com o menu completo (Painel, Venda, Produtos, Serviços, Recibos,
  Orçamentos, Clientes, Comissões, Relatórios, Despesas, Equipe, Auditoria de
  Preços, Configurações) e o usuário logado + sair no rodapé.
- **Modais centralizados** (no celular são bottom sheets).
- **Tabelas** com colunas e ordenação (no celular viram cartões).
- **Mouse/teclado**: hover, atalhos, foco por Tab, Enter para confirmar.

## Web × Electron (resumo)

- **Web (navegador/PWA)**: sempre no **modo online** — fala com o servidor
  (`pdv-back`). Sem acesso a hardware local além do que o navegador permite
  (câmera para leitura de código, diálogo de impressão do navegador).
- **Electron (app instalado)**: por padrão roda em **modo local** (banco no
  próprio computador, funciona **offline**), com **impressão térmica
  silenciosa**, **leitor de código de barras** e opção de **migrar para a loja
  online**. Pode alternar entre local e online.

Cada doc traz uma seção **Modo Electron** com os detalhes específicos daquela
tela.

## Telas

| # | Tela | Rota | Doc |
|---|------|------|-----|
| 01 | Login / Criar loja | (pré-auth) | [01-login.md](./01-login.md) |
| 02 | Onboarding | (pós-setup) | [02-onboarding.md](./02-onboarding.md) |
| 03 | Dashboard (Painel) | `/` | [03-dashboard.md](./03-dashboard.md) |
| 04 | Vendas | `/vendas` | [04-vendas.md](./04-vendas.md) |
| 05 | Produtos (Estoque) | `/produtos` | [05-produtos.md](./05-produtos.md) |
| 06 | Serviços | `/servicos` | [06-servicos.md](./06-servicos.md) |
| 07 | Recibos (Histórico) | `/recibos` | [07-recibos.md](./07-recibos.md) |
| 08 | Orçamentos | `/orcamentos` | [08-orcamentos.md](./08-orcamentos.md) |
| 09 | Clientes & Fiado | `/clientes` | [09-clientes.md](./09-clientes.md) |
| 10 | Comissões | `/comissoes` | [10-comissoes.md](./10-comissoes.md) |
| 11 | Relatórios | `/relatorios` | [11-relatorios.md](./11-relatorios.md) |
| 12 | Despesas | `/despesas` | [12-despesas.md](./12-despesas.md) |
| 13 | Configurações | `/config` | [13-config.md](./13-config.md) |
