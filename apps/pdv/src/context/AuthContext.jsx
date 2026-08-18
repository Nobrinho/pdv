// =============================================================
// AuthContext.jsx — Contexto global de autenticação e permissões
// =============================================================
// Centraliza: user state, login/logout, hasAccess, withPermission,
// e o modal de supervisor (eliminando duplicação no App.jsx e Produtos.jsx)
// =============================================================
import React, { createContext, useState, useContext, useRef, useEffect, useMemo, useCallback } from "react";
import { Icon } from "../components/ui/Icon";
import { useAlert } from "./AlertSystem";
import { api } from "../services/api";
import { queryClient } from "../lib/queryClient";
import {
  ROUTE_CAPABILITY,
  hasCapability,
  computeEffectivePermissions,
} from "../../../../packages/shared/domain/permissions.mjs";

// Limpa o cache de consultas (memória + persistido) ao encerrar a sessão,
// para não vazar dados de uma loja para outra num navegador compartilhado.
const clearQueryCache = () => {
  try {
    queryClient.clear();
    localStorage.removeItem("syscontrol-rq-cache");
  } catch {
    /* ignore */
  }
};

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
};

export const AuthProvider = ({ children }) => {
  // Restaura a sessão persistida no web (evita perder o login ao dar F5).
  const [user, setUser] = useState(() =>
    api.isRemote && api.onlineToken ? api.onlineUser : null,
  );
  const [unlockedRoutes, setUnlockedRoutes] = useState([]);
  const [onboardingRequired, setOnboardingRequired] = useState(null); // null = carregando, true = precisa, false = pronto


  // --- Modal de supervisor ---
  const [showSupervisorModal, setShowSupervisorModal] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [supervisorMode, setSupervisorMode] = useState("action"); // "action" | "route"
  const [pendingRoute, setPendingRoute] = useState(null);

  const { showAlert } = useAlert();

  // 401 global (token expirado/inválido) → derruba a sessão e volta ao login.
  useEffect(() => {
    const off = api.onUnauthorized(() => {
      clearQueryCache();
      setUser(null);
      setUnlockedRoutes([]);
    });
    return off;
  }, []);

  // Verificação de onboarding no startup
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const status = await api.auth.checkOnboarding();
        setOnboardingRequired(!status.onboardingDone);
      } catch (error) {
        console.error("Erro ao verificar onboarding:", error);
        setOnboardingRequired(false); // Fallback seguro
      }
    };
    checkOnboarding();
  }, []);

  // --- Auth ---

  const login = useCallback((userData) => {
    setUser(userData);
    setUnlockedRoutes([]);
  }, []);

  const logout = useCallback(() => {
    api.auth.logout().catch(() => {});
    clearQueryCache();
    setUser(null);
    setUnlockedRoutes([]);
  }, []);

  // --- Permissões (controle de acesso granular) ---

  // Permissões efetivas do usuário. Fallback para o preset do cargo quando o
  // backend ainda não envia `permissions` (sessão antiga / deploy em andamento),
  // evitando travar usuários logados.
  const effectivePermissions = useMemo(() => {
    if (!user) return [];
    if (Array.isArray(user.permissions)) return user.permissions;
    return computeEffectivePermissions({ cargo: user.cargo });
  }, [user]);

  // can(capability) — o usuário tem a capability efetiva?
  const can = useCallback(
    (capability) => {
      if (!user) return false;
      if (user.cargo === "admin") return true;
      return hasCapability(effectivePermissions, capability);
    },
    [user, effectivePermissions],
  );

  // hasAccess(path) — pode acessar a rota? Usa o mapa rota→capability.
  const hasAccess = useCallback(
    (path) => {
      if (!user) return false;
      if (user.cargo === "admin") return true;
      const cap = ROUTE_CAPABILITY[path];
      if (cap === null) return true; // rota pública ao logado (painel)
      if (cap && can(cap)) return true; // tem a capability
      if (unlockedRoutes.includes(path)) return true; // liberado por supervisor
      if (cap === undefined) return true; // rota não mapeada → não bloqueia (compat)
      return false;
    },
    [user, unlockedRoutes, can],
  );

  /**
   * withPermission — Executa uma ação protegida.
   * Executa imediatamente se o usuário é admin OU já possui a capability
   * exigida (`capability`). Caso contrário abre o modal de supervisor para
   * que um administrador autorize na hora.
   * @param {Function} action  ação a executar
   * @param {string} [capability]  capability que dispensa o supervisor
   */
  const withPermission = useCallback(
    (action, capability) => {
      if (user?.cargo === "admin" || (capability && can(capability))) {
        action();
      } else {
        setPendingAction(() => action);
        setSupervisorMode("action");
        setAdminUser("");
        setAdminPass("");
        setShowSupervisorModal(true);
      }
    },
    [user, can],
  );

  /**
   * requestRouteAccess — Para desbloquear rotas restritas.
   * Retorna a rota desbloqueada se autenticado.
   */
  const requestRouteAccess = useCallback(
    (path, navigateFn) => {
      if (hasAccess(path)) {
        navigateFn(path);
      } else {
        setPendingRoute(path);
        setPendingAction(() => () => navigateFn(path));
        setSupervisorMode("route");
        setAdminUser("");
        setAdminPass("");
        setShowSupervisorModal(true);
      }
    },
    [hasAccess],
  );

  const closeSupervisorModal = () => {
    setShowSupervisorModal(false);
    setAdminUser("");
    setAdminPass("");
    setPendingAction(null);
    setPendingRoute(null);
  };

  const handleSupervisorAuth = async (e) => {
    e.preventDefault();
    if (!adminUser || !adminPass)
      return showAlert("Preencha os dados do administrador.");

    setIsAuthLoading(true);
    try {
      const result = await api.auth.verifyAdmin({
        username: adminUser,
        password: adminPass,
      });

      if (result.success && result.user.cargo === "admin") {
        // Desbloqueia rota se era modo "route"
        if (supervisorMode === "route" && pendingRoute) {
          setUnlockedRoutes((prev) => [...prev, pendingRoute]);
        }
        closeSupervisorModal();
        // Executa a ação pendente (navegar ou ação CRUD)
        if (pendingAction) pendingAction();
        setPendingAction(null);
      } else if (result.success) {
        showAlert("Este usuário não tem permissão de Administrador.");
      } else {
        showAlert("Senha ou usuário incorretos.");
      }
    } catch (error) {
      console.error(error);
      showAlert("Erro ao validar permissão.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const value = useMemo(() => ({
    user,
    login,
    logout,
    can,
    hasAccess,
    withPermission,
    requestRouteAccess,
    unlockedRoutes,
    onboardingRequired,
    setOnboardingRequired,
  }), [user, login, logout, can, hasAccess, withPermission, requestRouteAccess, unlockedRoutes, onboardingRequired]);


  return (
    <AuthContext.Provider value={value}>
      {children}

      {/* Modal Supervisor Global — fonte única de verdade */}
      {showSupervisorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] animate-fade-in backdrop-blur-sm">
          <div className="bg-surface-100 rounded-xl shadow-2xl p-8 w-96 max-w-[90%] transform transition-all scale-100 border border-surface-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon name="shield" size={30} className="text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-surface-800">
                {supervisorMode === "route"
                  ? "Acesso Restrito"
                  : "Autorização Necessária"}
              </h2>
              <p className="text-sm text-surface-500 mt-1">
                {supervisorMode === "route"
                  ? "É necessária autorização de administrador."
                  : "Esta ação requer permissão de um administrador."}
              </p>
            </div>

            <form onSubmit={handleSupervisorAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-surface-500 uppercase mb-1">
                  Usuário Admin
                </label>
                <input
                  className="w-full border border-surface-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500 bg-surface-100 text-surface-800 border-surface-300 focus:ring-primary-500/20"
                  placeholder="Admin"
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  disabled={isAuthLoading}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-surface-500 uppercase mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  className="w-full border border-surface-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500 bg-surface-100 text-surface-800 border-surface-300 focus:ring-primary-500/20"
                  placeholder="••••••"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  disabled={isAuthLoading}
                />
              </div>
              <button
                type="submit"
                disabled={isAuthLoading}
                className={`w-full py-3 rounded-lg font-bold transition shadow-lg flex justify-center items-center ${
                  isAuthLoading
                    ? "bg-red-400 cursor-not-allowed text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                {isAuthLoading ? (
                  <Icon name="refresh-cw" size={16} className="animate-spin" />
                ) : supervisorMode === "route" ? (
                  "LIBERAR ACESSO"
                ) : (
                  "AUTORIZAR"
                )}
              </button>
              <button
                type="button"
                onClick={closeSupervisorModal}
                disabled={isAuthLoading}
                className="w-full bg-surface-200 text-surface-600 py-3 rounded-lg font-medium hover:bg-surface-300 transition"
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export default AuthContext;
