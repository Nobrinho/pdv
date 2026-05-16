import React from "react";
import DataTable from "../ui/DataTable";
import FormField from "../ui/FormField";
import StatusBadge from "../ui/StatusBadge";

const userColumns = ({ onDeleteUser, deletingUserId }) => [
  { key: "nome", label: "Nome completo", bold: true },
  {
    key: "username",
    label: "Login / Usuario",
    format: (v) => <span className="font-mono text-surface-500">{v}</span>,
  },
  {
    key: "cargo",
    label: "Permissao",
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
    label: "Acao",
    align: "center",
    format: (_, row) => (
      <button
        onClick={() => onDeleteUser(row.id)}
        className="text-red-400 hover:text-red-600 hover:bg-red-500/10 text-red-500 p-2 rounded-lg transition"
        title="Excluir Usuario"
      >
        <i
          className={`fas ${
            deletingUserId === row.id ? "fa-spinner fa-spin" : "fa-trash"
          }`}
        ></i>
      </button>
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
}) => {
  return (
    <div className="bg-surface-100 p-6 rounded-2xl shadow-sm border border-surface-200">
      <h2 className="text-sm font-black mb-6 text-surface-800 uppercase tracking-widest border-b pb-4 flex items-center gap-2">
        <i className="fas fa-users-cog text-indigo-600"></i> Usuarios de Acesso
      </h2>

      <div className="flex flex-col lg:flex-row gap-8">
        <form
          onSubmit={onAddUser}
          className="lg:w-80 xl:w-96 space-y-4 shrink-0 bg-surface-50 p-6 rounded-2xl border border-surface-200"
        >
          <h3 className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-4">
            Novo Acesso
          </h3>
          <FormField
            label="Nome Completo"
            placeholder="Ex: Joao da Silva"
            value={newUser.nome}
            onChange={(v) => onNewUserChange({ ...newUser, nome: v })}
            required
          />
          <FormField
            label="Login / Usuario"
            placeholder="Ex: joao.vendas"
            value={newUser.username}
            onChange={(v) => onNewUserChange({ ...newUser, username: v })}
            required
          />

          <div className="relative">
            <FormField
              label="Senha Segura"
              type={showPassword ? "text" : "password"}
              placeholder="******"
              value={newUser.password}
              onChange={(v) => onNewUserChange({ ...newUser, password: v })}
              required
            />
            <button
              type="button"
              onClick={onTogglePassword}
              className="absolute right-3 top-[34px] text-surface-400 hover:text-indigo-600"
            >
              <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"} text-xs`}></i>
            </button>
          </div>

          <div>
            <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1 ml-1 block">
              Permissao
            </label>
            <select
              className="w-full border border-surface-300 rounded-xl p-2.5 bg-surface-100 outline-none focus:ring-2 focus:ring-indigo-100 transition text-sm font-medium"
              value={newUser.cargo}
              onChange={(e) => onNewUserChange({ ...newUser, cargo: e.target.value })}
            >
              <option value="vendedor">Vendedor (Basico)</option>
              <option value="caixa">Caixa (Restrito)</option>
              <option value="admin">Administrador (Total)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-sm hover:bg-indigo-700 transition mt-4 shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <i className="fas fa-user-plus"></i> CRIAR USUARIO
          </button>
        </form>

        <div className="flex-1 overflow-hidden flex flex-col">
          <h3 className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-4 ml-4">
            Usuarios com Acesso ao Terminal
          </h3>
          <DataTable
            columns={userColumns({ onDeleteUser, deletingUserId })}
            data={users}
            loading={loading}
            emptyMessage="Nenhum usuario de acesso cadastrado."
          />
        </div>
      </div>
    </div>
  );
};

export default UserManager;
