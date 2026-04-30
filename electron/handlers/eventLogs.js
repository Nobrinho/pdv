const { logEvent } = require("../lib/eventLogger");

function register(safeHandle, knex) {
  safeHandle("log-event", async (event, payload = {}) => {
    await logEvent(knex, {
      ...payload,
      source: payload.source || "ui",
    });
    return { success: true };
  });

  safeHandle("get-event-logs", async (event, filters = {}) => {
    const page = filters.page ? parseInt(filters.page, 10) : 1;
    const limit = filters.limit ? parseInt(filters.limit, 10) : 100;
    const offset = (page - 1) * limit;

    const query = knex("event_logs").select("*").orderBy("occurred_at_ms", "desc");
    const countQuery = knex("event_logs");

    const applyFilters = (q) => {
      if (filters.startDate) q.where("occurred_at_ms", ">=", filters.startDate);
      if (filters.endDate) q.where("occurred_at_ms", "<=", filters.endDate);
      if (filters.eventCategory && filters.eventCategory !== "all") q.where("event_category", filters.eventCategory);
      if (filters.eventType && filters.eventType !== "all") q.where("event_type", filters.eventType);
      if (filters.screen && filters.screen !== "all") q.where("screen", filters.screen);
      if (filters.userId && filters.userId !== "all") q.where("user_id", filters.userId);
      if (filters.severity && filters.severity !== "all") q.where("severity", filters.severity);
      if (filters.searchTerm) {
        const like = `%${filters.searchTerm}%`;
        q.where(function () {
          this.where("message", "like", like)
            .orWhere("user_name", "like", like)
            .orWhere("target_id", "like", like)
            .orWhere("event_type", "like", like)
            .orWhere("screen", "like", like);
        });
      }
    };

    applyFilters(query);
    applyFilters(countQuery);

    const [data, countResult] = await Promise.all([
      query.limit(limit).offset(offset),
      countQuery.count("id as total").first(),
    ]);

    const total = Number(countResult?.total || 0);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  });
}

module.exports = { register };
