🏍️ SysControl - Sistema de Gestão & PDV (v1.1.0)

Sistema Desktop profissional desenvolvido para gestão de comércio e oficinas. Focado em agilidade no balcão, controlo financeiro rigoroso, segurança de dados e atualizações automáticas.

🚀 Funcionalidades Principais

🛒 Ponto de Venda (PDV)

Agilidade: Busca rápida por nome ou leitor de código de barras (foco automático).

Flexibilidade:

Venda de Produtos + Mão de Obra no mesmo carrinho.

Descontos em Porcentagem (%) ou Valor Fixo (R$).

Seleção de Vendedor e Técnico Responsável.

Impressão: Emissão de cupom não fiscal direto para impressora térmica (sem janelas de diálogo).

🔧 Gestão de Serviços

Módulo exclusivo para ordens de serviço e manutenções avulsas.

Histórico detalhado e relatórios de produtividade por técnico.

📦 Estoque e Cadastros

Produtos: Cadastro completo com histórico de alterações de preço (Auditoria).

Equipe: Gestão de Vendedores e Trocadores com definição de comissões.

Segurança de Dados: Produtos vendidos são protegidos contra exclusão acidental (Soft Delete).

Reposição Rápida: Adição de saldo ao estoque diretamente na listagem.

💰 Financeiro e Relatórios

Dashboard: Visão em tempo real de faturamento, lucro e alertas de estoque.

Valorização de Estoque: KPIs de Custo Total investido e Lucro Projetado.

Relatórios Avançados:

Faturamento vs Custos vs Lucro.

Comissões detalhadas.

Resumo de Mão de Obra por funcionário.

Exportação para PDF.

⚙️ Configurações e Segurança

Controle de Acesso:

Admin: Acesso total.

Caixa: Acesso restrito (Vendas/Serviços). Bloqueio de configurações e estoque (liberação mediante senha do supervisor).

Backup & Restore: Ferramenta integrada para salvar e restaurar o banco de dados local.

Auto-Update: O sistema verifica, baixa e instala atualizações automaticamente via GitHub.

🛠️ Tecnologias (Stack)

Core: Electron (Framework Desktop)

Frontend: React + Vite

Estilização: Tailwind CSS

Banco de Dados: SQLite3 (via better-sqlite3 e knex.js)

Distribuição: Electron Builder + GitHub Releases

⚙️ Instalação e Execução (Desenvolvimento)

Pré-requisitos (Ambiente Windows)

Para rodar ou compilar este projeto, seu ambiente deve ter as seguintes ferramentas instaladas (devido ao banco de dados nativo):

Node.js (Versão LTS v20): Baixar Node.js

Visual Studio Build Tools (Obrigatório):

Necessário para compilar o better-sqlite3.

Baixar Build Tools

Durante a instalação, marque a opção: "Desenvolvimento para desktop com C++".

Comandos Úteis

# 1. Instalar dependências
npm install

# 2. Rodar em Modo de Desenvolvimento (Hot-reload)
npm run electron:dev

# 3. Preparar módulos nativos (se houver erro de versão do Node)
npm run postinstall

# 4. Compilar para Produção (.exe)
npm run dist


Nota: Na primeira execução (npm run electron:dev), o sistema criará automaticamente o arquivo do banco de dados syscontrol.sqlite3 na raiz do projeto e pedirá para criar o usuário Administrador.

🗄️ Banco de Dados e Migrations

O banco de dados é local (syscontrol.sqlite3).

Dev: Na raiz do projeto.

Prod: Em %APPDATA%/SysControl/.

Se precisar resetar o banco durante o desenvolvimento (apagar todos os dados):

Pare o terminal.

Delete o arquivo syscontrol.sqlite3.

Rode npm run electron:dev novamente (ele recria do zero).

🔄 Atualizações Automáticas (OTA)

Este projeto está configurado para atualizar via GitHub Releases.
Para lançar uma nova versão para os clientes:

Atualize a versão:
Abra o package.json e incremente a versão (ex: de 1.1.0 para 1.1.1).

Gere a Build:

npm run dist


Publique no GitHub:

Vá em Releases > Draft a new release.

Crie uma tag igual à versão (ex: v1.1.1).

Importante: Arraste os arquivos gerados na pasta dist_electron para a área de Assets (Binários) da release:

SysControl-Setup-1.1.1.exe

latest.yml

Clique em Publish.

O aplicativo do cliente detectará a atualização ao abrir e oferecerá o download.

❓ Solução de Problemas Comuns

Erro: node-gyp ou Could not find any Visual Studio installation

Isso ocorre ao tentar instalar o better-sqlite3 sem ter os compiladores C++ no Windows.
Solução: Instale o Visual Studio Build Tools (carga de trabalho C++) e reinicie o computador.

Erro: Cannot find module 'better-sqlite3' após instalar o .exe

Isso ocorre se a dependência nativa não foi recompilada para a versão do Electron empacotada.
Solução: Rode npm run postinstall antes de rodar npm run dist.

Tela Branca ao abrir o .exe

Geralmente causado por erros de caminho ou banco de dados.
Solução: Verifique se o electron/main.js está configurado corretamente para detectar o ambiente de produção (!app.isPackaged) e apontar para o caminho correto das migrações em process.resourcesPath.

📝 Licença

Desenvolvido por Emerson Nobre.
Todos os direitos reservados.