import React from "react";
import { Icon } from "../ui/Icon";
import DataTable from "../ui/DataTable";
import FormField from "../ui/FormField";
import Button from "../ui/Button";
import StatusBadge from "../ui/StatusBadge";
import { Card } from "../ui/Card";
import ConfigCardHeader from "./ConfigCardHeader";

const userColumns = ({ onDeleteUser, deletingUserId, onEditPermissions }) => [
  { key: "nome", label: "Nome completo", bold: true },
  {
    key: "username",
    label: "Login / usuário",
    format: (v) => (
      <span className="text-[var(--muted-foreground)]" style={{ fontFamily: "var(--font-mono)" }}>
        {v}
      </span>
    ),
  },
  {
    key: "cargo",
    label: "Permissão",
    align: "center",
    format: (v) => {
      let type = "success";
      let label = "Vendedor";
      if (v === "admin") {
        type = "secondary";
        label = "Administrador";
      } else if (v === "caixa") {
        type = "warning";
        label = "Caixa";
      } else if (v) {
        label = v.charAt(0).toUpperCase() + v.slice(1);
      }
      return <StatusBadge type={type} label={label} />;
    },
  },
  {
    key: "actions",
    label: "Ações",
    align: "center",
    format: (_, row) => (
      <div className="flex items-center justify-center gap-1">
        <button
          onClick={() => onEditPermissions(row)}
          className="text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--hover-surface)] p-2 rounded-[var(--radius-md)] transition"
          title="Permissões"
        >
          <Icon name="shield" size={16} />
        </button>
        <button
          onClick={() => onDeleteUser(row.id)}
          className="text-[var(--muted-foreground)] hover:text-[var(--danger)] hover:bg-[var(--hover-surface)] p-2 rounded-[var(--radius-md)] transition"
          title="Excluir usuário"
        >
          <Icon
            name={deletingUserId === row.id ? "refresh-cw" : "trash-2"}
            size={16}
            className={deletingUserId === row.id ? "animate-spin" : ""}
          />
        </button>
      </div>
    ),
  },
];

const UserManager = ({
  users = [],
  loading = false,
  newUser,
  onNewUserChange,
  onAddUser,
  onDeleteUser,
  showPassword = false,
  onTogglePassword,
  deletingUserId = null,
  onEditPermissions,
}) => {
  return (
    <Card padding="lg">
      <ConfigCardHeader
        icon="users"
        title="Usuários e cargos"
        subtitle="Quem tem acesso ao terminal"
      />

      <div className="flex flex-col lg:flex-row gap-6">
        <form
          onSubmit={onAddUser}
          className="lg:w-80 xl:w-96 space-y-4 shrink-0 bg-[var(--muted)] p-5 rounded-[var(--radius-lg)] border border-[var(--border)]"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)] block">
            Novo acesso
          </span>
          <FormField
            label="Nome completo"
            placeholder="Ex: João da Silva"
            value={newUser.nome}
            onChange={(v) => onNewUserChange({ ...newUser, nome: v })}
            required
          />
          <FormField
            label="Login / usuário"
            placeholder="Ex: joao.vendas"
            value={newUser.username}
            onChange={(v) => onNewUserChange({ ...newUser, username: v })}
            required
          />

          <div className="relative">
            <FormField
              label="Senha"
              type={showPassword ? "text" : "password"}
              placeholder="••••••"
              value={newUser.password}
              onChange={(v) => onNewUserChange({ ...newUser, password: v })}
              required
            />
            <button
              type="button"
              onClick={onTogglePassword}
              className="absolute right-3 top-[32px] text-[var(--muted-foreground)] hover:text-[var(--primary)]"
            >
              <Icon name={showPassword ? "eye-off" : "eye"} size={15} />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted-foreground)] ml-0.5">
              Permissão
            </label>
            <select
              className="w-full rounded-[var(--radius-md)] border border-[var(--input)] bg-[var(--card)] text-[var(--foreground)] h-9 px-3 text-sm font-medium outline-none transition focus:border-[var(--ring)] focus:ring-4 focus:ring-[var(--ring)]/20"
              value={newUser.cargo}
              onChange={(e) => onNewUserChange({ ...newUser, cargo: e.target.value })}
            >
              <option value="vendedor">Vendedor (básico)</option>
              <option value="caixa">Caixa (restrito)</option>
              <option value="admin">Administrador (total)</option>
            </select>
          </div>

          <Button type="submit" variant="primary" size="lg" fullWidth icon="fa-user-plus" className="mt-2">
            Criar usuário
          </Button>
        </form>

        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          <DataTable
            columns={userColumns({ onDeleteUser, deletingUserId, onEditPermissions })}
            data={users}
            loading={loading}
            emptyMessage="Nenhum usuário de acesso cadastrado."
          />
        </div>
      </div>
    </Card>
  );
};

export default UserManager;
