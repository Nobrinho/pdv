const BASE_URL = process.env.SMOKE_BASE_URL || "http://localhost:3333";

async function request(method, path, body, token) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(`${method} ${path} falhou: ${response.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  const suffix = Date.now();

  const health = await request("GET", "/health");
  console.log("health:", health.status);

  const platformLogin = await request("POST", "/platform/auth/login", {
    email: "admin@syscontrol.local",
    password: "admin123",
  });
  console.log("platform login:", platformLogin.user.email);

  const createdStore = await request("POST", "/store/onboarding/create", {
    store: {
      nome: `Loja Smoke ${suffix}`,
      telefone: "(00) 00000-0000",
      cidade: "Manaus - AM",
    },
    admin: {
      nome: "Admin Loja",
      username: `admin${suffix}`,
      password: "1234",
    },
    device: {
      deviceId: `smoke-${suffix}`,
      nomeMaquina: "Smoke Test",
    },
    settings: [
      { chave: "comissao_padrao", valor: "0.3" },
      { chave: "comissao_usados", valor: "0.25" },
    ],
  });
  console.log("store created:", createdStore.loja.id);

  const storeLogin = await request("POST", "/auth/login", {
    lojaId: createdStore.loja.id,
    username: `admin${suffix}`,
    password: "1234",
  });
  const storeToken = storeLogin.token;
  console.log("store login:", storeLogin.user.username);

  const roles = await request("GET", "/roles", undefined, storeToken);
  const sellerRole = roles.roles.find((role) => role.nome === "Vendedor") || roles.roles[0];
  console.log("roles:", roles.roles.length);

  const person = await request(
    "POST",
    "/people",
    { nome: "Vendedor Smoke", cargo_id: sellerRole.id, comissao_fixa: "" },
    storeToken,
  );
  console.log("person created:", person.id);

  const product = await request(
    "POST",
    "/products",
    {
      codigo: `SMK-${suffix}`,
      descricao: "Produto Smoke",
      custo: 10,
      preco_venda: 20,
      estoque_atual: 5,
      tipo: "novo",
    },
    storeToken,
  );
  console.log("product created:", product.id);

  const client = await request(
    "POST",
    "/clients",
    {
      nome: "Cliente Smoke",
      documento: `${suffix}`,
      telefone: "(00) 00000-0000",
    },
    storeToken,
  );
  console.log("client created:", client.id);

  const sale = await request(
    "POST",
    "/sales",
    {
      vendedor_id: person.id,
      cliente_id: client.id,
      subtotal: 20,
      mao_de_obra: 0,
      acrescimo_valor: 0,
      desconto_valor: 0,
      desconto_tipo: "fixed",
      total_final: 20,
      itens: [
        {
          id: product.id,
          qty: 1,
          preco_venda: 20,
          custo: 10,
        },
      ],
      pagamentos: [{ metodo: "Dinheiro", valor: 20 }],
    },
    storeToken,
  );
  console.log("sale created:", sale.id);

  const products = await request("GET", "/products", undefined, storeToken);
  const soldProduct = products.products.find((item) => item.id === product.id);
  if (Number(soldProduct.estoque_atual) !== 4) {
    throw new Error(`Estoque esperado 4, recebido ${soldProduct?.estoque_atual}`);
  }
  console.log("stock after sale:", soldProduct.estoque_atual);

  // --- Onboarding: entrar em loja existente (join) + limite de dispositivos ---
  const joinSame = await request(
    "POST",
    "/store/onboarding/join",
    {
      lojaId: createdStore.loja.id,
      username: `admin${suffix}`,
      password: "1234",
      device: { deviceId: `smoke-${suffix}`, nomeMaquina: "Smoke Test" },
    },
  );
  if (!joinSame.token) throw new Error("join no mesmo dispositivo deveria retornar token.");
  console.log("join same device:", joinSame.device?.novo === false ? "reconhecido" : "novo");

  const joinSecond = await fetch(`${BASE_URL}/store/onboarding/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lojaId: createdStore.loja.id,
      username: `admin${suffix}`,
      password: "1234",
      device: { deviceId: `smoke-2-${suffix}`, nomeMaquina: "Segundo PC" },
    }),
  });
  if (joinSecond.status !== 400) {
    throw new Error(`2o dispositivo (limite plano) deveria falhar com 400, retornou ${joinSecond.status}`);
  }
  console.log("device limit enforced:", joinSecond.status);

  // --- Painel da plataforma: dashboard, usuarios e dispositivos ---
  const me = await request("GET", "/platform/me", undefined, platformLogin.token);
  console.log("platform me:", me.user.email);

  const dashboard = await request("GET", "/platform/dashboard", undefined, platformLogin.token);
  console.log("platform dashboard stores:", dashboard.stats.total_lojas);

  const storeUsers = await request(
    "GET",
    `/platform/stores/${createdStore.loja.id}/users`,
    undefined,
    platformLogin.token,
  );
  console.log("store users:", storeUsers.users.length);

  const storeDevices = await request(
    "GET",
    `/platform/stores/${createdStore.loja.id}/devices`,
    undefined,
    platformLogin.token,
  );
  console.log("store devices:", storeDevices.devices.length);

  const blocked = await request(
    "POST",
    `/platform/stores/${createdStore.loja.id}/block`,
    { motivo: "Smoke test" },
    platformLogin.token,
  );
  console.log("store blocked:", blocked.loja.status);

  const blockedCheck = await fetch(`${BASE_URL}/products`, {
    headers: { Authorization: `Bearer ${storeToken}` },
  });
  if (blockedCheck.status !== 403) {
    throw new Error(`Loja bloqueada deveria retornar 403, retornou ${blockedCheck.status}`);
  }
  console.log("blocked access:", blockedCheck.status);

  const unblocked = await request(
    "POST",
    `/platform/stores/${createdStore.loja.id}/unblock`,
    undefined,
    platformLogin.token,
  );
  console.log("store unblocked:", unblocked.loja.status);

  console.log("smoke ok");
}

module.exports = { main };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
