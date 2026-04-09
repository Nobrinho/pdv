// =============================================================
// AuthContext.jsx — Contexto global de autenticação e permissões
// =============================================================
// Centraliza: user state, login/logout, hasAccess, withPermission,
// e o modal de supervisor (eliminando duplicação no App.jsx e Produtos.jsx)
// =============================================================
import React, { createContext, useState, useContext, useRef, useEffect, useMemo, useCallback } from "react";
import { useAlert } from "./AlertSystem";

// Definição de permissões por cargo
const PERMISSOES_CAIXA = [
  "/vendas",
  "/servicos",
  "/recibos",
  "/historico",
  "/produtos",
];

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [unlockedRoutes, setUnlockedRoutes] = useState([]);

  // --- Modal de supervisor ---
  const [showSupervisorModal, setShowSupervisorModal] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [supervisorMode, setSupervisorMode] = useState("action"); // "action" | "route"
  const [pendingRoute, setPendingRoute] = useState(null);

  const { showAlert } = useAlert();

  // --- Auth ---
  const login = useCallback((userData) => {
    setUser(userData);
    setUnlockedRoutes([]);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setUnlockedRoutes([]);
  }, []);

  // --- Permissões ---
  const hasAccess = useCallback(
    (path) => {
      if (!user) return false;
      if (user.cargo === "admin") return true;
      if (PERMISSOES_CAIXA.includes(path)) return true;
      if (unlockedRoutes.includes(path)) return true;
      return false;
    },
    [user, unlockedRoutes],
  );

  /**
   * withPermission — Executa uma ação protegida.
   * Se o usuário é admin, executa imediatamente.
   * Se não, abre o modal de supervisor.
   */
  const withPermission = useCallback(
    (action) => {
      if (user?.cargo === "admin") {
        action();
      } else {
        setPendingAction(() => action);
        setSupervisorMode("action");
        setAdminUser("");
        setAdminPass("");
        setShowSupervisorModal(true);
      }
    },
    [user],
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
      const result = await window.api.loginAttempt({
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
    hasAccess,
    withPermission,
    requestRouteAccess,
    unlockedRoutes,
  }), [user, login, logout, hasAccess, withPermission, requestRouteAccess, unlockedRoutes]);

  return (
    <AuthContext.Provider value={value}>
      {children}

      {/* Modal Supervisor Global — fonte única de verdade */}
      {showSupervisorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] animate-fade-in backdrop-blur-sm">
          <div className="bg-surface-100 rounded-xl shadow-2xl p-8 w-96 max-w-[90%] transform transition-all scale-100 border border-surface-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-user-shield text-3xl text-red-600"></i>
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
                  <i className="fas fa-circle-notch fa-spin"></i>
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
