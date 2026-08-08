import React from "react";
import { Card } from "../ui/Card";

const RoleManager = ({
  roles = [],
  newRole = "",
  onNewRoleChange,
  onAddRole,
  onDeleteRole,
  deletingRoleId = null,
}) => {
  return (
    <Card padding="lg" className="flex flex-col max-h-[400px]">
      <h2 className="text-sm font-black mb-4 text-surface-800 uppercase tracking-widest border-b pb-4 flex items-center gap-2">
        <i className="fas fa-id-badge text-purple-600"></i> Gerenciar Cargos
      </h2>
      <form onSubmit={onAddRole} className="flex gap-2 mb-4">
        <input
          type="text"
          className="flex-1 border border-surface-300 rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-100 bg-surface-100 text-surface-800 border-surface-300 focus:ring-primary-500/20"
          placeholder="Nome do novo cargo..."
          value={newRole}
          onChange={(e) => onNewRoleChange(e.target.value)}
        />
        <button
          type="submit"
          className="bg-purple-600 text-white px-4 py-2 rounded-xl font-black hover:bg-purple-700 transition shadow-sm active:scale-90"
        >
          +
        </button>
      </form>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {roles.map((role) => (
          <div
            key={role.id}
            className="flex justify-between items-center p-3 bg-surface-50 rounded-xl border border-surface-200 hover:border-purple-500/30 transition group"
          >
            <span className="text-sm font-bold text-surface-800 uppercase tracking-tight">
              {role.nome}
            </span>
            <button
              onClick={() => onDeleteRole(role.id)}
              className="text-surface-300 hover:text-red-500 p-1.5 transition"
              title="Excluir"
            >
              <i
                className={`fas text-xs ${
                  deletingRoleId === role.id ? "fa-spinner fa-spin" : "fa-trash-alt"
                }`}
              ></i>
            </button>
          </div>
        ))}
        {roles.length === 0 && (
          <p className="text-surface-400 text-[10px] text-center mt-10 uppercase tracking-widest font-black opacity-30">
            Nenhum cargo
          </p>
        )}
      </div>
    </Card>
  );
};

export default RoleManager;
