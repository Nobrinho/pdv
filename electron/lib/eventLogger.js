async function logEvent(knex, event = {}) {
  try {
    await knex("event_logs").insert({
      occurred_at_ms: event.occurred_at_ms || Date.now(),
      event_category: event.event_category || "system",
      event_type: event.event_type || "event",
      screen: event.screen || null,
      component: event.component || null,
      action: event.action || null,
      target_id: event.target_id || null,
      entity_type: event.entity_type || null,
      entity_id: event.entity_id != null ? String(event.entity_id) : null,
      user_id: event.user_id || null,
      user_name: event.user_name || null,
      session_id: event.session_id || null,
      correlation_id: event.correlation_id || null,
      severity: event.severity || "info",
      message: event.message || null,
      payload_json: event.payload ? JSON.stringify(event.payload) : null,
      source: event.source || "system",
    });
  } catch (err) {
    console.error("Erro ao gravar event log:", err.message);
  }
}

module.exports = { logEvent };
