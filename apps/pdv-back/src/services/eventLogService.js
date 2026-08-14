async function logStoreEvent(knex, lojaId, event = {}) {
  await knex("event_logs").insert({
    loja_id: lojaId,
    occurred_at_ms: event.occurred_at_ms || Date.now(),
    event_category: event.event_category || "domain_action",
    event_type: event.event_type,
    screen: event.screen || null,
    component: event.component || null,
    action: event.action || null,
    target_id: event.target_id || null,
    entity_type: event.entity_type || null,
    entity_id: event.entity_id == null ? null : String(event.entity_id),
    user_id: event.user_id || null,
    user_name: event.user_name || null,
    session_id: event.session_id || null,
    correlation_id: event.correlation_id || null,
    severity: event.severity || "info",
    message: event.message || null,
    payload_json: event.payload || {},
    source: event.source || "api",
  });
}

async function listStoreEvents(knex, lojaId, filters = {}) {
  const page = Math.max(Number(filters.page || 1), 1);
  const limit = Math.min(Math.max(Number(filters.limit || 100), 1), 500);
  const offset = (page - 1) * limit;

  const query = knex("event_logs").where("loja_id", lojaId).orderBy("occurred_at_ms", "desc");
  const countQuery = knex("event_logs").where("loja_id", lojaId);

  if (filters.eventType) {
    query.where("event_type", filters.eventType);
    countQuery.where("event_type", filters.eventType);
  }
  if (filters.severity) {
    query.where("severity", filters.severity);
    countQuery.where("severity", filters.severity);
  }
  if (filters.startDate) {
    query.where("occurred_at_ms", ">=", Number(filters.startDate));
    countQuery.where("occurred_at_ms", ">=", Number(filters.startDate));
  }
  if (filters.endDate) {
    query.where("occurred_at_ms", "<=", Number(filters.endDate));
    countQuery.where("occurred_at_ms", "<=", Number(filters.endDate));
  }

  const [data, countResult] = await Promise.all([
    query.limit(limit).offset(offset),
    countQuery.count("id as total").first(),
  ]);
  const total = Number(countResult?.total || 0);

  return {
    data: data.map((row) => ({ ...row, payload: row.payload_json || {} })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

module.exports = { logStoreEvent, listStoreEvents };
