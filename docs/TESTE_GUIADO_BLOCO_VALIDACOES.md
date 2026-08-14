# Teste Guiado - Bloco de Validacoes e Loading

Data de referencia: 2026-04-30
Objetivo: validar os ajustes de filtros, validacoes, bloqueio de duplo clique e feedback visual.
Tempo estimado: 15 a 25 minutos

## 1) Vendas - CPF no recibo de cliente ja cadastrado

### Cenário
Cliente selecionado sem CPF/CNPJ valido (ex.: documento ".").

### Passos
1. Abrir tela de Vendas.
2. Selecionar um cliente antigo sem documento valido.
3. Marcar "Deseja CPF no Recibo?".
4. Confirmar que campo CPF/CNPJ aparece para preenchimento.
5. Tentar finalizar com CPF invalido.
6. Informar CPF valido e finalizar.

### Esperado
- Com CPF invalido: bloqueia com alerta.
- Com CPF valido: conclui venda, imprime documento no recibo e atualiza cadastro do cliente.

## 2) Servicos - valor negativo

### Passos
1. Abrir tela de Servicos.
2. Tentar digitar "-" no valor.
3. Tentar salvar com valor 0, negativo, ou vazio.

### Esperado
- Frontend nao aceita "-" no campo.
- Salvar com valor <= 0 bloqueia com alerta.
- Mesmo se tentar burlar no frontend, backend recusa com erro de valor invalido.

## 3) Recibos, Servicos, Relatorios, Comissoes - filtro de data invertido

### Passos
1. Em cada tela, definir data inicial maior que data final.
2. Tentar executar acao principal (consultar, exportar PDF, baixar comissao).

### Esperado
- Exibe aviso de filtro invalido.
- Acoes criticas ficam bloqueadas quando aplicavel.
- Nao trava interface.

## 4) Produtos - salvar, estoque e excluir

### Passos
1. Abrir modal de produto e clicar salvar repetidas vezes.
2. Tentar cadastrar produto com custo/preco/estoque negativo.
3. Abrir entrada de estoque e clicar confirmar varias vezes.
4. Excluir produto e observar botao na linha.

### Esperado
- Botao mostra estado de processamento e bloqueia duplo clique.
- Valores negativos sao bloqueados.
- Excluir mostra spinner na linha e evita clique duplicado.

## 5) Clientes - salvar, excluir e pagar divida

### Passos
1. Salvar cliente clicando varias vezes no botao.
2. Excluir cliente e tentar clicar duas vezes.
3. Em dividas, clicar pagar repetidas vezes.

### Esperado
- Salvar/excluir/pagar possuem trava de processamento.
- Botao de pagar mostra spinner enquanto processa.
- Nao duplica operacao.

## 6) Pessoas - salvar e excluir

### Passos
1. Tentar salvar colaborador sem nome ou sem cargo.
2. Salvar colaborador valido clicando varias vezes.
3. Excluir colaborador e observar botao da linha.

### Esperado
- Nome e cargo obrigatorios.
- Botao de salvar mostra "SALVANDO..." e bloqueia duplo clique.
- Excluir mostra spinner na linha.

## 7) Config - operacoes administrativas

### Passos
1. Adicionar cargo com clique repetido.
2. Excluir cargo com clique repetido.
3. Salvar impressora repetidamente.
4. Rodar backup e restaurar com clique repetido.
5. Criar usuario com clique repetido.
6. Excluir usuario com clique repetido.

### Esperado
- Todas as acoes acima possuem estado de loading e bloqueio de duplo clique.
- Sem congelamento da interface.
- Sem execucao duplicada.

## 8) Regressao rapida de build

### Comando
`npm run build`

### Esperado
- Build concluido com sucesso.

## Observacoes
- Ignorar alteracoes em `syscontrol.sqlite3` no dev, conforme combinado.
- Se aparecer texto quebrado em acentos, registrar tela e rota para correcao pontual de encoding.
