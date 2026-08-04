// =============================================================
// openapi.js - Especificacao OpenAPI 3.0 da API SysControl.
// Servida em GET /openapi.json e renderizada pelo Swagger UI em GET /docs.
// =============================================================
const { config } = require("./config");

// Wrappers de resposta reutilizaveis.
const ok = (schema) => ({
  description: "Sucesso",
  content: { "application/json": { schema } },
});
const errorResponse = {
  description: "Erro",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ErrorResponse" },
    },
  },
};

// Helpers para montar operacoes rapidamente.
const store = ["Loja"];
const platform = ["Plataforma"];
const publico = ["Publico"];

function op({ tags, summary, security = true, params = [], body = null, responseSchema = null, extraResponses = {} }) {
  const operation = {
    tags,
    summary,
    responses: {
      200: responseSchema ? ok(responseSchema) : { description: "Sucesso" },
      400: errorResponse,
      ...extraResponses,
    },
  };
  if (security) {
    operation.security = [{ bearerAuth: [] }];
    operation.responses[401] = errorResponse;
    operation.responses[403] = errorResponse;
  }
  if (params.length) operation.parameters = params;
  if (body) {
    operation.requestBody = {
      required: true,
      content: { "application/json": { schema: body } },
    };
  }
  return operation;
}

const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "integer" },
};
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const listResp = (itemsKey, name) => ({
  type: "object",
  properties: {
    success: { type: "boolean", example: true },
    [itemsKey]: { type: "array", items: ref(name) },
  },
});
const paginationParams = [
  { name: "page", in: "query", schema: { type: "integer" } },
  { name: "limit", in: "query", schema: { type: "integer" } },
  { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
  { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
];

const spec = {
  openapi: "3.0.3",
  info: {
    title: "SysControl API",
    version: "1.0.0",
    description:
      "API multi-loja do SysControl (PDV white-label). Autenticacao por Bearer token JWT. " +
      "Ha dois tipos de token: **plataforma** (dono do SaaS, rotas `/platform/*`) e **loja** " +
      "(operacao de uma loja). Obtenha o token em `/platform/auth/login`, `/auth/login`, " +
      "`/store/onboarding/create` ou `/store/onboarding/join` e clique em **Authorize**.",
  },
  servers: [{ url: `http://localhost:${config.port}`, description: "Local" }],
  tags: [
    { name: "Publico", description: "Rotas sem autenticacao (health, login, onboarding)." },
    { name: "Plataforma", description: "Painel do dono do SaaS. Requer token de plataforma." },
    { name: "Loja", description: "Operacao de uma loja (PDV). Requer token de loja." },
    { name: "Docs", description: "Documentacao." },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string", example: "Mensagem de erro." },
        },
      },
      SuccessResponse: {
        type: "object",
        properties: { success: { type: "boolean", example: true } },
      },
      LoginPlatformRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", example: "admin@syscontrol.local" },
          password: { type: "string", example: "admin123" },
        },
      },
      LoginStoreRequest: {
        type: "object",
        required: ["lojaId", "username", "password"],
        properties: {
          lojaId: { type: "integer", example: 1 },
          username: { type: "string", example: "admin" },
          password: { type: "string", example: "1234" },
        },
      },
      Device: {
        type: "object",
        properties: {
          id: { type: "integer" },
          nome_maquina: { type: "string", example: "PC-Balcao" },
          device_id: { type: "string" },
          autorizado: { type: "boolean" },
          ultimo_acesso_em: { type: "string", format: "date-time" },
        },
      },
      OnboardingCreateRequest: {
        type: "object",
        required: ["store", "admin"],
        properties: {
          store: {
            type: "object",
            properties: {
              nome: { type: "string", example: "Minha Loja" },
              documento: { type: "string" },
              telefone: { type: "string" },
              email: { type: "string" },
              cidade: { type: "string", example: "Manaus - AM" },
            },
          },
          admin: {
            type: "object",
            required: ["nome", "username", "password"],
            properties: {
              nome: { type: "string", example: "Administrador" },
              username: { type: "string", example: "admin" },
              password: { type: "string", example: "1234" },
            },
          },
          device: {
            type: "object",
            properties: {
              deviceId: { type: "string" },
              nomeMaquina: { type: "string" },
            },
          },
          settings: {
            type: "array",
            items: {
              type: "object",
              properties: { chave: { type: "string" }, valor: { type: "string" } },
            },
          },
        },
      },
      OnboardingJoinRequest: {
        type: "object",
        required: ["username", "password"],
        properties: {
          lojaId: { type: "integer", description: "ID da loja (ou use codigo de convite)." },
          codigo: { type: "string", description: "Codigo de convite (alternativa ao lojaId)." },
          username: { type: "string" },
          password: { type: "string" },
          device: {
            type: "object",
            properties: { deviceId: { type: "string" }, nomeMaquina: { type: "string" } },
          },
        },
      },
      AuthTokenResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          token: { type: "string", description: "Bearer token JWT." },
          user: { type: "object" },
          loja: { type: "object" },
        },
      },
      Product: {
        type: "object",
        properties: {
          id: { type: "integer" },
          codigo: { type: "string", example: "SKU-001" },
          descricao: { type: "string", example: "Produto Exemplo" },
          detalhes_ia: { type: "string", nullable: true },
          custo: { type: "number", example: 10.5 },
          preco_venda: { type: "number", example: 25 },
          estoque_atual: { type: "integer", example: 12 },
          tipo: { type: "string", enum: ["novo", "usado"], example: "novo" },
          ativo: { type: "boolean" },
        },
      },
      Client: {
        type: "object",
        properties: {
          id: { type: "integer" },
          nome: { type: "string" },
          documento: { type: "string" },
          telefone: { type: "string" },
          endereco: { type: "string" },
          observacoes: { type: "string" },
          limite_credito: { type: "number" },
          ativo: { type: "boolean" },
        },
      },
      Person: {
        type: "object",
        properties: {
          id: { type: "integer" },
          nome: { type: "string" },
          cargo_id: { type: "integer", nullable: true },
          comissao_fixa: { type: "number", nullable: true },
          ativo: { type: "boolean" },
        },
      },
      Role: {
        type: "object",
        properties: { id: { type: "integer" }, nome: { type: "string", example: "Vendedor" } },
      },
      StoreUser: {
        type: "object",
        properties: {
          id: { type: "integer" },
          nome: { type: "string" },
          username: { type: "string" },
          cargo: { type: "string", enum: ["admin", "gerente", "vendedor", "caixa"] },
          ativo: { type: "boolean" },
        },
      },
      SaleItem: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID do produto." },
          qty: { type: "integer", example: 1 },
          preco_venda: { type: "number", example: 25 },
          custo: { type: "number", example: 10 },
        },
      },
      Payment: {
        type: "object",
        properties: {
          metodo: { type: "string", example: "Dinheiro" },
          valor: { type: "number", example: 25 },
        },
      },
      SaleRequest: {
        type: "object",
        required: ["itens", "total_final"],
        properties: {
          vendedor_id: { type: "integer" },
          trocador_id: { type: "integer", nullable: true },
          cliente_id: { type: "integer", nullable: true },
          subtotal: { type: "number" },
          mao_de_obra: { type: "number", example: 0 },
          acrescimo_valor: { type: "number", example: 0 },
          desconto_valor: { type: "number", example: 0 },
          desconto_tipo: { type: "string", enum: ["fixed", "percent"], example: "fixed" },
          total_final: { type: "number" },
          itens: { type: "array", items: ref("SaleItem") },
          pagamentos: { type: "array", items: ref("Payment") },
        },
      },
      Store: {
        type: "object",
        properties: {
          id: { type: "integer" },
          nome: { type: "string" },
          cidade: { type: "string" },
          status: {
            type: "string",
            enum: ["trial", "active", "past_due", "blocked", "cancelled", "suspended"],
          },
          plano_nome: { type: "string" },
          faturamento: { type: "number" },
          total_vendas: { type: "integer" },
          total_usuarios: { type: "integer" },
          total_produtos: { type: "integer" },
        },
      },
      PlatformDashboard: {
        type: "object",
        properties: {
          total_lojas: { type: "integer" },
          lojas_ativas: { type: "integer" },
          lojas_bloqueadas: { type: "integer" },
          faturamento_total: { type: "number" },
          faturamento_mes: { type: "number" },
          total_vendas: { type: "integer" },
          total_dispositivos: { type: "integer" },
        },
      },
      Plan: {
        type: "object",
        properties: {
          id: { type: "integer" },
          nome: { type: "string", example: "Basico" },
          preco_mensal: { type: "number", example: 49.9 },
          limite_usuarios: { type: "integer", example: 3 },
          limite_dispositivos: { type: "integer", example: 1 },
          limite_vendas_mes: { type: "integer", nullable: true },
          ativo: { type: "boolean" },
        },
      },
      BillingOverview: {
        type: "object",
        properties: {
          mrr: { type: "number", description: "Receita recorrente mensal (lojas ativas)." },
          arr: { type: "number", description: "Receita recorrente anual (mrr x 12)." },
          total_lojas: { type: "integer" },
          assinaturas_vencidas: { type: "integer" },
          por_plano: { type: "array", items: { type: "object", properties: { plano: { type: "string" }, lojas: { type: "integer" }, receita: { type: "number" } } } },
          por_status: { type: "object", additionalProperties: { type: "integer" } },
          assinaturas: { type: "array", items: { type: "object" } },
        },
      },
      SalesReport: {
        type: "object",
        properties: {
          metrics: {
            type: "object",
            properties: {
              faturamento: { type: "number" },
              custo: { type: "number" },
              maoDeObra: { type: "number" },
              acrescimos: { type: "number" },
              descontos: { type: "number" },
              comissoes: { type: "number" },
              lucro: { type: "number" },
            },
          },
          laborSummary: {
            type: "array",
            items: { type: "object", properties: { nome: { type: "string" }, total: { type: "number" }, qtd: { type: "integer" } } },
          },
          paymentSummary: {
            type: "array",
            items: { type: "object", properties: { metodo: { type: "string" }, valor: { type: "number" } } },
          },
          totals: { type: "object", properties: { vendas: { type: "integer" }, servicos: { type: "integer" } } },
        },
      },
      ImportSqliteRequest: {
        type: "object",
        properties: {
          force: { type: "boolean", description: "Ignora a checagem de loja vazia." },
          backup: {
            type: "object",
            properties: {
              type: { type: "string", example: "syscontrol-local-export" },
              tables: {
                type: "object",
                description: "Mapa tabela -> linhas no formato do banco local.",
                additionalProperties: { type: "array", items: { type: "object" } },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: op({ tags: publico, summary: "Healthcheck", security: false, responseSchema: ref("SuccessResponse") }),
    },
    "/platform/auth/login": {
      post: op({ tags: publico, summary: "Login da plataforma", security: false, body: ref("LoginPlatformRequest"), responseSchema: ref("AuthTokenResponse") }),
    },
    "/auth/login": {
      post: op({ tags: publico, summary: "Login de loja", security: false, body: ref("LoginStoreRequest"), responseSchema: ref("AuthTokenResponse") }),
    },
    "/store/onboarding/create": {
      post: op({ tags: publico, summary: "Criar nova loja", security: false, body: ref("OnboardingCreateRequest"), responseSchema: ref("AuthTokenResponse") }),
    },
    "/store/onboarding/join": {
      post: op({ tags: publico, summary: "Entrar em loja existente (registra dispositivo)", security: false, body: ref("OnboardingJoinRequest"), responseSchema: ref("AuthTokenResponse") }),
    },

    "/platform/me": { get: op({ tags: platform, summary: "Dados do admin logado" }) },
    "/platform/dashboard": { get: op({ tags: platform, summary: "Indicadores gerais da plataforma", responseSchema: { type: "object", properties: { success: { type: "boolean" }, stats: ref("PlatformDashboard") } } }) },
    "/platform/stores": {
      get: op({ tags: platform, summary: "Listar lojas com metricas", responseSchema: listResp("stores", "Store") }),
      post: op({ tags: platform, summary: "Criar loja manualmente", body: ref("OnboardingCreateRequest") }),
    },
    "/platform/stores/{id}/users": { get: op({ tags: platform, summary: "Usuarios de uma loja", params: [idParam], responseSchema: listResp("users", "StoreUser") }) },
    "/platform/stores/{id}/users/{userId}/reset-password": { post: op({ tags: platform, summary: "Resetar senha de um usuario da loja (retorna a nova senha)", params: [idParam, { name: "userId", in: "path", required: true, schema: { type: "integer" } }], body: { type: "object", properties: { password: { type: "string", description: "Opcional; se ausente, gera uma senha temporaria." } } } }) },
    "/platform/stores/{id}/users/{userId}/deactivate": { post: op({ tags: platform, summary: "Desativar usuario da loja", params: [idParam, { name: "userId", in: "path", required: true, schema: { type: "integer" } }] }) },
    "/platform/stores/{id}/users/{userId}/activate": { post: op({ tags: platform, summary: "Reativar usuario da loja", params: [idParam, { name: "userId", in: "path", required: true, schema: { type: "integer" } }] }) },
    "/platform/stores/{id}/devices": { get: op({ tags: platform, summary: "Dispositivos de uma loja", params: [idParam], responseSchema: listResp("devices", "Device") }) },
    "/platform/stores/{id}/devices/{deviceId}/authorize": { post: op({ tags: platform, summary: "Autorizar dispositivo", params: [idParam, { name: "deviceId", in: "path", required: true, schema: { type: "integer" } }] }) },
    "/platform/stores/{id}/devices/{deviceId}/block": { post: op({ tags: platform, summary: "Bloquear dispositivo", params: [idParam, { name: "deviceId", in: "path", required: true, schema: { type: "integer" } }] }) },
    "/platform/stores/{id}/block": { post: op({ tags: platform, summary: "Bloquear loja", params: [idParam], body: { type: "object", properties: { motivo: { type: "string" } } } }) },
    "/platform/stores/{id}/unblock": { post: op({ tags: platform, summary: "Liberar loja", params: [idParam] }) },
    "/platform/billing": { get: op({ tags: platform, summary: "Visao geral de faturamento (MRR, planos, assinaturas)", responseSchema: { type: "object", properties: { success: { type: "boolean" }, billing: ref("BillingOverview") } } }) },
    "/platform/billing/run-dunning": { post: op({ tags: platform, summary: "Rodar cobranca: marca vencidas (past_due) e bloqueia apos a carencia", body: { type: "object", properties: { graceDays: { type: "integer", example: 5 } } } }) },
    "/platform/plans": {
      get: op({ tags: platform, summary: "Listar planos", responseSchema: listResp("plans", "Plan") }),
      post: op({ tags: platform, summary: "Criar/atualizar plano", body: ref("Plan") }),
    },
    "/platform/stores/{id}/change-plan": { post: op({ tags: platform, summary: "Trocar plano da loja", params: [idParam], body: { type: "object", required: ["planoId"], properties: { planoId: { type: "integer" } } } }) },
    "/platform/stores/{id}/cancel": { post: op({ tags: platform, summary: "Cancelar assinatura da loja", params: [idParam], body: { type: "object", properties: { motivo: { type: "string" } } } }) },
    "/platform/stores/{id}/register-payment": { post: op({ tags: platform, summary: "Registrar pagamento (avanca vencimento, reativa loja)", params: [idParam], body: { type: "object", properties: { valor: { type: "number" }, meses: { type: "integer", example: 1 } } } }) },

    "/auth/me": { get: op({ tags: store, summary: "Usuario + loja do token" }) },
    "/users": {
      get: op({ tags: store, summary: "Listar usuarios da loja (admin)", responseSchema: listResp("users", "StoreUser") }),
      post: op({ tags: store, summary: "Criar/atualizar usuario (admin)", body: ref("StoreUser") }),
    },
    "/users/{id}": { delete: op({ tags: store, summary: "Desativar usuario (admin)", params: [idParam] }) },

    "/products": {
      get: op({ tags: store, summary: "Listar produtos", responseSchema: listResp("products", "Product") }),
      post: op({ tags: store, summary: "Criar produto (admin)", body: ref("Product") }),
    },
    "/products/search": { get: op({ tags: store, summary: "Buscar produtos", params: [{ name: "term", in: "query", schema: { type: "string" } }, { name: "limit", in: "query", schema: { type: "integer" } }], responseSchema: listResp("products", "Product") }) },
    "/products/history": { get: op({ tags: store, summary: "Historico de alteracoes de produto", params: paginationParams }) },
    "/products/import": { post: op({ tags: store, summary: "Importar produtos em lote (admin)", body: { type: "array", items: ref("Product") } }) },
    "/products/{id}": {
      put: op({ tags: store, summary: "Atualizar produto (admin)", params: [idParam], body: ref("Product") }),
      delete: op({ tags: store, summary: "Excluir produto (admin)", params: [idParam] }),
    },

    "/clients": {
      get: op({ tags: store, summary: "Listar clientes", responseSchema: listResp("clients", "Client") }),
      post: op({ tags: store, summary: "Criar cliente", body: ref("Client") }),
    },
    "/clients/by-doc": { get: op({ tags: store, summary: "Buscar cliente por documento", params: [{ name: "documento", in: "query", schema: { type: "string" } }] }) },
    "/clients/{id}": {
      put: op({ tags: store, summary: "Atualizar cliente", params: [idParam], body: ref("Client") }),
      delete: op({ tags: store, summary: "Excluir cliente (admin)", params: [idParam] }),
    },
    "/clients/{id}/debts": { get: op({ tags: store, summary: "Dividas (fiado) do cliente", params: [idParam] }) },
    "/clients/pay-debt": { post: op({ tags: store, summary: "Registrar pagamento de fiado (admin)", body: { type: "object" } }) },

    "/people": {
      get: op({ tags: store, summary: "Listar equipe", responseSchema: listResp("people", "Person") }),
      post: op({ tags: store, summary: "Criar pessoa (admin)", body: ref("Person") }),
    },
    "/people/{id}": {
      put: op({ tags: store, summary: "Atualizar pessoa (admin)", params: [idParam], body: ref("Person") }),
      delete: op({ tags: store, summary: "Excluir pessoa (admin)", params: [idParam] }),
    },
    "/roles": {
      get: op({ tags: store, summary: "Listar cargos", responseSchema: listResp("roles", "Role") }),
      post: op({ tags: store, summary: "Criar cargo (admin)", body: ref("Role") }),
    },
    "/roles/{id}": { delete: op({ tags: store, summary: "Excluir cargo (admin)", params: [idParam] }) },

    "/sales": {
      get: op({ tags: store, summary: "Listar vendas", params: [...paginationParams, { name: "sellerId", in: "query", schema: { type: "integer" } }, { name: "clientId", in: "query", schema: { type: "integer" } }] }),
      post: op({ tags: store, summary: "Criar venda (transacional, baixa estoque)", body: ref("SaleRequest") }),
    },
    "/sales/{id}/items": { get: op({ tags: store, summary: "Itens de uma venda", params: [idParam] }) },
    "/sales/{id}/cancel": { post: op({ tags: store, summary: "Cancelar venda (admin, devolve estoque)", params: [idParam], body: { type: "object", properties: { motivo: { type: "string" } } } }) },
    "/sales/commissions/pay": { post: op({ tags: store, summary: "Pagar comissoes (admin)", body: { type: "object", properties: { vendaIds: { type: "array", items: { type: "integer" } } } } }) },

    "/services": {
      get: op({ tags: store, summary: "Listar servicos avulsos", params: [...paginationParams, { name: "trocadorId", in: "query", schema: { type: "integer" } }] }),
      post: op({ tags: store, summary: "Criar servico avulso", body: { type: "object" } }),
    },

    "/budgets": {
      get: op({ tags: store, summary: "Listar orcamentos", params: [...paginationParams, { name: "status", in: "query", schema: { type: "string" } }, { name: "clientId", in: "query", schema: { type: "integer" } }, { name: "sellerId", in: "query", schema: { type: "integer" } }] }),
      post: op({ tags: store, summary: "Criar orcamento", body: { type: "object" } }),
    },
    "/budgets/{id}": {
      get: op({ tags: store, summary: "Obter orcamento", params: [idParam] }),
      put: op({ tags: store, summary: "Atualizar orcamento", params: [idParam], body: { type: "object" } }),
    },
    "/budgets/{id}/items": { get: op({ tags: store, summary: "Itens do orcamento", params: [idParam] }) },
    "/budgets/{id}/cancel": { post: op({ tags: store, summary: "Cancelar orcamento", params: [idParam] }) },
    "/budgets/{id}/duplicate": { post: op({ tags: store, summary: "Duplicar orcamento", params: [idParam] }) },
    "/budgets/{id}/convert": { post: op({ tags: store, summary: "Converter orcamento em venda", params: [idParam], body: { type: "object" } }) },

    "/reports/sales": { get: op({ tags: store, summary: "Relatorio de vendas (metricas, comissoes, mao de obra, pagamentos)", params: [{ name: "startDate", in: "query", schema: { type: "string" } }, { name: "endDate", in: "query", schema: { type: "string" } }, { name: "sellerId", in: "query", schema: { type: "integer" } }, { name: "payment", in: "query", schema: { type: "string" } }], responseSchema: { type: "object", properties: { success: { type: "boolean" }, report: ref("SalesReport") } } }) },
    "/dashboard/stats": { get: op({ tags: store, summary: "KPIs do dashboard" }) },
    "/dashboard/weekly-sales": { get: op({ tags: store, summary: "Vendas da semana" }) },
    "/dashboard/low-stock": { get: op({ tags: store, summary: "Produtos com estoque baixo" }) },
    "/dashboard/inventory": { get: op({ tags: store, summary: "Valorizacao de estoque" }) },

    "/events": {
      get: op({ tags: store, summary: "Listar logs de eventos", params: [...paginationParams, { name: "eventType", in: "query", schema: { type: "string" } }, { name: "severity", in: "query", schema: { type: "string" } }] }),
      post: op({ tags: store, summary: "Registrar evento", body: { type: "object" } }),
    },

    "/config": { get: op({ tags: store, summary: "Todas as configuracoes da loja" }) },
    "/config/{key}": {
      get: op({ tags: store, summary: "Ler uma configuracao", params: [{ name: "key", in: "path", required: true, schema: { type: "string" } }] }),
      put: op({ tags: store, summary: "Salvar uma configuracao (admin)", params: [{ name: "key", in: "path", required: true, schema: { type: "string" } }], body: { type: "object", properties: { valor: { type: "string" } } } }),
    },
    "/tenant": { get: op({ tags: store, summary: "Configuracao de identidade (white-label)" }) },

    "/backup/export": { get: op({ tags: store, summary: "Exportar backup da loja (admin)", params: [{ name: "persist", in: "query", schema: { type: "boolean" }, description: "Se true, salva o snapshot no servidor." }] }) },
    "/backup/list": { get: op({ tags: store, summary: "Listar snapshots salvos da loja (admin)" }) },
    "/backup/{id}": { get: op({ tags: store, summary: "Obter o payload de um snapshot salvo (admin)", params: [idParam] }) },
    "/backup/restore": { post: op({ tags: store, summary: "Restaurar backup SOBRE a loja atual (admin, cria snapshot pre_restore automatico)", body: { type: "object", description: "Objeto de backup (formato syscontrol-store-backup)." } }) },
    "/platform/stores/restore": { post: op({ tags: platform, summary: "Restaurar um backup em uma LOJA NOVA (remapeia ids)", body: { type: "object", properties: { store: { type: "object" }, admin: { type: "object" }, backup: { type: "object" } } } }) },
    "/store/import-sqlite": { post: op({ tags: store, summary: "Importar dados do PDV local (SQLite) na loja (admin)", body: ref("ImportSqliteRequest") }) },
  },
};

const swaggerHtml = `<!doctype html>
<html lang="pt-br">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SysControl API - Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  <style>body{margin:0}.topbar{display:none}</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: "/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        persistAuthorization: true,
        presets: [SwaggerUIBundle.presets.apis],
      });
    };
  </script>
</body>
</html>`;

module.exports = { spec, swaggerHtml };
