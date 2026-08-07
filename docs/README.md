# Documentação — SysControl (PDV multi-loja)

Índice único da documentação **atual** do projeto. Os READMEs de cada pacote
(`apps/*/README.md`, `packages/shared/README.md`) permanecem junto do código.

## Design e refactor visual

- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — guia do design system (tokens, componentes, regras de encaixe). **Marca fixa SysControl, sem white-label.**
- [telas/](./telas/) — especificações de tela (conteúdo/fluxo, mobile-first) para o refactor visual componente por componente.

## Roadmap

- [PLANO_API_MULTI_LOJA.md](./PLANO_API_MULTI_LOJA.md) — arquitetura do SaaS multi-loja, o que já foi entregue e o roadmap de infra/produto.
- [MELHORIAS_FUTURAS.md](./MELHORIAS_FUTURAS.md) — melhorias de regra de negócio (comissões/MDR, mão de obra, custo médio ponderado, unidades decimais, fiscal, trava de margem).

## Deploy e operação

- [DEPLOY.md](./DEPLOY.md) — deploy da variante paga (Railway).
- [DEPLOY-FREE.md](./DEPLOY-FREE.md) — pilha gratuita (Neon + Koyeb/Render + Cloudflare + GitHub Actions).
- [DEPLOY-WEB.md](./DEPLOY-WEB.md) — build e publicação do app web (PWA).

## Guias de desenvolvimento

- [COMO_RODAR_API_LOCAL.md](./COMO_RODAR_API_LOCAL.md) — subir a API e o banco localmente.
- [TESTE_GUIADO_BLOCO_VALIDACOES.md](./TESTE_GUIADO_BLOCO_VALIDACOES.md) — roteiro de testes manuais de validações.
