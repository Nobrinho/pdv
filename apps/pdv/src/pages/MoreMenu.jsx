import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Icon } from "../components/ui/Icon";
import { roleLabel } from "../utils/format";

// Aba "Mais" (mobile) — as seções que não cabem na barra inferior, em grupos.
// Fornecedores fica de fora enquanto não houver tela/back (pendência do handoff).
const GROUPS = [
  {
    title: "Operação",
    items: [
      { path: "/recibos", label: "Recibos", lucide: "receipt" },
      { path: "/orcamentos", label: "Orçamentos", lucide: "file-text" },
      { path: "/servicos", label: "Serviços", lucide: "wrench" },
    ],
  },
  {
    title: "Gestão",
    items: [
      { path: "/relatorios", label: "Relatórios", lucide: "line-chart" },
      { path: "/despesas", label: "Despesas", lucide: "wallet" },
      { path: "/comissoes", label: "Comissões", lucide: "hand-coins" },
      { path: "/historico", label: "Auditoria de preços", lucide: "history" },
    ],
  },
  {
    title: "Cadastros e sistema",
    items: [
      { path: "/pessoas", label: "Equipe", lucide: "users-round" },
      { path: "/config", label: "Configurações", lucide: "settings" },
    ],
  },
];

const MoreMenu = () => {
  const navigate = useNavigate();
  const { user, logout, hasAccess, requestRouteAccess } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();

  const go = (path) => requestRouteAccess(path, navigate);

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto bg-[var(--app-canvas)] lg:hidden">
      {/* Cartão do usuário */}
      {user && (
        <div className="flex items-center justify-between bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xs)] p-4 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black bg-[var(--avatar-primary)] text-[var(--avatar-primary-foreground)]">
              {user.nome.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)] truncate">{user.nome}</p>
              <p className="text-[11px] text-[var(--muted-foreground)] capitalize">
                {roleLabel(user)}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-[var(--radius-md)] text-[var(--muted-foreground)] hover:text-[var(--danger)] hover:bg-[var(--hover-surface)] transition"
            title="Sair"
          >
            <Icon name="power" size={18} />
          </button>
        </div>
      )}

      {GROUPS.map((group) => (
        <div key={group.title} className="mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)] mb-2 ml-1">
            {group.title}
          </p>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xs)] overflow-hidden divide-y divide-[var(--border)]">
            {group.items.map((item) => {
              const locked = !hasAccess(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => go(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--hover-surface)] transition"
                >
                  <span className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--content2)] flex items-center justify-center text-[var(--muted-foreground)] shrink-0">
                    <Icon name={item.lucide} size={17} />
                  </span>
                  <span className="flex-1 text-sm font-medium text-[var(--foreground)]">{item.label}</span>
                  {locked && <Icon name="lock" size={13} className="text-[var(--muted-foreground)]" />}
                  <Icon name="chevron-right" size={16} className="text-[var(--muted-foreground)]" />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Preferências */}
      <div className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)] mb-2 ml-1">
          Preferências
        </p>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xs)] overflow-hidden">
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--hover-surface)] transition"
          >
            <span className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--content2)] flex items-center justify-center text-[var(--muted-foreground)] shrink-0">
              <Icon name={isDarkMode ? "moon" : "sun"} size={17} />
            </span>
            <span className="flex-1 text-sm font-medium text-[var(--foreground)]">
              {isDarkMode ? "Modo escuro" : "Modo claro"}
            </span>
            <span className={`w-9 h-5 rounded-full p-0.5 transition-colors ${isDarkMode ? "bg-[var(--primary)]" : "bg-[var(--switch-track)]"}`}>
              <span className={`block w-4 h-4 rounded-full bg-[var(--switch-thumb)] shadow transition-transform ${isDarkMode ? "translate-x-4" : ""}`} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoreMenu;
