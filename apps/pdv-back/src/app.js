const { knex } = require("./db");
const { readJson, sendError, sendJson, sendHtml, applySecurity } = require("./http");
const { config } = require("./config");
const logger = require("./logger");
const { rateLimit } = require("./security/rateLimit");
const { spec: openapiSpec, swaggerHtml } = require("./openapi");
const {
  requirePlatform,
  requireStore,
  isStoreAdmin,
  ensureStoreActive,
} = require("./middleware/auth");
const {
  loginPlatform,
  loginStore,
  joinStore,
  resetStoreUserPassword,
  setStoreUserActive,
  listStoreUsers,
  saveStoreUser,
  deleteStoreUser,
} = require("./services/authService");
const {
  createStore,
  listStores,
  setStoreStatus,
  getPlatformDashboard,
  listStoreUsersForPlatform,
  listStoreDevices,
  setDeviceAuthorization,
} = require("./services/storeService");
const { logPlatformAction } = require("./services/auditService");
const {
  listProducts,
  searchProducts,
  saveProduct,
  deleteProduct,
  getProductHistory,
  importProductsBatch,
} = require("./services/productService");
const {
  listClients,
  saveClient,
  findClientByDoc,
  deleteClient,
  getClientDebts,
  payDebt,
} = require("./services/clientService");
const {
  listPeople,
  savePerson,
  deletePerson,
  listRoles,
  saveRole,
  deleteRole,
} = require("./services/peopleService");
const {
  createSale,
  listSales,
  getSaleItems,
  cancelSale,
  payCommissions,
} = require("./services/salesService");
const { getConfigMap, getConfig, saveConfig, getTenantConfig } = require("./services/configService");
const { listServices, createService } = require("./services/serviceService");
const {
  getDashboardStats,
  getWeeklySales,
  getLowStock,
  getInventoryStats,
} = require("./services/dashboardService");
const { logStoreEvent, listStoreEvents } = require("./services/eventLogService");
const {
  createBudget,
  updateBudget,
  listBudgets,
  getBudgetById,
  getBudgetItems,
  cancelBudget,
  duplicateBudget,
  convertBudget,
} = require("./services/budgetService");
const {
  exportStoreBackup,
  restoreStoreBackup,
  listStoreBackups,
  getStoreBackup,
  restoreBackupToNewStore,
} = require("./services/backupService");
const { importSqliteBackup } = require("./services/importService");
const { getSalesReport } = require("./services/reportsService");
const {
  listPlans,
  savePlan,
  changeStorePlan,
  cancelStoreSubscription,
  registerPayment,
  runDunning,
  getBillingOverview,
} = require("./services/billingService");

function match(method, pathname, expectedMethod, pattern) {
  if (method !== expectedMethod) return null;
  const matchResult = pathname.match(pattern);
  return matchResult ? matchResult.groups || {} : null;
}

// Rotas de credenciais sujeitas a rate limit (anti brute-force).
const AUTH_RATE_LIMITED = new Set([
  "/platform/auth/login",
  "/auth/login",
  "/store/onboarding/join",
]);

function tooManyAuthAttempts(req, res, pathname) {
  if (!AUTH_RATE_LIMITED.has(pathname)) return false;
  const ip = req.socket.remoteAddress || "unknown";
  const { limited } = rateLimit(`auth:${ip}`, config.authRateLimit);
  if (limited) {
    logger.warn("rate_limited", { ip, path: pathname });
    sendError(res, 429, "Muitas tentativas. Aguarde alguns minutos e tente novamente.");
    return true;
  }
  return false;
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const { pathname } = url;

  applySecurity(req, res, config);

  if (req.method === "OPTIONS") {
    return sendJson(res, 200, {});
  }

  if (req.method === "GET" && pathname === "/health") {
    return sendJson(res, 200, { success: true, status: "ok" });
  }

  if (config.enableDocs && req.method === "GET" && (pathname === "/docs" || pathname === "/docs/")) {
    return sendHtml(res, 200, swaggerHtml);
  }

  if (config.enableDocs && req.method === "GET" && pathname === "/openapi.json") {
    return sendJson(res, 200, openapiSpec);
  }

  if (tooManyAuthAttempts(req, res, pathname)) return;

  try {
    if (req.method === "POST" && pathname === "/platform/auth/login") {
      const body = await readJson(req);
      const result = await loginPlatform(knex, body);
      return sendJson(res, result.success ? 200 : 401, result);
    }

    if (req.method === "POST" && pathname === "/auth/login") {
      const body = await readJson(req);
      const result = await loginStore(knex, body);
      return sendJson(res, result.success ? 200 : 401, result);
    }

    if (req.method === "POST" && pathname === "/store/onboarding/create") {
      const body = await readJson(req);
      const result = await createStore(knex, body);
      return sendJson(res, result.success ? 201 : 400, result);
    }

    if (req.method === "POST" && pathname === "/store/onboarding/join") {
      const body = await readJson(req);
      const result = await joinStore(knex, body);
      return sendJson(res, result.success ? 200 : 400, result);
    }

    if (req.method === "GET" && pathname === "/platform/me") {
      const auth = requirePlatform(req);
      if (!auth) return sendError(res, 401, "Token de plataforma invalido.");
      const user = await knex("platform_users")
        .where({ id: auth.userId })
        .select("id", "nome", "email", "role", "ativo")
        .first();
      if (!user || !user.ativo) return sendError(res, 401, "Usuario invalido.");
      return sendJson(res, 200, { success: true, user });
    }

    if (req.method === "GET" && pathname === "/platform/dashboard") {
      const auth = requirePlatform(req);
      if (!auth) return sendError(res, 401, "Token de plataforma invalido.");
      const stats = await getPlatformDashboard(knex);
      return sendJson(res, 200, { success: true, stats });
    }

    if (req.method === "GET" && pathname === "/platform/stores") {
      const auth = requirePlatform(req);
      if (!auth) return sendError(res, 401, "Token de plataforma invalido.");
      const stores = await listStores(knex);
      return sendJson(res, 200, { success: true, stores });
    }

    if (req.method === "POST" && pathname === "/platform/stores") {
      const auth = requirePlatform(req);
      if (!auth) return sendError(res, 401, "Token de plataforma invalido.");
      const body = await readJson(req);
      const result = await createStore(knex, body);
      if (result.success) {
        await logPlatformAction(knex, {
          platformUserId: auth.userId,
          lojaId: result.loja.id,
          acao: "store.create",
          entidade: "lojas",
          entidadeId: String(result.loja.id),
          ip: req.socket.remoteAddress,
          userAgent: req.headers["user-agent"],
        });
      }
      return sendJson(res, result.success ? 201 : 400, result);
    }

    if (req.method === "GET" && pathname === "/platform/billing") {
      const auth = requirePlatform(req);
      if (!auth) return sendError(res, 401, "Token de plataforma invalido.");
      return sendJson(res, 200, await getBillingOverview(knex));
    }

    if (req.method === "POST" && pathname === "/platform/billing/run-dunning") {
      const auth = requirePlatform(req);
      if (!auth) return sendError(res, 401, "Token de plataforma invalido.");
      const body = await readJson(req);
      const result = await runDunning(knex, { graceDays: body.graceDays });
      await logPlatformAction(knex, {
        platformUserId: auth.userId,
        acao: "billing.dunning",
        entidade: "assinaturas",
        metadata: result,
        ip: req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
      });
      return sendJson(res, 200, result);
    }

    if (req.method === "GET" && pathname === "/platform/plans") {
      const auth = requirePlatform(req);
      if (!auth) return sendError(res, 401, "Token de plataforma invalido.");
      return sendJson(res, 200, await listPlans(knex));
    }

    if (req.method === "POST" && pathname === "/platform/plans") {
      const auth = requirePlatform(req);
      if (!auth) return sendError(res, 401, "Token de plataforma invalido.");
      const body = await readJson(req);
      const result = await savePlan(knex, body);
      return sendJson(res, result.success ? 200 : 400, result);
    }

    const changePlanParams = match(req.method, pathname, "POST", /^\/platform\/stores\/(?<id>\d+)\/change-plan$/);
    if (changePlanParams) {
      const auth = requirePlatform(req);
      if (!auth) return sendError(res, 401, "Token de plataforma invalido.");
      const body = await readJson(req);
      const result = await changeStorePlan(knex, Number(changePlanParams.id), Number(body.planoId ?? body.plano_id));
      if (result.success) {
        await logPlatformAction(knex, {
          platformUserId: auth.userId,
          lojaId: Number(changePlanParams.id),
          acao: "store.change_plan",
          entidade: "lojas",
          entidadeId: changePlanParams.id,
          metadata: { plano_id: body.planoId ?? body.plano_id },
          ip: req.socket.remoteAddress,
          userAgent: req.headers["user-agent"],
        });
      }
      return sendJson(res, result.success ? 200 : 400, result);
    }

    const cancelStoreParams = match(req.method, pathname, "POST", /^\/platform\/stores\/(?<id>\d+)\/cancel$/);
    if (cancelStoreParams) {
      const auth = requirePlatform(req);
      if (!auth) return sendError(res, 401, "Token de plataforma invalido.");
      const body = await readJson(req);
      const result = await cancelStoreSubscription(knex, Number(cancelStoreParams.id), body.motivo);
      if (result.success) {
        await logPlatformAction(knex, {
          platformUserId: auth.userId,
          lojaId: Number(cancelStoreParams.id),
          acao: "store.cancel",
          entidade: "lojas",
          entidadeId: cancelStoreParams.id,
          metadata: { motivo: body.motivo || null },
          ip: req.socket.remoteAddress,
          userAgent: req.headers["user-agent"],
        });
      }
      return sendJson(res, result.success ? 200 : 400, result);
    }

    const payParams = match(req.method, pathname, "POST", /^\/platform\/stores\/(?<id>\d+)\/register-payment$/);
    if (payParams) {
      const auth = requirePlatform(req);
      if (!auth) return sendError(res, 401, "Token de plataforma invalido.");
      const body = await readJson(req);
      const result = await registerPayment(knex, Number(payParams.id), body);
      if (result.success) {
        await logPlatformAction(knex, {
          platformUserId: auth.userId,
          lojaId: Number(payParams.id),
          acao: "store.payment",
          entidade: "assinaturas",
          entidadeId: payParams.id,
          metadata: { valor: result.valor, vencimento: result.vencimento },
          ip: req.socket.remoteAddress,
          userAgent: req.headers["user-agent"],
        });
      }
      return sendJson(res, result.success ? 200 : 400, result);
    }

    const storeUsersParams = match(req.method, pathname, "GET", /^\/platform\/stores\/(?<id>\d+)\/users$/);
    if (storeUsersParams) {
      const auth = requirePlatform(req);
      if (!auth) return sendError(res, 401, "Token de plataforma invalido.");
      const users = await listStoreUsersForPlatform(knex, Number(storeUsersParams.id));
      return sendJson(res, 200, { success: true, users });
    }

    const resetUserParams = match(
      req.method,
      pathname,
      "POST",
      /^\/platform\/stores\/(?<id>\d+)\/users\/(?<userId>\d+)\/reset-password$/,
    );
    if (resetUserParams) {
      const auth = requirePlatform(req);
      if (!auth) return sendError(res, 401, "Token de plataforma invalido.");
      const body = await readJson(req);
      const result = await resetStoreUserPassword(
        knex,
        Number(resetUserParams.id),
        Number(resetUserParams.userId),
        body.password,
      );
      if (result.success) {
        await logPlatformAction(knex, {
          platformUserId: auth.userId,
          lojaId: Number(resetUserParams.id),
          acao: "user.reset_password",
          entidade: "usuarios",
          entidadeId: resetUserParams.userId,
          ip: req.socket.remoteAddress,
          userAgent: req.headers["user-agent"],
        });
      }
      return sendJson(res, result.success ? 200 : 400, result);
    }

    const userActiveParams = match(
      req.method,
      pathname,
      "POST",
      /^\/platform\/stores\/(?<id>\d+)\/users\/(?<userId>\d+)\/(?<action>deactivate|activate)$/,
    );
    if (userActiveParams) {
      const auth = requirePlatform(req);
      if (!auth) return sendError(res, 401, "Token de plataforma invalido.");
      const ativo = userActiveParams.action === "activate";
      const result = await setStoreUserActive(
        knex,
        Number(userActiveParams.id),
        Number(userActiveParams.userId),
        ativo,
      );
      if (result.success) {
        await logPlatformAction(knex, {
          platformUserId: auth.userId,
          lojaId: Number(userActiveParams.id),
          acao: `user.${userActiveParams.action}`,
          entidade: "usuarios",
          entidadeId: userActiveParams.userId,
          ip: req.socket.remoteAddress,
          userAgent: req.headers["user-agent"],
        });
      }
      return sendJson(res, result.success ? 200 : 400, result);
    }

    const storeDevicesParams = match(req.method, pathname, "GET", /^\/platform\/stores\/(?<id>\d+)\/devices$/);
    if (storeDevicesParams) {
      const auth = requirePlatform(req);
      if (!auth) return sendError(res, 401, "Token de plataforma invalido.");
      const devices = await listStoreDevices(knex, Number(storeDevicesParams.id));
      return sendJson(res, 200, { success: true, devices });
    }

    const authDeviceParams = match(
      req.method,
      pathname,
      "POST",
      /^\/platform\/stores\/(?<id>\d+)\/devices\/(?<deviceId>\d+)\/(?<action>authorize|block)$/,
    );
    if (authDeviceParams) {
      const auth = requirePlatform(req);
      if (!auth) return sendError(res, 401, "Token de plataforma invalido.");
      const result = await setDeviceAuthorization(
        knex,
        Number(authDeviceParams.id),
        Number(authDeviceParams.deviceId),
        authDeviceParams.action === "authorize",
      );
      if (result.success) {
        await logPlatformAction(knex, {
          platformUserId: auth.userId,
          lojaId: Number(authDeviceParams.id),
          acao: `device.${authDeviceParams.action}`,
          entidade: "dispositivos",
          entidadeId: authDeviceParams.deviceId,
          ip: req.socket.remoteAddress,
          userAgent: req.headers["user-agent"],
        });
      }
      return sendJson(res, result.success ? 200 : 404, result);
    }

    const blockParams = match(
      req.method,
      pathname,
      "POST",
      /^\/platform\/stores\/(?<id>\d+)\/block$/,
    );
    if (blockParams) {
      const auth = requirePlatform(req);
      if (!auth) return sendError(res, 401, "Token de plataforma invalido.");

      const body = await readJson(req);
      const result = await setStoreStatus(knex, Number(blockParams.id), "blocked", body.motivo);
      if (result.success) {
        await logPlatformAction(knex, {
          platformUserId: auth.userId,
          lojaId: Number(blockParams.id),
          acao: "store.block",
          entidade: "lojas",
          entidadeId: blockParams.id,
          metadata: { motivo: body.motivo || null },
          ip: req.socket.remoteAddress,
          userAgent: req.headers["user-agent"],
        });
      }
      return sendJson(res, result.success ? 200 : 404, result);
    }

    const unblockParams = match(
      req.method,
      pathname,
      "POST",
      /^\/platform\/stores\/(?<id>\d+)\/unblock$/,
    );
    if (unblockParams) {
      const auth = requirePlatform(req);
      if (!auth) return sendError(res, 401, "Token de plataforma invalido.");

      const result = await setStoreStatus(knex, Number(unblockParams.id), "active");
      if (result.success) {
        await logPlatformAction(knex, {
          platformUserId: auth.userId,
          lojaId: Number(unblockParams.id),
          acao: "store.unblock",
          entidade: "lojas",
          entidadeId: unblockParams.id,
          ip: req.socket.remoteAddress,
          userAgent: req.headers["user-agent"],
        });
      }
      return sendJson(res, result.success ? 200 : 404, result);
    }

    if (req.method === "GET" && pathname === "/auth/me") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const user = await knex("usuarios")
        .where({ id: auth.userId, loja_id: auth.lojaId })
        .select("id", "loja_id", "nome", "username", "cargo")
        .first();

      return sendJson(res, 200, {
        success: true,
        user,
        loja: {
          id: status.loja.id,
          nome: status.loja.nome,
          status: status.loja.status,
        },
      });
    }

    if (req.method === "GET" && pathname === "/users") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      if (!isStoreAdmin(auth)) return sendError(res, 403, "Permissao administrativa necessaria.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const users = await listStoreUsers(knex, auth.lojaId);
      return sendJson(res, 200, { success: true, users });
    }

    if (req.method === "POST" && pathname === "/users") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      if (!isStoreAdmin(auth)) return sendError(res, 403, "Permissao administrativa necessaria.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const body = await readJson(req);
      const result = await saveStoreUser(knex, auth.lojaId, body);
      return sendJson(res, result.success ? 200 : 400, result);
    }

    const deleteUserParams = match(req.method, pathname, "DELETE", /^\/users\/(?<id>\d+)$/);
    if (deleteUserParams) {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      if (!isStoreAdmin(auth)) return sendError(res, 403, "Permissao administrativa necessaria.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const result = await deleteStoreUser(knex, auth.lojaId, Number(deleteUserParams.id));
      return sendJson(res, result.success ? 200 : 400, result);
    }

    if (req.method === "GET" && pathname === "/products") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const products = await listProducts(knex, auth.lojaId);
      return sendJson(res, 200, { success: true, products });
    }

    if (req.method === "GET" && pathname === "/products/search") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const products = await searchProducts(knex, auth.lojaId, {
        term: url.searchParams.get("term"),
        limit: url.searchParams.get("limit"),
      });
      return sendJson(res, 200, { success: true, products });
    }

    if (req.method === "GET" && pathname === "/products/history") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const history = await getProductHistory(knex, auth.lojaId, {
        page: url.searchParams.get("page"),
        limit: url.searchParams.get("limit"),
        startDate: url.searchParams.get("startDate"),
        endDate: url.searchParams.get("endDate"),
      });
      return sendJson(res, 200, { success: true, ...history });
    }

    if (req.method === "POST" && pathname === "/products") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      if (!isStoreAdmin(auth)) return sendError(res, 403, "Permissao administrativa necessaria.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const body = await readJson(req);
      const result = await saveProduct(knex, auth.lojaId, auth.userId, body);
      return sendJson(res, result.success ? 200 : 400, result);
    }

    if (req.method === "POST" && pathname === "/products/import") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      if (!isStoreAdmin(auth)) return sendError(res, 403, "Permissao administrativa necessaria.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const body = await readJson(req);
      const products = Array.isArray(body) ? body : body.products || body.data || [];
      const result = await importProductsBatch(knex, auth.lojaId, auth.userId, products);
      return sendJson(res, result.success ? 200 : 400, result);
    }

    const updateProductParams = match(req.method, pathname, "PUT", /^\/products\/(?<id>\d+)$/);
    if (updateProductParams) {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      if (!isStoreAdmin(auth)) return sendError(res, 403, "Permissao administrativa necessaria.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const body = await readJson(req);
      const result = await saveProduct(knex, auth.lojaId, auth.userId, {
        ...body,
        id: Number(updateProductParams.id),
      });
      return sendJson(res, result.success ? 200 : 400, result);
    }

    const deleteProductParams = match(req.method, pathname, "DELETE", /^\/products\/(?<id>\d+)$/);
    if (deleteProductParams) {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      if (!isStoreAdmin(auth)) return sendError(res, 403, "Permissao administrativa necessaria.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const result = await deleteProduct(knex, auth.lojaId, auth.userId, Number(deleteProductParams.id));
      return sendJson(res, result.success ? 200 : 404, result);
    }

    if (req.method === "GET" && pathname === "/clients") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const clients = await listClients(knex, auth.lojaId);
      return sendJson(res, 200, { success: true, clients });
    }

    if (req.method === "GET" && pathname === "/clients/by-doc") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const result = await findClientByDoc(knex, auth.lojaId, url.searchParams.get("documento"));
      return sendJson(res, 200, result);
    }

    if (req.method === "POST" && pathname === "/clients") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const body = await readJson(req);
      const result = await saveClient(knex, auth.lojaId, body);
      return sendJson(res, result.success ? 200 : 400, result);
    }

    const updateClientParams = match(req.method, pathname, "PUT", /^\/clients\/(?<id>\d+)$/);
    if (updateClientParams) {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const body = await readJson(req);
      const result = await saveClient(knex, auth.lojaId, {
        ...body,
        id: Number(updateClientParams.id),
      });
      return sendJson(res, result.success ? 200 : 400, result);
    }

    const deleteClientParams = match(req.method, pathname, "DELETE", /^\/clients\/(?<id>\d+)$/);
    if (deleteClientParams) {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      if (!isStoreAdmin(auth)) return sendError(res, 403, "Permissao administrativa necessaria.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const result = await deleteClient(knex, auth.lojaId, Number(deleteClientParams.id));
      return sendJson(res, result.success ? 200 : 400, result);
    }

    const clientDebtsParams = match(req.method, pathname, "GET", /^\/clients\/(?<id>\d+)\/debts$/);
    if (clientDebtsParams) {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const debts = await getClientDebts(knex, auth.lojaId, Number(clientDebtsParams.id));
      return sendJson(res, 200, { success: true, debts });
    }

    if (req.method === "POST" && pathname === "/clients/pay-debt") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      if (!isStoreAdmin(auth)) return sendError(res, 403, "Permissao administrativa necessaria.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const body = await readJson(req);
      const result = await payDebt(knex, auth.lojaId, body);
      return sendJson(res, result.success ? 200 : 400, result);
    }

    if (req.method === "GET" && pathname === "/people") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const people = await listPeople(knex, auth.lojaId);
      return sendJson(res, 200, { success: true, people });
    }

    if (req.method === "POST" && pathname === "/people") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      if (!isStoreAdmin(auth)) return sendError(res, 403, "Permissao administrativa necessaria.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const body = await readJson(req);
      const result = await savePerson(knex, auth.lojaId, body);
      return sendJson(res, result.success ? 200 : 400, result);
    }

    const updatePersonParams = match(req.method, pathname, "PUT", /^\/people\/(?<id>\d+)$/);
    if (updatePersonParams) {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      if (!isStoreAdmin(auth)) return sendError(res, 403, "Permissao administrativa necessaria.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const body = await readJson(req);
      const result = await savePerson(knex, auth.lojaId, { ...body, id: Number(updatePersonParams.id) });
      return sendJson(res, result.success ? 200 : 400, result);
    }

    const deletePersonParams = match(req.method, pathname, "DELETE", /^\/people\/(?<id>\d+)$/);
    if (deletePersonParams) {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      if (!isStoreAdmin(auth)) return sendError(res, 403, "Permissao administrativa necessaria.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const result = await deletePerson(knex, auth.lojaId, Number(deletePersonParams.id));
      return sendJson(res, result.success ? 200 : 404, result);
    }

    if (req.method === "GET" && pathname === "/roles") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const roles = await listRoles(knex, auth.lojaId);
      return sendJson(res, 200, { success: true, roles });
    }

    if (req.method === "POST" && pathname === "/roles") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      if (!isStoreAdmin(auth)) return sendError(res, 403, "Permissao administrativa necessaria.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const body = await readJson(req);
      const result = await saveRole(knex, auth.lojaId, body.nome || body.name || body);
      return sendJson(res, result.success ? 200 : 400, result);
    }

    const deleteRoleParams = match(req.method, pathname, "DELETE", /^\/roles\/(?<id>\d+)$/);
    if (deleteRoleParams) {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      if (!isStoreAdmin(auth)) return sendError(res, 403, "Permissao administrativa necessaria.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const result = await deleteRole(knex, auth.lojaId, Number(deleteRoleParams.id));
      return sendJson(res, result.success ? 200 : 400, result);
    }

    if (req.method === "POST" && pathname === "/sales") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const body = await readJson(req);
      const result = await createSale(knex, auth.lojaId, auth.userId, body);
      return sendJson(res, result.success ? 201 : 400, result);
    }

    if (req.method === "GET" && pathname === "/sales") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const result = await listSales(knex, auth.lojaId, {
        page: url.searchParams.get("page"),
        limit: url.searchParams.get("limit"),
        startDate: url.searchParams.get("startDate"),
        endDate: url.searchParams.get("endDate"),
        sellerId: url.searchParams.get("sellerId"),
        clientId: url.searchParams.get("clientId"),
      });

      return sendJson(res, 200, Array.isArray(result) ? { success: true, sales: result } : { success: true, ...result });
    }

    const saleItemsParams = match(req.method, pathname, "GET", /^\/sales\/(?<id>\d+)\/items$/);
    if (saleItemsParams) {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const items = await getSaleItems(knex, auth.lojaId, Number(saleItemsParams.id));
      return sendJson(res, 200, { success: true, items });
    }

    const cancelSaleParams = match(req.method, pathname, "POST", /^\/sales\/(?<id>\d+)\/cancel$/);
    if (cancelSaleParams) {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      if (!isStoreAdmin(auth)) return sendError(res, 403, "Permissao administrativa necessaria.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const body = await readJson(req);
      const result = await cancelSale(knex, auth.lojaId, auth.userId, {
        ...body,
        vendaId: Number(cancelSaleParams.id),
      });
      return sendJson(res, result.success ? 200 : 400, result);
    }

    if (req.method === "POST" && pathname === "/sales/commissions/pay") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      if (!isStoreAdmin(auth)) return sendError(res, 403, "Permissao administrativa necessaria.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const body = await readJson(req);
      const result = await payCommissions(knex, auth.lojaId, body.vendaIds || body.ids || []);
      return sendJson(res, result.success ? 200 : 400, result);
    }

    if (req.method === "GET" && pathname === "/services") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const result = await listServices(knex, auth.lojaId, {
        page: url.searchParams.get("page"),
        limit: url.searchParams.get("limit"),
        startDate: url.searchParams.get("startDate"),
        endDate: url.searchParams.get("endDate"),
        trocadorId: url.searchParams.get("trocadorId"),
      });
      return sendJson(res, 200, Array.isArray(result) ? { success: true, services: result } : { success: true, ...result });
    }

    if (req.method === "POST" && pathname === "/services") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const body = await readJson(req);
      const result = await createService(knex, auth.lojaId, auth.userId, body);
      return sendJson(res, result.success ? 201 : 400, result);
    }

    if (req.method === "GET" && pathname === "/budgets") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);
      const result = await listBudgets(knex, auth.lojaId, {
        page: url.searchParams.get("page"),
        limit: url.searchParams.get("limit"),
        startDate: url.searchParams.get("startDate"),
        endDate: url.searchParams.get("endDate"),
        status: url.searchParams.get("status"),
        clientId: url.searchParams.get("clientId"),
        sellerId: url.searchParams.get("sellerId"),
      });
      return sendJson(res, 200, Array.isArray(result) ? { success: true, budgets: result } : { success: true, ...result });
    }

    if (req.method === "POST" && pathname === "/budgets") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);
      const body = await readJson(req);
      const result = await createBudget(knex, auth.lojaId, body);
      return sendJson(res, result.success ? 201 : 400, result);
    }

    const budgetByIdParams = match(req.method, pathname, "GET", /^\/budgets\/(?<id>\d+)$/);
    if (budgetByIdParams) {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);
      const budget = await getBudgetById(knex, auth.lojaId, Number(budgetByIdParams.id));
      return sendJson(res, budget ? 200 : 404, { success: !!budget, budget, error: budget ? undefined : "Orcamento nao encontrado." });
    }

    const budgetItemsParams = match(req.method, pathname, "GET", /^\/budgets\/(?<id>\d+)\/items$/);
    if (budgetItemsParams) {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);
      const items = await getBudgetItems(knex, auth.lojaId, Number(budgetItemsParams.id));
      return sendJson(res, 200, { success: true, items });
    }

    const updateBudgetParams = match(req.method, pathname, "PUT", /^\/budgets\/(?<id>\d+)$/);
    if (updateBudgetParams) {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);
      const body = await readJson(req);
      const result = await updateBudget(knex, auth.lojaId, { ...body, id: Number(updateBudgetParams.id) });
      return sendJson(res, result.success ? 200 : 400, result);
    }

    const cancelBudgetParams = match(req.method, pathname, "POST", /^\/budgets\/(?<id>\d+)\/cancel$/);
    if (cancelBudgetParams) {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);
      const result = await cancelBudget(knex, auth.lojaId, Number(cancelBudgetParams.id));
      return sendJson(res, result.success ? 200 : 400, result);
    }

    const duplicateBudgetParams = match(req.method, pathname, "POST", /^\/budgets\/(?<id>\d+)\/duplicate$/);
    if (duplicateBudgetParams) {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);
      const result = await duplicateBudget(knex, auth.lojaId, Number(duplicateBudgetParams.id));
      return sendJson(res, result.success ? 200 : 400, result);
    }

    const convertBudgetParams = match(req.method, pathname, "POST", /^\/budgets\/(?<id>\d+)\/convert$/);
    if (convertBudgetParams) {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);
      const body = await readJson(req);
      const result = await convertBudget(knex, auth.lojaId, auth.userId, {
        ...body,
        budgetId: Number(convertBudgetParams.id),
      });
      return sendJson(res, result.success ? 200 : 400, result);
    }

    if (req.method === "GET" && pathname === "/reports/sales") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);
      const result = await getSalesReport(knex, auth.lojaId, {
        startDate: url.searchParams.get("startDate"),
        endDate: url.searchParams.get("endDate"),
        sellerId: url.searchParams.get("sellerId"),
        payment: url.searchParams.get("payment"),
      });
      return sendJson(res, 200, result);
    }

    if (req.method === "GET" && pathname === "/dashboard/stats") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);
      return sendJson(res, 200, { success: true, stats: await getDashboardStats(knex, auth.lojaId) });
    }

    if (req.method === "GET" && pathname === "/dashboard/weekly-sales") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);
      return sendJson(res, 200, { success: true, data: await getWeeklySales(knex, auth.lojaId) });
    }

    if (req.method === "GET" && pathname === "/dashboard/low-stock") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);
      return sendJson(res, 200, { success: true, products: await getLowStock(knex, auth.lojaId) });
    }

    if (req.method === "GET" && pathname === "/dashboard/inventory") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);
      return sendJson(res, 200, { success: true, stats: await getInventoryStats(knex, auth.lojaId) });
    }

    if (req.method === "GET" && pathname === "/events") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);
      const result = await listStoreEvents(knex, auth.lojaId, {
        page: url.searchParams.get("page"),
        limit: url.searchParams.get("limit"),
        eventType: url.searchParams.get("eventType"),
        severity: url.searchParams.get("severity"),
        startDate: url.searchParams.get("startDate"),
        endDate: url.searchParams.get("endDate"),
      });
      return sendJson(res, 200, { success: true, ...result });
    }

    if (req.method === "POST" && pathname === "/events") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);
      const body = await readJson(req);
      await logStoreEvent(knex, auth.lojaId, { ...body, user_id: auth.userId });
      return sendJson(res, 201, { success: true });
    }

    if (req.method === "GET" && pathname === "/config") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const config = await getConfigMap(knex, auth.lojaId);
      return sendJson(res, 200, { success: true, config });
    }

    const getConfigParams = match(req.method, pathname, "GET", /^\/config\/(?<key>[^/]+)$/);
    if (getConfigParams) {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const value = await getConfig(knex, auth.lojaId, decodeURIComponent(getConfigParams.key));
      return sendJson(res, 200, { success: true, value });
    }

    const saveConfigParams = match(req.method, pathname, "PUT", /^\/config\/(?<key>[^/]+)$/);
    if (saveConfigParams) {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      if (!isStoreAdmin(auth)) return sendError(res, 403, "Permissao administrativa necessaria.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const body = await readJson(req);
      const result = await saveConfig(knex, auth.lojaId, decodeURIComponent(saveConfigParams.key), body.valor ?? body.value);
      return sendJson(res, result.success ? 200 : 400, result);
    }

    if (req.method === "GET" && pathname === "/tenant") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const tenant = await getTenantConfig(knex, auth.lojaId);
      return sendJson(res, 200, { success: true, tenant });
    }

    if (req.method === "GET" && pathname === "/backup/export") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      if (!isStoreAdmin(auth)) return sendError(res, 403, "Permissao administrativa necessaria.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const persist = ["1", "true"].includes(url.searchParams.get("persist"));
      const result = await exportStoreBackup(knex, auth.lojaId, { persist });
      return sendJson(res, 200, result);
    }

    if (req.method === "GET" && pathname === "/backup/list") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      if (!isStoreAdmin(auth)) return sendError(res, 403, "Permissao administrativa necessaria.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const result = await listStoreBackups(knex, auth.lojaId);
      return sendJson(res, 200, result);
    }

    const backupItemParams = match(req.method, pathname, "GET", /^\/backup\/(?<id>\d+)$/);
    if (backupItemParams) {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      if (!isStoreAdmin(auth)) return sendError(res, 403, "Permissao administrativa necessaria.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const result = await getStoreBackup(knex, auth.lojaId, Number(backupItemParams.id));
      return sendJson(res, result.success ? 200 : 404, result);
    }

    if (req.method === "POST" && pathname === "/platform/stores/restore") {
      const auth = requirePlatform(req);
      if (!auth) return sendError(res, 401, "Token de plataforma invalido.");
      const body = await readJson(req);
      const result = await restoreBackupToNewStore(knex, body);
      if (result.success) {
        await logPlatformAction(knex, {
          platformUserId: auth.userId,
          lojaId: result.loja.id,
          acao: "store.restore",
          entidade: "lojas",
          entidadeId: String(result.loja.id),
          ip: req.socket.remoteAddress,
          userAgent: req.headers["user-agent"],
        });
      }
      return sendJson(res, result.success ? 201 : 400, result);
    }

    if (req.method === "POST" && pathname === "/store/import-sqlite") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      if (!isStoreAdmin(auth)) return sendError(res, 403, "Permissao administrativa necessaria.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const body = await readJson(req);
      const result = await importSqliteBackup(knex, auth.lojaId, body, { force: !!body.force });
      return sendJson(res, result.success ? 200 : 400, result);
    }

    if (req.method === "POST" && pathname === "/backup/restore") {
      const auth = requireStore(req);
      if (!auth) return sendError(res, 401, "Token de loja invalido.");
      if (!isStoreAdmin(auth)) return sendError(res, 403, "Permissao administrativa necessaria.");

      const status = await ensureStoreActive(knex, auth);
      if (!status.ok) return sendError(res, 403, status.error);

      const body = await readJson(req);
      const result = await restoreStoreBackup(knex, auth.lojaId, body);
      return sendJson(res, result.success ? 200 : 400, result);
    }

    return sendError(res, 404, "Rota nao encontrada.");
  } catch (error) {
    logger.error("request_error", {
      method: req.method,
      path: pathname,
      message: error.message,
      stack: config.isProduction ? undefined : error.stack,
    });
    // Nao vaza detalhes internos em producao.
    const clientMessage = config.isProduction ? "Erro interno." : error.message || "Erro interno.";
    return sendError(res, 500, clientMessage);
  }
}

module.exports = { handleRequest };
