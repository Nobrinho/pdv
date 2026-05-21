const OPEN_DEBT_STATUSES = ["PENDENTE", "PARCIAL"];

function cleanDocument(documento) {
  return String(documento || "").replace(/\D/g, "");
}

function sanitizeClientPayload(client = {}, { forUpdate = false } = {}) {
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

  if (payload.nome != null) payload.nome = String(payload.nome).trim();
  if (payload.documento != null) payload.documento = String(payload.documento).trim();
  if (!forUpdate && !Object.prototype.hasOwnProperty.call(payload, "ativo")) {
    payload.ativo = true;
  }

  return payload;
}

async function listClients(knex, lojaId) {
  const debtSubquery = knex("contas_receber")
    .select("cliente_id")
    .sum({ saldo_devedor: knex.raw("valor_total - valor_pago") })
    .where("loja_id", lojaId)
    .whereIn("status", OPEN_DEBT_STATUSES)
    .groupBy("cliente_id")
    .as("dividas");

  return await knex("clientes")
    .leftJoin(debtSubquery, "clientes.id", "dividas.cliente_id")
    .where("clientes.loja_id", lojaId)
    .where("clientes.ativo", true)
    .select("clientes.*", knex.raw("COALESCE(dividas.saldo_devedor, 0) as saldo_devedor"))
    .orderBy("clientes.nome", "asc");
}

async function ensureUniqueDocument(knex, lojaId, documento, currentId) {
  const cleanDoc = cleanDocument(documento);
  if (!documento) return { ok: true };
  if (!cleanDoc) return { ok: false, error: "Documento invalido." };

  const query = knex("clientes")
    .where({ loja_id: lojaId, ativo: true })
    .whereRaw("regexp_replace(COALESCE(documento, ''), '\\D', '', 'g') = ?", [cleanDoc]);

  if (currentId) query.whereNot("id", currentId);

  const existing = await query.first();
  if (existing) return { ok: false, error: "CPF/CNPJ ja cadastrado para outro cliente." };
  return { ok: true };
}

async function saveClient(knex, lojaId, client = {}) {
  if (!client || typeof client !== "object") {
    return { success: false, error: "Cliente invalido." };
  }

  if (!client.id && (!client.nome || !String(client.nome).trim())) {
    return { success: false, error: "Nome obrigatorio." };
  }

  if (Object.prototype.hasOwnProperty.call(client, "nome") && !String(client.nome || "").trim()) {
    return { success: false, error: "Nome obrigatorio." };
  }

  const uniqueDocument = await ensureUniqueDocument(knex, lojaId, client.documento, client.id);
  if (!uniqueDocument.ok) {
    return { success: false, error: uniqueDocument.error };
  }

  if (client.id) {
    const current = await knex("clientes").where({ id: client.id, loja_id: lojaId }).first();
    if (!current) return { success: false, error: "Cliente nao encontrado." };

    const payload = sanitizeClientPayload(client, { forUpdate: true });
    payload.updated_at = knex.fn.now();
    await knex("clientes").where({ id: client.id, loja_id: lojaId }).update(payload);
    return { success: true };
  }

  const payload = sanitizeClientPayload(client);
  const [created] = await knex("clientes")
    .insert({
      loja_id: lojaId,
      ...payload,
    })
    .returning(["id"]);

  return { success: true, id: created.id };
}

async function findClientByDoc(knex, lojaId, documento) {
  const clean = cleanDocument(documento);
  if (!clean) return { success: false, client: null };

  const client = await knex("clientes")
    .where({ loja_id: lojaId, ativo: true })
    .whereRaw("regexp_replace(COALESCE(documento, ''), '\\D', '', 'g') = ?", [clean])
    .first();

  return { success: true, client: client || null };
}

async function deleteClient(knex, lojaId, id) {
  const openDebt = await knex("contas_receber")
    .where({ loja_id: lojaId, cliente_id: id })
    .whereIn("status", OPEN_DEBT_STATUSES)
    .first();

  if (openDebt) {
    return { success: false, error: "Cliente possui debitos pendentes." };
  }

  const updated = await knex("clientes")
    .where({ id, loja_id: lojaId })
    .update({ ativo: false, updated_at: knex.fn.now() });

  if (!updated) return { success: false, error: "Cliente nao encontrado." };
  return { success: true };
}

async function getClientDebts(knex, lojaId, clienteId) {
  return await knex("contas_receber")
    .where({ loja_id: lojaId, cliente_id: clienteId })
    .orderBy("data_lancamento", "desc");
}

async function payDebt(knex, lojaId, payment = {}) {
  const valor = Number(payment.valorPago ?? payment.valor_pago);
  const contaId = Number(payment.contaId ?? payment.conta_id);

  if (!Number.isFinite(valor) || valor <= 0) {
    return { success: false, error: "Valor de pagamento invalido." };
  }

  return await knex.transaction(async (trx) => {
    const conta = await trx("contas_receber").where({ id: contaId, loja_id: lojaId }).first();
    if (!conta) return { success: false, error: "Conta nao encontrada." };
    if (!OPEN_DEBT_STATUSES.includes(conta.status)) {
      return { success: false, error: "Conta nao esta aberta para pagamento." };
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

    await trx("contas_receber").where({ id: contaId, loja_id: lojaId }).update({
      valor_pago: novoValorPago,
      status: novoStatus,
      updated_at: trx.fn.now(),
    });

    return { success: true };
  });
}

module.exports = {
  listClients,
  saveClient,
  findClientByDoc,
  deleteClient,
  getClientDebts,
  payDebt,
};
