# Configurações — Desktop (web e Electron)

> Layout de tela grande. Conteúdo/fluxo geral: ver [../v2/13-config.md](../v2/13-config.md).

## Em uma frase

O painel de ajustes da loja em tela larga: seções em cartões (identidade,
comissões, usuários, cargos e ferramentas do sistema) organizadas para o dono
configurar tudo num lugar só.

## Como a pessoa chega aqui

- **Configurações** na sidebar.

## Esboço da tela (desktop)

```
┌──────────────────────────────────────────────┐
│ Configurações                                  │
│ ┌───────────────────┐ ┌───────────────────┐   │
│ │ 🎨 Identidade     │ │ % Comissões       │   │  ← seções em cartões
│ │ nome + logo recibo│ │ taxas             │   │
│ │ [Salvar]          │ │ [Atualizar taxas] │   │
│ └───────────────────┘ └───────────────────┘   │
│ ┌───────────────────┐ ┌───────────────────┐   │
│ │ 👥 Usuários/Cargos│ │ 🛠 Ferramentas    │   │
│ │ criar/gerenciar   │ │ link, migrar, imp.│   │
│ └───────────────────┘ └───────────────────┘   │
└──────────────────────────────────────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Identidade da loja** — **nome** e **logo do recibo** (colorida na tela/
   WhatsApp, **P&B só na impressão**). **Salvar identidade**.
2. **Comissões** — **taxas** da equipe; **Atualizar taxas**.
3. **Usuários e Cargos** — criar/gerenciar usuários (com status) e cargos.
4. **Ferramentas do sistema** — **link de acesso** por convite, **migrar para a
   loja online** e ajuste de **impressora**.

> Não aparecem mais: **créditos ao desenvolvedor** (removida) e **Log de Eventos**
> (oculto).

## O que a pessoa pode fazer

- **Editar identidade**, **ajustar comissões**, **gerenciar usuários/cargos**,
  **gerar link**, **migrar** e configurar **impressora**.

## Fluxos

**Trocar logo** → Identidade → sobe logo → **Salvar**.
**Convidar** → Ferramentas → **gerar link de acesso** → compartilha.

## Estados visuais

- **Salvando**: botões em carregamento.
- **Sucesso**: confirmação ao salvar.
- **Ações sensíveis** (migrar): confirmação antes.

## Diretrizes para o desktop

- **Seções em cartões** dispostos em **duas colunas** (a largura permite ver mais
  de uma seção ao mesmo tempo).
- **Marca fixa SysControl**: edita-se a **identidade da loja**, não as cores.
- **Ferramentas de sistema** por último; sem expor logs/telas técnicas.

## Modo Electron (app instalado)

- **Impressora térmica**: a configuração de **impressora** e a **impressão de
  teste** ficam aqui — é o que habilita a impressão silenciosa de recibos.
- **Modo local × online**: o Electron mostra a opção de **migrar para a loja
  online** (envia a base local para o servidor) e de alternar o modo de dados.
- **Link de acesso/convite** é mais usado no cenário online (levar outra pessoa/
  aparelho para a mesma loja).
- Na web, não há configuração de impressora local (usa o diálogo do navegador)
  nem escolha de modo — é **sempre online**.
