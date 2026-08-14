# Onboarding (Primeira configuração) — descrição de conteúdo e fluxo (mobile, online)

> Versão de **conteúdo/design** (não técnica). Foco no modo **online**.

## Em uma frase

É o passo a passo que aparece uma única vez ao criar a loja: em **3 etapas** a
pessoa preenche a identidade da loja, define as comissões padrão e cria o
usuário administrador — deixando o sistema pronto para vender.

## Como a pessoa chega aqui

- Logo depois de **criar a loja** (na tela de login), antes de usar o app.

## Esboço da tela (celular)

```
┌───────────────────────────┐
│  ← voltar        Passo 1/3 │
│                  ▓▓▓░░░     │  ← barra de progresso
├───────────────────────────┤
│ 🏪 Identidade da Loja      │
│ "Aparece nos recibos"      │
│  Nome da Loja *            │
│  Endereço · Telefone       │
│  ...                       │
│           [ Prosseguir → ] │
└───────────────────────────┘
   1) Identidade
   2) Comissões Padrão
   3) Administrador do Sistema → [ Finalizar setup ]
```

## Blocos de conteúdo (o que aparece)

1. **Cabeçalho de progresso** — "Passo X de 3", barra de progresso e **voltar
   etapa**.
2. **Etapa 1 — Identidade da Loja**: nome (obrigatório), endereço, telefone e
   demais dados que **saem nos recibos**. Se faltar nome/endereço/telefone, um
   aviso avisa que os recibos podem sair incompletos (dá para prosseguir mesmo
   assim).
3. **Etapa 2 — Comissões Padrão**: percentuais usados nos cálculos de venda
   (valores entre 0 e 100).
4. **Etapa 3 — Administrador do Sistema**: cria o usuário com **acesso total**
   (nome, usuário e senha).
5. **Ação de avançar** — **Prosseguir** nas etapas 1–2 e **Finalizar setup** na
   etapa 3.

## O que a pessoa pode fazer

- **Preencher** os dados de cada etapa e **avançar/voltar**.
- **Prosseguir mesmo com dados faltando** (com aviso).
- **Finalizar** e cair no app pronto para uso.

## Fluxos

**Configurar a loja nova**
1. Etapa 1: nome/endereço/telefone → **Prosseguir**.
2. Etapa 2: percentuais de comissão → **Prosseguir**.
3. Etapa 3: cria o administrador → **Finalizar setup** → entra no app.

**Corrigir depois**
- Tudo isso pode ser reajustado mais tarde em **Configurações** (identidade,
  comissões, usuários).

## Estados visuais

- **Validação**: bloqueia comissão fora de 0–100 com aviso.
- **Aviso de recibo incompleto**: confirmação antes de pular dados da etapa 1.
- **Finalizando**: botão em carregamento ("Finalizar setup").

## Diretrizes para o redesenho mobile

- **Uma etapa por vez**, barra de progresso sempre visível — sensação de
  "quase lá".
- **Só o essencial** em cada passo; nada de formulário gigante.
- **Voltar** fácil para corrigir sem perder o que já preencheu.
- **Marca SysControl fixa**; aqui se define a **identidade da loja** (dados do
  recibo), não cores.
- Deixar claro que **dá para ajustar depois** — reduz a ansiedade de "preencher
  tudo certo agora".
