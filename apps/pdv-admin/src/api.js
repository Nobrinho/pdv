const TOKEN_KEY = "syscontrol_platform_token";
const USER_KEY = "syscontrol_platform_user";

export const getBaseUrl = () =>
  import.meta.env.VITE_API_URL ||
  localStorage.getItem("syscontrol_api_url") ||
  "http://localhost:3333";

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

async function http(path, { method = "GET", body, token = getToken() } = {}) {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.error || `Erro HTTP ${response.status}`);
  }
  return data;
}

export const api = {
  async login(credentials) {
    const result = await http("/platform/auth/login", {
      method: "POST",
      body: credentials,
      token: null,
    });
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    return result;
  },

  async me() {
    return (await http("/platform/me")).user;
  },

  async dashboard() {
    return (await http("/platform/dashboard")).stats || {};
  },

  async stores() {
    return (await http("/platform/stores")).stores || [];
  },

  async createStore(payload) {
    return await http("/platform/stores", { method: "POST", body: payload });
  },

  async restoreToNewStore(payload) {
    return await http("/platform/stores/restore", { method: "POST", body: payload });
  },

  async storeUsers(id) {
    return (await http(`/platform/stores/${id}/users`)).users || [];
  },

  async storeDevices(id) {
    return (await http(`/platform/stores/${id}/devices`)).devices || [];
  },

  async resetUserPassword(storeId, userId, password) {
    return await http(`/platform/stores/${storeId}/users/${userId}/reset-password`, {
      method: "POST",
      body: password ? { password } : {},
    });
  },

  async setUserActive(storeId, userId, active) {
    return await http(`/platform/stores/${storeId}/users/${userId}/${active ? "activate" : "deactivate"}`, {
      method: "POST",
    });
  },

  async authorizeDevice(storeId, deviceId) {
    return await http(`/platform/stores/${storeId}/devices/${deviceId}/authorize`, { method: "POST" });
  },

  async blockDevice(storeId, deviceId) {
    return await http(`/platform/stores/${storeId}/devices/${deviceId}/block`, { method: "POST" });
  },

  async deleteDevice(storeId, deviceId) {
    return await http(`/platform/stores/${storeId}/devices/${deviceId}`, { method: "DELETE" });
  },

  async billing() {
    return (await http("/platform/billing")).billing || {};
  },

  async plans() {
    return (await http("/platform/plans")).plans || [];
  },

  async runDunning() {
    return await http("/platform/billing/run-dunning", { method: "POST", body: {} });
  },

  async changePlan(id, planoId) {
    return await http(`/platform/stores/${id}/change-plan`, { method: "POST", body: { planoId } });
  },

  async registerPayment(id, payload = {}) {
    return await http(`/platform/stores/${id}/register-payment`, { method: "POST", body: payload });
  },

  async cancelStore(id, motivo) {
    return await http(`/platform/stores/${id}/cancel`, { method: "POST", body: { motivo } });
  },

  async blockStore(id, motivo) {
    return await http(`/platform/stores/${id}/block`, {
      method: "POST",
      body: { motivo },
    });
  },

  async unblockStore(id) {
    return await http(`/platform/stores/${id}/unblock`, {
      method: "POST",
    });
  },
};
