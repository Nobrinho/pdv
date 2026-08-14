import React from "react";
import { Icon } from "../ui/Icon";
import { Card } from "../ui/Card";
import ConfigCardHeader from "./ConfigCardHeader";

const RoleManager = ({
  roles = [],
  newRole = "",
  onNewRoleChange,
  onAddRole,
  onDeleteRole,
  deletingRoleId = null,
}) => {
  return (
    <Card padding="lg" className="flex flex-col max-h-[420px]">
      <ConfigCardHeader icon="id-card" title="Cargos" subtitle="Perfis de acesso da equipe" />

      <form onSubmit={onAddRole} className="flex gap-2 mb-4">
        <input
          type="text"
          className="flex-1 rounded-[var(--radius-md)] border border-[var(--input)] bg-[var(--card)] text-[var(--foreground)] h-9 px-3 text-sm outline-none transition focus:border-[var(--ring)] focus:ring-4 focus:ring-[var(--ring)]/20 placeholder:text-[var(--muted-foreground)]"
          placeholder="Nome do novo cargo..."
          value={newRole}
          onChange={(e) => onNewRoleChange(e.target.value)}
        />
        <button
          type="submit"
          className="w-9 h-9 shrink-0 rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center hover:bg-[var(--primary-hover)] transition active:scale-95"
          title="Adicionar cargo"
        >
          <Icon name="plus" size={16} />
        </button>
      </form>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {roles.map((role) => (
          <div
            key={role.id}
            className="flex justify-between items-center px-3 py-2.5 bg-[var(--muted)] rounded-[var(--radius-md)] border border-[var(--border)] hover:border-[var(--ring)] transition"
          >
            <span className="text-sm font-medium text-[var(--foreground)]">{role.nome}</span>
            <button
              onClick={() => onDeleteRole(role.id)}
              className="text-[var(--muted-foreground)] hover:text-[var(--danger)] p-1.5 transition"
              title="Excluir"
            >
              <Icon
                name={deletingRoleId === role.id ? "refresh-cw" : "trash-2"}
                size={15}
                className={deletingRoleId === role.id ? "animate-spin" : ""}
              />
            </button>
          </div>
        ))}
        {roles.length === 0 && (
          <p className="text-[var(--muted-foreground)] text-xs text-center mt-8">Nenhum cargo cadastrado</p>
        )}
      </div>
    </Card>
  );
};

export default RoleManager;
