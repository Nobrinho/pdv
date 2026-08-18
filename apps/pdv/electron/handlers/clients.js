/**
 * Handlers de Clientes e Contas a Receber (Fiado)
 */
const { requirePerm } = require("../lib/authSession");

function register(safeHandle, knex, authSession) {
  const cleanDocument = (documento) => String(documento || "").replace(/\D/g, "");
  const openDebtStatuses = ["PENDENTE", "PARCIAL"];
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
          .whereIn("status", openDebtStatuses)
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
    const authError = await requirePerm(event, knex, authSession, "clients.edit");
    if (authError) return authError;

    if (!client || typeof client !== "object") {
      return { success: false, error: "Cliente invalido." };
    }
    if (!client.id && (!client.nome || !String(client.nome).trim())) {
      return { success: false, error: "Nome obrigatorio." };
    }
    if (Object.prototype.hasOwnProperty.call(client, "nome") && !String(client.nome || "").trim()) {
      return { success: false, error: "Nome obrigatorio." };
    }

    const cleanDoc = cleanDocument(client.documento);
    if (client.documento) {
      if (!cleanDoc) {
        return { success: false, error: "Documento invalido." };
      }
      const duplicatedQuery = knex("clientes")
        .where("ativo", true)
        .whereRaw(
          "REPLACE(REPLACE(REPLACE(REPLACE(documento, '.', ''), '-', ''), '/', ''), ' ', '') = ?",
          [cleanDoc],
        );

      if (client.id) {
        duplicatedQuery.whereNot("id", client.id);
      }

      const existing = await duplicatedQuery.first();
      if (existing) {
        return { success: false, error: "CPF/CNPJ ja cadastrado para outro cliente." };
      }
    }

    if (client.id) {
      const current = await knex("clientes").where("id", client.id).first();
      if (!current) {
        return { success: false, error: "Cliente nao encontrado." };
      }
      const payload = sanitizeClientPayload(client, { forUpdate: true });
      await knex("clientes").where("id", client.id).update(payload);
      return { success: true };
    }

    const payload = sanitizeClientPayload(client, { forUpdate: false });
    const [id] = await knex("clientes").insert(payload);
    return { success: true, id };
  });

  safeHandle("find-client-by-doc", async (event, documento) => {
    const clean = cleanDocument(documento);
    if (!clean) return { success: false, client: null };

    const found = await knex("clientes")
      .where("ativo", true)
      .whereRaw(
        "REPLACE(REPLACE(REPLACE(REPLACE(documento, '.', ''), '-', ''), '/', ''), ' ', '') = ?",
        [clean],
      )
      .first();

    return { success: true, client: found || null };
  });

  safeHandle("delete-client", async (event, id) => {
    const authError = await requirePerm(event, knex, authSession, "clients.edit");
    if (authError) return authError;

    const dividas = await knex("contas_receber")
      .where("cliente_id", id)
      .whereIn("status", openDebtStatuses)
      .first();

    if (dividas) {
      return { success: false, error: "Cliente possui debitos pendentes." };
    }

    const updated = await knex("clientes").where("id", id).update({ ativo: false });
    if (!updated) {
      return { success: false, error: "Cliente nao encontrado." };
    }
    return { success: true };
  });

  safeHandle("get-client-debts", async (event, clienteId) => {
    return await knex("contas_receber")
      .where("cliente_id", clienteId)
      .orderBy("data_lancamento", "desc");
  });

  safeHandle("pay-debt", async (event, { contaId, valorPago }) => {
    const authError = await requirePerm(event, knex, authSession, "clients.payment");
    if (authError) return authError;

    const valor = Number(valorPago);
    if (!Number.isFinite(valor) || valor <= 0) {
      return { success: false, error: "Valor de pagamento invalido." };
    }

    const trx = await knex.transaction();
    try {
      const conta = await trx("contas_receber").where("id", contaId).first();
      if (!conta) throw new Error("Conta nao encontrada");
      if (!openDebtStatuses.includes(conta.status)) {
        throw new Error("Conta nao esta aberta para pagamento.");
      }

      const saldoDevedor = Number(conta.valor_total) - Number(conta.valor_pago);
      if (valor - saldoDevedor > 0.0001) {
        await trx.rollback();
        return { success: false, error: "Valor maior que o saldo devedor." };
      }

      const novoValorPago = Number(conta.valor_pago) + valor;
      let novoStatus = conta.status;

      if (novoValorPago >= Number(conta.valor_total)) {
        novoStatus = "PAGO";
      } else if (novoValorPago > 0) {
        novoStatus = "PARCIAL";
      }

      await trx("contas_receber").where("id", contaId).update({
        valor_pago: novoValorPago,
        status: novoStatus,
      });

      await trx.commit();
      return { success: true };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  });
}

module.exports = { register };
