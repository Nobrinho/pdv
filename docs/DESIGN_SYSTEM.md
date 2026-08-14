# Design System — SysControl (guia de uso)

Guia de referência do **SysControl Design System** (handoff exportado do Claude
Design) para orientar o refactor mobile-first do `apps/pdv`. O bundle original
está em `ds/SysControl Design System-handoff.zip` — extraia para consultar os
arquivos-fonte (tokens em CSS, componentes React com `.jsx`/`.d.ts`/`.prompt.md`,
guias visuais em HTML e UI kits mobile/web).

> Os arquivos do DS são **protótipos de referência**. A ideia é recriar o visual
> com os componentes que já temos, adotando os tokens — não copiar a estrutura
> interna dos protótipos.

## 1. Fundamentos (tokens)

Todos os tokens são variáveis CSS. Categorias:

**Cores base**
- Neutra: **zinc** (`--zinc-50…950`).
- Primária: **petroleum teal** (`--teal-500 = #0f7391`).
- Semânticas: success **green**, warning **yellow**, danger **red** (`#dc2626`), info **blue**.
- Data-viz: `--chart-1…5` (teal, azul, verde, amarelo, cinza).

**Aliases semânticos** (vocabulário shadcn/HeroUI) — é isso que a UI deve usar, não a paleta crua:
- Superfícies: `--background`, `--card`, `--popover`, `--muted`, `--content1…4` (pilha de superfícies).
- Texto: `--foreground`, `--muted-foreground`, `--card-foreground`.
- Traços/foco: `--border`, `--input`, `--ring`, `--divider`, `--overlay`.
- Marca/estados: `--primary` (+ `-hover/-active/-foreground/-soft/-soft-foreground`), `--secondary`, `--success/-soft`, `--warning/-soft`, `--danger/-soft`, `--info/-soft`.
- Chrome do app: `--sidebar*`, `--topbar*`, `--app-canvas`.
- Dinheiro: `--money-positive` / `--money-negative`.
- **Dark mode**: há um bloco `.dark{…}` completo (casa com o `ThemeContext` atual).

**Tipografia** (`fonts.css` + `typography.css`)
- Fontes (Google Fonts): **Sora** (display/títulos), **Barlow** (texto/UI), **Roboto Mono** (números, SKU, dinheiro).
- Escala: `--text-tiny…display` com line-heights pareados; pesos 400/500/600/700; trackings por papel.
- **Números tabulares**: `--numeric-feature: "tnum" 1,"lnum" 1` — usar em valores/quantidades para alinhar colunas.

**Espaçamento** (`spacing.css`) — grade de 4px (`--space-1…24`), alturas de controle `--control-sm/md/lg` (32/36/40px), dimensões de layout (`--topbar-h:56px`, `--sidebar-w:248px`).

**Raio** (`radius.css`) — base `--radius:0.625rem`, escala `--radius-xs…2xl` + `--radius-full`.

**Elevação** (`elevation.css`) — `--shadow-xs/sm/small/medium/large`; foco em anel de 3px (`--ring-width`).

**Movimento** (`motion.css`) — durações 120/150/250ms, `--ease-out` (cubic-bezier), `--press-scale:0.97`, `--hover-opacity:0.8`, `--disabled-opacity:0.5`.

## 2. Componentes (inventário)

React (`components/<grupo>/*.jsx`), cada um com tipos e um `.prompt.md` explicando uso:

- **core**: Button, IconButton, Icon, Card, Chip, Badge, Avatar, Divider, Spinner.
- **data**: **DataTable, EmptyState, Skeleton, StatCard**, Pagination, Progress.
- **feedback**: Modal, Toast, Alert, Tooltip.
- **forms**: Input, Field, Checkbox, RadioGroup (e afins).
- **navigation**: Sidebar, Topbar, Tabs, Breadcrumbs.

Já temos equivalentes no app (DataTable, EmptyState, Skeleton, StatCard, Modal, BottomNav) — a migração é **alinhar visual e tokens**, não recomeçar.

**UI kits de referência**: `ui_kits/mobile_app/` (telas mobile, ex.: carrinho, sangria, estados vazios) e `ui_kits/web_app/` (Vendas, PDV, Dashboard, Estoque, Caixa). São o alvo visual.

## 3. Encaixe no projeto (regras)

**Marca fixa — SysControl (sem white-label):** decisão de produto — **não há mais
tema por loja**. A marca é sempre **SysControl**, com as cores e a identidade
**exatamente como o design system define** (primária teal petróleo, etc.). Não se
injeta mais `corPrimaria`/logo por loja em runtime.
- O nome da loja aparece **apenas no login** (ex.: chip/legenda "Loja: {Nome}"),
  como contexto de qual loja está sendo acessada — nada de cores/logo dinâmicos.
- No código: o `TenantContext` deixa de injetar cores e logo; passa a expor só os
  dados da loja que ainda fazem sentido (nome/contato para recibos, se necessário).
  As referências a `tenant.corPrimaria`, `logoBase64` e afins saem da UI.

**Mapeamento de tokens** (atual → DS), para migrar sem quebrar. As cores passam a
vir **fixas do DS** (não mais do tenant):

| Hoje (Tailwind vars) | DS (semântico) |
|---|---|
| `--color-surface-50/100` | `--app-canvas` / `--card` / `--content1` |
| `--color-surface-200/300` | `--content2/3`, `--muted`, `--border` |
| `--color-primary-600` | `--primary` |
| `--color-primary-50` | `--primary-soft` |
| texto padrão | `--foreground` / `--muted-foreground` |
| vermelho/verde de status | `--danger`/`--success` (+ `-soft`) |

**Fontes:** adicionar Sora/Barlow/Roboto Mono; aplicar mono + `tnum/lnum` em
dinheiro, quantidades e SKU (ganho grande de legibilidade em tabelas/recibos).

**Dark mode:** o DS já traz `.dark{…}` — plugar no `ThemeContext` existente.

**Não renderizar os protótipos** nem tirar screenshots (orientação do próprio
handoff): tudo que precisamos está no CSS/JSX; ler direto.

## 4. Estratégia de adoção (incremental)

1. **Tokens primeiro**: trazer os CSS de `tokens/` para o app com uma camada de
   compatibilidade (mapear os nomes antigos para os do DS). Cores **fixas do DS**
   (remover a injeção dinâmica de cor por loja do `TenantContext`).
2. **Fontes**: importar as três famílias e aplicar por papel.
3. **Componentes por tela**: alinhar os componentes base (Button, Card, Field,
   DataTable, Modal…) e ir refazendo **tela por tela**, começando pelo mobile
   (Login → Vendas → …), usando os UI kits como alvo.
4. **Specs `docs/telas/v2`**: descrever cada tela já com os componentes/tokens do DS.

## 5. Onde ficam os arquivos

- Bundle: `ds/SysControl Design System-handoff.zip`.
- Ao extrair: `syscontrol-design-system/project/{tokens,components,guidelines,ui_kits}`.
- `SKILL.md` no bundle permite invocar o DS como skill de design.
