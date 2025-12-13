const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

// MUDANÇA IMPORTANTE: Usar app.isPackaged é mais seguro para detectar produção
const isDev = !app.isPackaged; 

let dbPath;

if (isDev) {
  dbPath = path.join(__dirname, "../syscontrol.sqlite3");
} else {
  const userDataPath = app.getPath("userData");
  dbPath = path.join(userDataPath, "syscontrol.sqlite3");
}

const knex = require("knex")({
  client: "better-sqlite3",
  connection: {
    filename: dbPath,
  },
  useNullAsDefault: true,
  migrations: {
    // Em produção, as migrations ficam dentro dos resources
    directory: isDev
      ? path.join(__dirname, "../database/migrations")
      : path.join(process.resourcesPath, "database", "migrations"),
  },
});

let mainWindow;

async function initDb() {
  try {
    await knex.migrate.latest();
    console.log("✅ Banco de dados inicializado em:", dbPath);
  } catch (err) {
    console.error("❌ Erro ao inicializar banco de dados:", err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    // mainWindow.webContents.openDevTools(); // Apenas em desenvolvimento
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    // NENHUMA linha de openDevTools aqui garante que não abre em produção
  }
}

app.whenReady().then(() => {
  initDb();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ---------------------------------------------------------
// 🔌 API DO BANCO DE DADOS (IPC Handlers)
// ---------------------------------------------------------

// --- PRODUTOS ---
ipcMain.handle("get-products", async () => {
  try {
    return await knex("produtos").select("*");
  } catch (error) {
    console.error("Erro get-products:", error);
    return [];
  }
});

ipcMain.handle("save-product", async (event, product) => {
  try {
    if (product.id) {
      await knex("produtos").where("id", product.id).update(product);
      return { id: product.id, success: true };
    } else {
      const [id] = await knex("produtos").insert(product);
      return { id, success: true };
    }
  } catch (error) {
    console.error("Erro save-product:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("delete-product", async (event, id) => {
  try {
    await knex("produtos").where("id", id).del();
    return { success: true };
  } catch (error) {
    console.error("Erro delete-product:", error);
    return { success: false, error: error.message };
  }
});

// --- PESSOAS ---
ipcMain.handle("get-people", async () => {
  try {
    return await knex("pessoas")
      .leftJoin("cargos", "pessoas.cargo_id", "cargos.id")
      .select("pessoas.*", "cargos.nome as cargo_nome");
  } catch (error) {
    console.error("Erro get-people:", error);
    return [];
  }
});

ipcMain.handle("save-person", async (event, person) => {
  try {
    if (person.id) {
      await knex("pessoas").where("id", person.id).update(person);
      return { id: person.id, success: true };
    } else {
      const [id] = await knex("pessoas").insert(person);
      return { id, success: true };
    }
  } catch (error) {
    console.error("Erro save-person:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("delete-person", async (event, id) => {
  try {
    await knex("pessoas").where("id", id).del();
    return { success: true };
  } catch (error) {
    console.error("Erro delete-person:", error);
    return { success: false, error: error.message };
  }
});

// --- CARGOS ---
ipcMain.handle("get-roles", async () => {
  try {
    return await knex("cargos").select("*");
  } catch (error) {
    console.error("Erro get-roles:", error);
    return [];
  }
});

// --- VENDAS (Transação) ---
ipcMain.handle("create-sale", async (event, saleData) => {
  const trx = await knex.transaction();
  try {
    // 1. Inserir a Venda
    const [saleId] = await trx("vendas").insert({
      vendedor_id: saleData.vendedor_id,
      trocador_id: saleData.trocador_id || null,
      subtotal: saleData.subtotal,
      mao_de_obra: saleData.mao_de_obra,
      desconto_valor: saleData.desconto_valor || 0,
      desconto_tipo: saleData.desconto_tipo || "percent",
      total_final: saleData.total_final,
      forma_pagamento: saleData.forma_pagamento,
      data_venda: Date.now(),
    });

    // 2. Inserir os Itens
    const items = saleData.itens.map((item) => ({
      venda_id: saleId,
      produto_id: item.id,
      quantidade: item.qty,
      preco_unitario: item.preco_venda,
      custo_unitario: item.custo,
    }));

    if (items.length > 0) {
      await trx("venda_itens").insert(items);

      // 3. Atualizar Estoque
      for (const item of items) {
        await trx("produtos")
          .where("id", item.produto_id)
          .decrement("estoque_atual", item.quantidade);
      }
    }

    await trx.commit();
    return { success: true, id: saleId };
  } catch (error) {
    await trx.rollback();
    console.error("Erro create-sale:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-sales", async () => {
  try {
    return await knex("vendas")
      .leftJoin("pessoas as vendedor", "vendas.vendedor_id", "vendedor.id")
      .leftJoin("pessoas as trocador", "vendas.trocador_id", "trocador.id")
      .select(
        "vendas.*",
        "vendedor.nome as vendedor_nome",
        "trocador.nome as trocador_nome"
      )
      .orderBy("data_venda", "desc");
  } catch (error) {
    console.error("Erro get-sales:", error);
    return [];
  }
});

ipcMain.handle("get-sale-items", async (event, vendaId) => {
  try {
    return await knex("venda_itens")
      .join("produtos", "venda_itens.produto_id", "produtos.id")
      .where("venda_id", vendaId)
      .select("venda_itens.*", "produtos.descricao", "produtos.codigo");
  } catch (error) {
    console.error("Erro get-sale-items:", error);
    return [];
  }
});

// --- SERVIÇOS AVULSOS ---
ipcMain.handle("get-services", async () => {
  try {
    return await knex("servicos_avulsos")
      .leftJoin("pessoas", "servicos_avulsos.trocador_id", "pessoas.id")
      .select("servicos_avulsos.*", "pessoas.nome as trocador_nome")
      .orderBy("data_servico", "desc");
  } catch (error) {
    console.error("Erro get-services:", error);
    return [];
  }
});

ipcMain.handle("create-service", async (event, serviceData) => {
  try {
    const [id] = await knex("servicos_avulsos").insert({
      trocador_id: serviceData.trocador_id,
      descricao: serviceData.descricao,
      valor: serviceData.valor,
      forma_pagamento: serviceData.forma_pagamento,
      data_servico: Date.now(),
    });
    return { success: true, id };
  } catch (error) {
    console.error("Erro create-service:", error);
    return { success: false, error: error.message };
  }
});

// --- DASHBOARD & ESTATÍSTICAS ---

ipcMain.handle("get-dashboard-stats", async () => {
  try {
    // Definir início e fim do dia atual
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    ).getTime();

    // 1. Buscar Vendas de Hoje
    const vendas = await knex("vendas").whereBetween("data_venda", [
      startOfDay,
      endOfDay,
    ]);

    // 2. Buscar Serviços Avulsos de Hoje
    const servicos = await knex("servicos_avulsos").whereBetween(
      "data_servico",
      [startOfDay, endOfDay]
    );

    // 3. Dados Auxiliares (Pessoas e Config) para cálculo de comissão
    const pessoas = await knex("pessoas").select("*");
    const config = await knex("configuracoes")
      .where("chave", "comissao_padrao")
      .first();
    const comissaoPadrao = config ? parseFloat(config.valor) : 0.3;

    // 4. Buscar Itens das Vendas (para calcular Custo dos produtos vendidos)
    const vendaIds = vendas.map((v) => v.id);
    const itens =
      vendaIds.length > 0
        ? await knex("venda_itens").whereIn("venda_id", vendaIds)
        : [];

    // --- CÁLCULOS ---
    let totalFaturamento = 0;
    let totalCustoProdutos = 0;
    let totalMaoDeObra = 0;
    let totalComissoes = 0;

    // Processar Vendas
    vendas.forEach((venda) => {
      totalFaturamento += venda.total_final; // Total pago pelo cliente

      // Somar Mão de Obra da venda
      if (venda.mao_de_obra) totalMaoDeObra += venda.mao_de_obra;

      // Calcular Custo dos Produtos desta venda
      const itensVenda = itens.filter((i) => i.venda_id === venda.id);
      const custoVenda = itensVenda.reduce(
        (acc, item) => acc + item.custo_unitario * item.quantidade,
        0
      );
      totalCustoProdutos += custoVenda;

      // Calcular Comissão
      const vendedor = pessoas.find((p) => p.id === venda.vendedor_id);
      const taxa =
        vendedor && vendedor.comissao_fixa
          ? vendedor.comissao_fixa / 100
          : comissaoPadrao;

      // Lucro Base para Comissão = (Subtotal - Descontos) - Custo
      // Nota: Não pagamos comissão sobre a Mão de Obra nesta regra, apenas sobre peças
      let valorDesconto = 0;
      if (venda.desconto_tipo === "fixed") valorDesconto = venda.desconto_valor;
      else valorDesconto = (venda.subtotal * venda.desconto_valor) / 100;

      const receitaProdutos = venda.subtotal - valorDesconto;
      const lucroProdutos = receitaProdutos - custoVenda;

      if (lucroProdutos > 0) {
        totalComissoes += lucroProdutos * taxa;
      }
    });

    // Processar Serviços Avulsos (Somam ao faturamento e à Mão de Obra)
    servicos.forEach((servico) => {
      totalFaturamento += servico.valor;
      totalMaoDeObra += servico.valor;
    });

    // Lucro Líquido = Tudo que entrou - (Custo das Peças + Comissões pagas)
    // Obs: Mão de obra entra como lucro 100% para a loja se não houver repasse cadastrado (ajuste conforme necessidade)
    const lucroLiquido = totalFaturamento - totalCustoProdutos - totalComissoes;

    return {
      faturamento: totalFaturamento,
      lucro: lucroLiquido,
      vendasCount: vendas.length,
      maoDeObra: totalMaoDeObra,
      comissoes: totalComissoes,
    };
  } catch (error) {
    console.error("Erro dashboard stats:", error);
    return {
      faturamento: 0,
      lucro: 0,
      vendasCount: 0,
      maoDeObra: 0,
      comissoes: 0,
    };
  }
});

ipcMain.handle("get-weekly-sales", async () => {
  try {
    // Gerar array dos últimos 7 dias
    const labels = [];
    const data = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);

      // Buscar vendas e serviços deste dia
      const vendas = await knex("vendas")
        .whereBetween("data_venda", [d.getTime(), nextD.getTime()])
        .sum("total_final as total");

      const servicos = await knex("servicos_avulsos")
        .whereBetween("data_servico", [d.getTime(), nextD.getTime()])
        .sum("valor as total");

      const totalDia = (vendas[0].total || 0) + (servicos[0].total || 0);

      // Formatar data (ex: "Seg")
      const diaSemana = d.toLocaleDateString("pt-BR", { weekday: "short" });

      labels.push(diaSemana);
      data.push(totalDia);
    }

    return { labels, data };
  } catch (error) {
    console.error("Erro weekly sales:", error);
    return { labels: [], data: [] };
  }
});

ipcMain.handle("get-low-stock", async () => {
  try {
    return await knex("produtos")
      .where("estoque_atual", "<=", 5) // Considera baixo estoque se <= 5
      .select("*")
      .limit(10);
  } catch (error) {
    console.error("Erro low stock:", error);
    return [];
  }
});

// --- CONFIGURAÇÕES & CARGOS ---

// Salvar/Criar Cargo
ipcMain.handle("save-role", async (event, name) => {
  try {
    const [id] = await knex("cargos").insert({ nome: name });
    return { success: true, id };
  } catch (error) {
    console.error("Erro ao salvar cargo:", error);
    return { success: false, error: error.message };
  }
});

// Deletar Cargo
ipcMain.handle("delete-role", async (event, id) => {
  try {
    // Verifica se tem gente usando o cargo antes de deletar
    const pessoasComCargo = await knex("pessoas").where("cargo_id", id).first();
    if (pessoasComCargo) {
      return {
        success: false,
        error: "Existem pessoas vinculadas a este cargo.",
      };
    }
    await knex("cargos").where("id", id).del();
    return { success: true };
  } catch (error) {
    console.error("Erro ao deletar cargo:", error);
    return { success: false, error: error.message };
  }
});

// Buscar Configuração
ipcMain.handle("get-config", async (event, key) => {
  try {
    const config = await knex("configuracoes").where("chave", key).first();
    return config ? config.valor : null;
  } catch (error) {
    console.error("Erro ao buscar config:", error);
    return null;
  }
});

// Salvar Configuração
ipcMain.handle("save-config", async (event, key, value) => {
  try {
    const existing = await knex("configuracoes").where("chave", key).first();
    if (existing) {
      await knex("configuracoes").where("chave", key).update({ valor: value });
    } else {
      await knex("configuracoes").insert({ chave: key, valor: value });
    }
    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar config:", error);
    return { success: false, error: error.message };
  }
});

const crypto = require("crypto");

// --- SISTEMA DE LOGIN & SEGURANÇA ---

// Função auxiliar para gerar Hash de senha
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return { salt, hash };
}

// Função auxiliar para verificar senha
function verifyPassword(password, salt, storedHash) {
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return hash === storedHash;
}

// Verificar se existe algum usuário cadastrado (para o setup inicial)
ipcMain.handle("check-users-exist", async () => {
  try {
    const count = await knex("usuarios").count("id as total").first();
    return count.total > 0;
  } catch (error) {
    console.error("Erro check-users:", error);
    return false;
  }
});

// Criar Usuário (Registro)
ipcMain.handle("register-user", async (event, userData) => {
  try {
    const { salt, hash } = hashPassword(userData.password);

    await knex("usuarios").insert({
      nome: userData.nome,
      username: userData.username,
      password_hash: hash,
      salt: salt,
      cargo: userData.cargo || "admin",
    });

    return { success: true };
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    return { success: false, error: error.message };
  }
});

// Realizar Login
ipcMain.handle("login-attempt", async (event, { username, password }) => {
  try {
    const user = await knex("usuarios").where("username", username).first();

    if (!user) {
      return { success: false, error: "Usuário não encontrado." };
    }

    if (!user.ativo) {
      return { success: false, error: "Usuário desativado." };
    }

    const isValid = verifyPassword(password, user.salt, user.password_hash);

    if (isValid) {
      // Retorna dados seguros (sem a senha)
      return {
        success: true,
        user: {
          id: user.id,
          nome: user.nome,
          username: user.username,
          cargo: user.cargo,
        },
      };
    } else {
      return { success: false, error: "Senha incorreta." };
    }
  } catch (error) {
    console.error("Erro no login:", error);
    return { success: false, error: "Erro interno no servidor." };
  }
});
