import React from "react";
import { Icon } from "../ui/Icon";
import DataTable from "../ui/DataTable";
import FormField from "../ui/FormField";
import Button from "../ui/Button";
import StatusBadge from "../ui/StatusBadge";
import { Card } from "../ui/Card";
import ConfigCardHeader from "./ConfigCardHeader";

const userColumns = ({ onDeleteUser, deletingUserId, onEditPermissions, onEditUser }) => [
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
    format: (v, row) => {
      // Usuário com perfil custom → mostra o nome do perfil.
      if (row.perfilNome) {
        return <StatusBadge preset="novo" label={row.perfilNome} />;
      }
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
          onClick={() => onEditUser(row)}
          className="text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--hover-surface)] p-2 rounded-[var(--radius-md)] transition"
          title="Editar usuário"
        >
          <Icon name="pencil" size={16} />
        </button>
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

const BUILTIN_ROLES = [
  { value: "vendedor", label: "Vendedor (básico)" },
  { value: "caixa", label: "Caixa (restrito)" },
  { value: "gerente", label: "Gerente (amplo)" },
  { value: "admin", label: "Administrador (total)" },
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
  onEditUser,
  onCancelEdit,
  profiles = [],
  people = [],
}) => {
  const isEditing = !!newUser.id;
  // Valor do select: perfil custom tem prioridade sobre o cargo interno.
  const roleValue = newUser.perfilId ? `profile:${newUser.perfilId}` : `role:${newUser.cargo || "vendedor"}`;
  const onRoleChange = (raw) => {
    if (raw.startsWith("profile:")) {
      // Perfil custom → cargo neutro não-admin, perfil dita as permissões.
      onNewUserChange({ ...newUser, perfilId: Number(raw.slice(8)), cargo: "vendedor" });
    } else {
      onNewUserChange({ ...newUser, perfilId: null, cargo: raw.slice(5) });
    }
  };
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
            {isEditing ? `Editando: ${newUser.nome || newUser.username}` : "Novo acesso"}
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
              label={isEditing ? "Senha (deixe em branco p/ manter)" : "Senha"}
              type={showPassword ? "text" : "password"}
              placeholder={isEditing ? "Manter senha atual" : "••••••"}
              value={newUser.password}
              onChange={(v) => onNewUserChange({ ...newUser, password: v })}
              required={!isEditing}
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
              value={roleValue}
              onChange={(e) => onRoleChange(e.target.value)}
            >
              <optgroup label="Cargos internos">
                {BUILTIN_ROLES.map((r) => (
                  <option key={r.value} value={`role:${r.value}`}>
                    {r.label}
                  </option>
                ))}
              </optgroup>
              {profiles.length > 0 && (
                <optgroup label="Perfis personalizados">
                  {profiles.map((p) => (
                    <option key={p.id} value={`profile:${p.id}`}>
                      {p.nome}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted-foreground)] ml-0.5">
              Vincular ao vendedor
            </label>
            <select
              className="w-full rounded-[var(--radius-md)] border border-[var(--input)] bg-[var(--card)] text-[var(--foreground)] h-9 px-3 text-sm font-medium outline-none transition focus:border-[var(--ring)] focus:ring-4 focus:ring-[var(--ring)]/20"
              value={newUser.pessoaId ?? ""}
              onChange={(e) =>
                onNewUserChange({ ...newUser, pessoaId: e.target.value ? Number(e.target.value) : null })
              }
            >
              <option value="">Sem vínculo (vê a loja toda)</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-[var(--muted-foreground)] ml-0.5">
              Obrigatório para quem vê só os próprios dados.
            </span>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            icon={isEditing ? "fa-check" : "fa-user-plus"}
            className="mt-2"
          >
            {isEditing ? "Salvar alterações" : "Criar usuário"}
          </Button>
          {isEditing && (
            <Button type="button" variant="secondary" size="sm" fullWidth onClick={onCancelEdit}>
              Cancelar edição
            </Button>
          )}
        </form>

        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          <DataTable
            columns={userColumns({ onDeleteUser, deletingUserId, onEditPermissions, onEditUser })}
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
