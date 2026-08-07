# Especificações de tela (mobile-first)

Descrição tela por tela do app (`apps/pdv`) — **conteúdo, ações e fluxo** — como
base para o refactor visual componente por componente, seguindo o
[DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) (marca fixa **SysControl**, sem white-label).

As specs ficam em [`v2/`](./v2/). Um arquivo por tela.

## Formato de cada doc (v2)

Tom de **conteúdo/design** (não técnico), focado no **online**:

1. **Em uma frase** — o que a tela resolve.
2. **Como a pessoa chega aqui** — contexto/fluxo de entrada.
3. **Esboço da tela (celular)** — wireframe textual.
4. **Blocos de conteúdo** — o que aparece e por quê.
5. **O que a pessoa pode fazer** — ações.
6. **Fluxos** — passo a passo dos caminhos principais.
7. **Estados visuais** — carregando, vazio, erro.
8. **Diretrizes para o redesenho mobile** — navegação, gestos, hierarquia, tokens/componentes do DS.

## Telas

| # | Tela | Rota | Doc | Status |
|---|------|------|-----|--------|
| 01 | Login / Criar loja | (pré-auth) | [v2/01-login.md](./v2/01-login.md) | ✅ |
| 02 | Onboarding | (pós-setup) | v2/02-onboarding.md | ⏳ |
| 03 | Dashboard (Painel) | `/` | v2/03-dashboard.md | ⏳ |
| 04 | Vendas | `/vendas` | v2/04-vendas.md | ⏳ |
| 05 | Produtos (Estoque) | `/produtos` | v2/05-produtos.md | ⏳ |
| 06 | Serviços | `/servicos` | v2/06-servicos.md | ⏳ |
| 07 | Recibos (Histórico) | `/recibos` | v2/07-recibos.md | ⏳ |
| 08 | Orçamentos | `/orcamentos` | v2/08-orcamentos.md | ⏳ |
| 09 | Clientes & Fiado | `/clientes` | v2/09-clientes.md | ⏳ |
| 10 | Comissões | `/comissoes` | v2/10-comissoes.md | ⏳ |
| 11 | Relatórios | `/relatorios` | v2/11-relatorios.md | ⏳ |
| 12 | Despesas | `/despesas` | v2/12-despesas.md | ⏳ |
| 13 | Configurações | `/config` | v2/13-config.md | ⏳ |

Legenda: ✅ pronto · ⏳ pendente.
