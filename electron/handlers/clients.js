/**
 * Handlers de Clientes e Contas a Receber (Fiado)
 */
function register(safeHandle, knex) {
  safeHandle("get-clients", async () => {
    const clientes = await knex("clientes")
      .leftJoin(
        knex("contas_receber")
          .select("cliente_id")
          .sum({ saldo_devedor: knex.raw("valor_total - valor_pago") })
          .whereNot("status", "PAGO")
          .groupBy("cliente_id")
          .as("dividas"),
        "clientes.id",
        "dividas.cliente_id",
      )
      .where("clientes.ativo", true)
      .select("clientes.*", knex.raw("COALESCE(dividas.saldo_devedor, 0) as saldo_devedor"));

    return clientes;
  });

  safeHandle("save-client", async (event, client) => {
    // Proteção contra CPF/CNPJ duplicado
    if (client.documento) {
      if (client.id) {
        const existing = await knex("clientes")
          .where("documento", client.documento)
          .where("ativo", true)
          .whereNot("id", client.id)
          .first();
        if (existing) {
          return { success: false, error: "CPF/CNPJ já cadastrado para outro cliente." };
        }
      } else {
        const existing = await knex("clientes")
          .where("documento", client.documento)
          .where("ativo", true)
          .first();
        if (existing) {
          return { success: false, error: "CPF/CNPJ já cadastrado para outro cliente." };
        }
      }
    }

    if (client.id) {
      await knex("clientes").where("id", client.id).update(client);
      return { success: true };
    } else {
      const [id] = await knex("clientes").insert({ ...client, ativo: true });
      return { success: true, id };
    }
  });

  // MELHORIA: Busca por SQL em vez de full table scan
  safeHandle("find-client-by-doc", async (event, documento) => {
    const clean = documento ? documento.replace(/\D/g, "") : "";
    if (!clean) return { success: false, client: null };

    const found = await knex("clientes")
      .where("ativo", true)
      .whereRaw("REPLACE(REPLACE(REPLACE(documento, '.', ''), '-', ''), '/', '') = ?", [clean])
      .first();

    return { success: true, client: found || null };
  });

  safeHandle("delete-client", async (event, id) => {
    const dividas = await knex("contas_receber")
      .where("cliente_id", id)
      .whereNot("status", "PAGO")
      .first();

    if (dividas)
      return { success: false, error: "Cliente possui débitos pendentes." };

    await knex("clientes").where("id", id).update({ ativo: false });
    return { success: true };
  });

  safeHandle("get-client-debts", async (event, clienteId) => {
    return await knex("contas_receber")
      .where("cliente_id", clienteId)
      .orderBy("data_lancamento", "desc");
  });

  safeHandle("pay-debt", async (event, { contaId, valorPago }) => {
    const conta = await knex("contas_receber").where("id", contaId).first();
    if (!conta) throw new Error("Conta não encontrada");

    const novoValorPago = conta.valor_pago + valorPago;
    let novoStatus = conta.status;

    if (novoValorPago >= conta.valor_total) {
      novoStatus = "PAGO";
    } else if (novoValorPago > 0) {
      novoStatus = "PARCIAL";
    }

    await knex("contas_receber").where("id", contaId).update({
      valor_pago: novoValorPago,
      status: novoStatus,
    });

    return { success: true };
  });
}

module.exports = { register };
