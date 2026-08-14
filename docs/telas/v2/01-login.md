# Login — descrição de conteúdo e fluxo (mobile, online)

> Versão de **conteúdo/design** (não técnica). Descreve o que aparece na tela,
> o que o usuário faz e como o fluxo acontece — base para redesenhar a tela no
> celular. Foco no modo **online** (uso pela web/PWA).

## Em uma frase

É a porta de entrada: a pessoa escolhe/confirma a loja e digita usuário e senha
para abrir o terminal de vendas. A marca é sempre **SysControl** (cores e
identidade do design system); o **nome da loja** aparece só aqui, como contexto
de qual loja está sendo acessada.

## Como a pessoa chega aqui

- Abriu o app no navegador e ainda não está logada.
- Ou a sessão expirou e o app trouxe de volta para cá.
- Ou clicou num **link de convite** que já traz a loja embutida (ela não precisa
  saber o número da loja).

## Esboço da tela (celular)

```
┌───────────────────────────┐
│     [ marca SysControl ]   │  ← identidade fixa (cores do DS: teal petróleo)
│        SysControl          │
│     TERMINAL DE VENDAS     │
├───────────────────────────┤
│   [ Entrar | Criar loja ]  │  ← duas abas
│                            │
│  🏪  Loja #4 · Minha Loja  │  ← contexto da loja  ·  trocar
│                            │
│  Usuário                   │
│  [ 👤  ....................]│
│  Senha                     │
│  [ 🔒  ............... 👁 ]│
│                            │
│  [      ENTRAR      →     ]│  ← botão principal
│                            │
│      ⚙ Avançado: servidor  │  ← escondido por padrão
├───────────────────────────┤
│   v1.9 • © Minha Loja      │
└───────────────────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Marca SysControl** — faixa no topo com a marca **SysControl** e o subtítulo
   "Terminal de Vendas", nas cores do design system (teal petróleo). É fixa —
   igual para todas as lojas.
2. **Escolha da loja** — normalmente já vem resolvida. Aqui, e só aqui, aparece o
   **nome da loja** como contexto:
   - Se a pessoa já entrou antes neste aparelho, aparece um **chip "Loja #4 · Minha Loja"**
     com um "trocar" (sem precisar digitar nada).
   - Se veio por **convite**, aparece um aviso "Entrando na loja: {Nome}".
   - Só se não houver nada disso é que aparece o campo para digitar o **número da loja**.
3. **Credenciais** — Usuário e Senha.
4. **Ação principal** — botão **Entrar**.
5. **Criar loja** — aba alternativa para quem ainda não tem loja (abre um
   formulário curto: nome da loja, contato e dados do administrador).
6. **Rodapé** — versão do app e crédito da loja.
7. **Avançado (escondido)** — um link discreto revela o campo de endereço do
   servidor. Fica oculto para não assustar o usuário comum.

## O que a pessoa pode fazer

- **Entrar** na loja com usuário e senha.
- **Trocar de loja** (limpa a loja lembrada e mostra o campo de número).
- **Criar uma loja nova** (pela aba) e já entrar nela.
- **Entrar por convite** (o link preenche a loja sozinho).
- (Avançado) **apontar para outro servidor**.

## Fluxos

**Entrar (caminho comum)**
1. Abre o app → a loja já aparece como chip.
2. Digita usuário e senha.
3. Toca em **Entrar** → botão vira “Entrando…”.
4. Deu certo → cai no terminal de vendas.

**Entrar por convite**
1. Abre o link recebido → a loja já vem escolhida (com o nome à mostra).
2. Digita usuário e senha → **Entrar**.

**Criar loja**
1. Toca na aba **Criar loja**.
2. Preenche nome da loja e os dados do administrador.
3. Toca em **Criar loja** → o sistema cria e já entra; mostra o **número da loja**
   para anotar (é o que ela usará para logar em outros aparelhos).

## Estados visuais

- **Abrindo**: um “Iniciando terminal…” com a marca girando.
- **Enviando**: botão com carregamento (“Entrando…”, “Criando…”).
- **Erro**: aviso claro (senha errada, loja bloqueada, limite de aparelhos atingido).

## Diretrizes para o redesenho mobile

- **Menos digitação**: loja como chip, não como campo. Só pedir o número quando
  realmente não dá para lembrar.
- **Foco no essencial**: usuário, senha e um botão grande — o resto (servidor,
  criar loja) fica secundário/escondido.
- **Caber sem rolar**: cabeçalho compacto para o botão Entrar aparecer de cara no
  celular; se faltar espaço, rola suavemente.
- **Conforto de toque**: campos e botão altos (fáceis no polegar), com **mostrar
  senha** (olho).
- **Identidade**: a marca **SysControl** (fixa, cores do DS) fica no topo — com
  destaque, mas sem empurrar o formulário para baixo demais. Sem logo/cores por loja.
- **Sinais de confiança**: mensagens de erro amigáveis e um aviso de “sem
  internet” antes de tentar entrar.
