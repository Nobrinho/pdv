# Plano de refatoração Mobile/Tablet — SysControl PDV (app web)

Objetivo: transformar a versão web (`apps/pdv`) de "desktop encolhido" em uma
experiência **mobile-first** de verdade — usável com uma mão, no balcão, no celular
e no tablet — sem quebrar a versão desktop (que continua ótima no PC).

O app já é PWA instalável e roda online em qualquer navegador. Falta a **UI/UX mobile**.

---

## 1. Diagnóstico (por que está ruim no celular)

- **Desktop-first**: layouts pensados para telas largas; no mobile viram scroll longo e apertado.
- **Telas multi-painel**: `Vendas` empilha busca + carrinho + pagamento numa coluna só —
  sem fluxo claro nem foco na ação.
- **Tabelas** (`DataTable`) em quase toda tela (Produtos, Clientes, Relatórios, Recibos,
  Comissões...) — tabela não cabe em tela estreita (estoura ou espreme).
- **Alvos de toque pequenos** (botões/ícones densos, fontes pequenas, inputs baixos).
- **Navegação por menu lateral** (drawer) — no mobile o padrão é **barra inferior**.
- **Modais** desenhados como diálogos de desktop, não como **bottom sheets**.
- Sem táticas nativas: sticky action bar, FAB, teclado numérico, safe-area, skeletons.

---

## 2. Princípios (as táticas de UX mobile que vamos aplicar)

1. **Mobile-first, desktop preservado**: escrever base para telas pequenas e usar
   prefixos `md:`/`lg:` para o desktop. Nada de quebrar o PC.
2. **Thumb-friendly**: alvos de toque ≥ 44px, ações principais na **zona do polegar**
   (parte de baixo), espaçamento generoso.
3. **Uma tarefa por tela / fluxo por passos** em telas complexas (Vendas).
4. **Tabela → Cards/List** no mobile (a informação vira cartões roláveis).
5. **Bottom navigation** para as 4-5 ações mais usadas; o resto num "Mais".
6. **Bottom sheets** no lugar de modais (deslizam de baixo, com "grabber", fecham por swipe).
7. **Sticky action bar**: a ação principal (ex.: "Cobrar", "Salvar") fixa no rodapé,
   sempre visível, com o valor/total.
8. **FAB** (botão flutuante) para a ação de criar (novo produto/cliente/despesa).
9. **Inputs certos**: `inputMode="numeric/decimal"`, teclado adequado, campos altos,
   foco automático, máscara de moeda amigável.
10. **Feedback e estado**: skeletons no carregamento, toasts no rodapé (acima da bottom
    nav), estados vazios com CTA, loading nos botões (já feito).
11. **Safe areas** (`env(safe-area-inset-*)`) para notch/barra do iOS/Android; PWA em
    tela cheia.
12. **Gestos** (fase 2): pull-to-refresh nas listas, swipe para ações rápidas.
13. **Performance**: listas virtualizadas onde houver muitos itens; imagens/otimizações.

---

## 3. Fundação (componentes e shell reutilizáveis) — Fase 1

Construir uma base que as telas reaproveitam (isola o esforço e padroniza):

- **Shell responsivo**
  - Mobile: **BottomNav** (Vendas, Produtos, Clientes, Relatórios, Mais) fixa embaixo,
    com safe-area. A sidebar atual vira o menu "Mais" (drawer) ou some no mobile.
  - Tablet: sidebar compacta (ícones) ou a mesma bottom nav, dependendo da orientação.
  - Desktop: sidebar atual (intacta).
  - Header mobile fino com contexto da tela + ações (busca/filtro).
- **`Sheet`** (bottom sheet): componente base para formulários e detalhes no mobile;
  no desktop pode renderizar como o `Modal` atual (mesmo componente, comportamento
  responsivo). Suporta "cheio", "médio", grabber e fechar por swipe/backdrop.
- **`ResponsiveList` / `DataCards`**: recebe colunas e dados; renderiza **tabela no
  desktop** e **cards no mobile** (substitui o uso cru de `DataTable` nas telas).
- **`StickyActionBar`**: barra fixa no rodapé (acima da bottom nav) para a ação primária.
- **`Fab`**: botão flutuante de criar.
- **`SegmentedControl`**: para abas/toggles (Config, filtros) no lugar de abas densas.
- **Base de estilo mobile**: escala de tipografia/espaçamento, altura mínima de inputs
  e botões (44px), utilitário de safe-area, tokens de toque. Ajustes no `tailwind.config`
  e `index.css`.

Entregável da fase 1: navegar o app no celular já parece um app (bottom nav + sheets +
listas em cards), mesmo antes de refinar cada tela.

---

## 4. Refatoração tela a tela (ordem de prioridade)

### 4.1 Vendas (PDV) — PRIORIDADE MÁXIMA (é o coração)
Hoje: busca + carrinho + painel de pagamento empilhados. No mobile precisa virar um
**fluxo por passos** com a ação sempre à mão:
- **Passo 1 — Montar carrinho**: busca de produto em destaque (input grande, foco
  automático, **leitura de código de barras pela câmera** via `BarcodeDetector`/getUserMedia),
  resultados como lista tocável grande. Carrinho como lista de cards (qtd com +/- grandes,
  swipe para remover). Seleção de vendedor/cliente em sheets.
- **StickyActionBar** fixa: total + botão **"Cobrar"**.
- **Passo 2 — Pagamento** (bottom sheet cheio): métodos como botões grandes, valor com
  teclado numérico, troco, múltiplos pagamentos, mão de obra/técnico, desconto/acréscimo
  em seções colapsáveis. Botão **"Concluir venda"** sticky.
- **Passo 3 — Recibo**: sheet com o cupom + **Compartilhar** (já pronto) e Imprimir.
- Tablet: pode manter dois painéis (carrinho | pagamento) lado a lado.

### 4.2 Produtos
- Lista em **cards** (nome, preço, estoque, tipo) com busca no topo e filtro em sheet.
- **FAB "＋"** para novo produto; formulário em **sheet cheio** (o `ProductFormModal`
  vira responsivo). Entrada de estoque e importação como sheets.

### 4.3 Clientes
- Mesmo padrão: cards + busca + FAB + sheet de cadastro. Detalhe do cliente (dívidas/
  fiado) em sheet.

### 4.4 Dashboard
- Cards de KPI empilhados (2 colunas no mobile), gráficos responsivos (largura fluida,
  altura fixa), alertas de estoque como lista.

### 4.5 Relatórios e Comissões
- **Filtros de período** em sheet (com presets: hoje, semana, mês).
- Métricas como cards; tabelas de vendas/comissões viram **cards roláveis**; gráficos
  responsivos. Exportar PDF continua.

### 4.6 Recibos
- Lista de vendas em cards (data, total, status) + filtro em sheet; abrir recibo em
  **sheet cheio** com Compartilhar/Imprimir/Cancelar.

### 4.7 Despesas
- Já é baseada em cards/resumo; ajustar o formulário para sheet no mobile e revisar toque.

### 4.8 Config
- Seções empilhadas; abas viram **SegmentedControl** ou acordeão. Cada painel
  (identidade, comissões, ferramentas, usuários/cargos, **links de acesso**) revisado
  para toque. Campos altos, upload de logo amigável.

### 4.9 Login / Onboarding
- Login já está enxuto; revisar tamanhos de toque e teclado. Onboarding (wizard) já é
  por passos — adaptar largura/altura e botões grandes fixos.

---

## 5. Cross-cutting (aplicar em todas)

- **Modais → Sheets** no mobile (via componente responsivo único).
- **Tabelas → ResponsiveList** (cards no mobile).
- **Inputs**: `inputMode` correto, altura ≥ 44px, labels claras, máscara de moeda,
  foco automático nos campos-chave.
- **Toasts** (`AlertSystem`) posicionados no rodapé, acima da bottom nav; confirmar que
  não cobrem a StickyActionBar.
- **Safe-area** em headers, bottom nav e sheets.
- **Skeletons** nas listas/telas ao carregar (em vez de "Carregando...").
- **Estados vazios** com ilustração/ícone + CTA.
- **Acessibilidade**: contraste, `aria-label` nos ícones, foco visível, `prefers-reduced-motion`.

---

## 6. Abordagem técnica

- **Tailwind mobile-first**: base = mobile; `md:`/`lg:` restauram o desktop. Isso mantém
  o PC intacto enquanto muda o mobile.
- **Poucos componentes novos** (Sheet, BottomNav, ResponsiveList, StickyActionBar, Fab,
  SegmentedControl) reaproveitados em tudo — o grosso do trabalho é montar essa base bem.
- **Sem novas dependências pesadas**: `framer-motion` (já presente) cobre animações de
  sheet/drawer; `BarcodeDetector` nativo + fallback para câmera. Virtualização só se
  necessário (listas grandes).
- **Detecção de viewport** com `matchMedia` (já usamos no shell) para escolher
  sheet vs modal, bottom nav vs sidebar.
- **Nada quebra o Electron**: as mesmas telas rodam no desktop empacotado; o layout
  desktop é preservado pelos breakpoints.

---

## 7. Fases e entregáveis

- **Fase 1 — Fundação (base + shell)**: BottomNav, Sheet, ResponsiveList, StickyActionBar,
  Fab, tokens de toque/safe-area. Resultado: navegação e listas já "sentem" mobile.
- **Fase 2 — Vendas mobile** (a tela mais crítica) + Produtos e Clientes.
- **Fase 3 — Dashboard, Relatórios, Comissões, Recibos, Despesas**.
- **Fase 4 — Config, Onboarding, polimento**: skeletons, estados vazios, gestos
  (pull-to-refresh, swipe), leitura de código por câmera, acessibilidade.
- **Fase 5 — QA em dispositivos reais** (Android/iOS, tablet), ajustes finos, performance.

---

## 8. Como validar

- Emulação (DevTools device toolbar) durante o dev; breakpoints 360/390/768/1024/1440.
- Testes em **dispositivos reais** (um Android, um iPhone, um tablet) nos fluxos-chave:
  fazer uma venda ponta a ponta, cadastrar produto/cliente, lançar despesa, ver
  relatório, compartilhar recibo, instalar como PWA.
- Checklist de toque (alvos ≥ 44px), teclado correto por campo, safe-area, sem overflow
  horizontal em nenhuma tela.

---

## 9. Recomendação de início

Começar pela **Fase 1 (fundação)** e já aplicar em **Vendas** (Fase 2), porque é a tela
mais usada e a que mais dói hoje. Com a fundação pronta, as demais telas saem rápido
reaproveitando os mesmos componentes.
