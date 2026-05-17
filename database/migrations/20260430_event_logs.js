/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable("event_logs");
  if (hasTable) return;

  await knex.schema.createTable("event_logs", (table) => {
    table.increments("id").primary();
    table.bigInteger("occurred_at_ms").notNullable().index();
    table.string("event_category", 40).notNullable().index(); // navigation, ui_click, domain_action, system, error
    table.string("event_type", 80).notNullable().index(); // route.enter, menu.click, sale.created
    table.string("screen", 120).nullable().index();
    table.string("component", 120).nullable();
    table.string("action", 80).nullable();
    table.string("target_id", 160).nullable();
    table.string("entity_type", 80).nullable().index();
    table.string("entity_id", 80).nullable();
    table.integer("user_id").nullable().index();
    table.string("user_name", 120).nullable();
    table.string("session_id", 80).nullable().index();
    table.string("correlation_id", 80).nullable().index();
    table.string("severity", 20).notNullable().defaultTo("info").index();
    table.text("message").nullable();
    table.text("payload_json").nullable();
    table.string("source", 40).nullable().defaultTo("system");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("event_logs");
};
