const MAX_TEXT_LENGTH = 500;
const MAX_PAYLOAD_JSON_LENGTH = 10_000;

function truncateText(value, maxLength = MAX_TEXT_LENGTH) {
  if (value === null || value === undefined) return null;
  const text = String(value);
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function stringifyPayload(payload) {
  if (!payload) return null;

  try {
    const json = JSON.stringify(payload);
    return json.length > MAX_PAYLOAD_JSON_LENGTH
      ? `${json.slice(0, MAX_PAYLOAD_JSON_LENGTH)}...`
      : json;
  } catch {
    return JSON.stringify({ error: "payload_not_serializable" });
  }
}

async function logEvent(knex, event = {}) {
  try {
    await knex("event_logs").insert({
      occurred_at_ms: event.occurred_at_ms || Date.now(),
      event_category: truncateText(event.event_category || "system"),
      event_type: truncateText(event.event_type || "event"),
      screen: truncateText(event.screen),
      component: truncateText(event.component),
      action: truncateText(event.action),
      target_id: truncateText(event.target_id),
      entity_type: truncateText(event.entity_type),
      entity_id: event.entity_id != null ? String(event.entity_id) : null,
      user_id: truncateText(event.user_id),
      user_name: truncateText(event.user_name),
      session_id: truncateText(event.session_id),
      correlation_id: truncateText(event.correlation_id),
      severity: truncateText(event.severity || "info"),
      message: truncateText(event.message, 1_000),
      payload_json: stringifyPayload(event.payload),
      source: truncateText(event.source || "system"),
    });
  } catch (err) {
    console.error("Erro ao gravar event log:", err.message);
  }
}

module.exports = { logEvent, truncateText, stringifyPayload };
