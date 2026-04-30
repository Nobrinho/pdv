/**
 * Handlers de Clientes e Contas a Receber (Fiado)
 */
function register(safeHandle, knex) {
  const sanitizeClientPayload = (client = {}, { forUpdate = false } = {}) => {
    const payload = {};
    const allowedFields = [
      "nome",
      "telefone",
      "documento",
      "endereco",
      "observacoes",
      "limite_credito",
      "ativo",
    ];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(client, field)) {
        payload[field] = client[field];
      }
    }

    if (!forUpdate && !Object.prototype.hasOwnProperty.call(payload, "ativo")) {
      payload.ativo = true;
    }

    return payload;
  };

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
    if (client.documento) {
      if (client.id) {
        const existing = await knex("clientes")
          .where("documento", client.documento)
          .where("ativo", true)
          .whereNot("id", client.id)
          .first();
        if (existing) {
          return { success: false, error: "CPF/CNPJ ja cadastrado para outro cliente." };
        }
      } else {
        const existing = await knex("clientes")
          .where("documento", client.documento)
          .where("ativo", true)
          .first();
        if (existing) {
          return { success: false, error: "CPF/CNPJ ja cadastrado para outro cliente." };
        }
      }
    }

    if (client.id) {
      const payload = sanitizeClientPayload(client, { forUpdate: true });
      await knex("clientes").where("id", client.id).update(payload);
      return { success: true };
    }

    const payload = sanitizeClientPayload(client, { forUpdate: false });
    const [id] = await knex("clientes").insert(payload);
    return { success: true, id };
  });

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

    if (dividas) {
      return { success: false, error: "Cliente possui debitos pendentes." };
    }

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
    if (!conta) throw new Error("Conta nao encontrada");

    const valor = Number(valorPago);
    if (!Number.isFinite(valor) || valor <= 0) {
      return { success: false, error: "Valor de pagamento invalido." };
    }

    const saldoDevedor = Number(conta.valor_total) - Number(conta.valor_pago);
    if (valor - saldoDevedor > 0.0001) {
      return { success: false, error: "Valor maior que o saldo devedor." };
    }

    const novoValorPago = Number(conta.valor_pago) + valor;
    let novoStatus = conta.status;

    if (novoValorPago >= Number(conta.valor_total)) {
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
