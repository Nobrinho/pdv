import React, { useMemo, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { Icon } from "../ui/Icon";
import { useAlert } from "../../context/AlertSystem";
import { api } from "../../services/api";
import {
  PERMISSION_MODULES,
  ALL_CAPABILITIES,
} from "../../../../../packages/shared/domain/permissions.mjs";

/**
 * ProfileEditorModal — cria/edita um perfil de acesso reutilizável.
 * O perfil guarda um conjunto-base de capabilities (checklist por módulo).
 * Usuários recebem esse perfil como base; ajustes finos por usuário continuam
 * no modal de permissões (grants/denies por cima do perfil).
 */
const ProfileEditorModal = ({ profile, onClose, onSaved }) => {
  const { showAlert } = useAlert();
  const isEditing = !!profile?.id;

  const [nome, setNome] = useState(profile?.nome || "");
  const [caps, setCaps] = useState(() => new Set(profile?.permissoes || []));
  const [saving, setSaving] = useState(false);

  const toggle = (cap) =>
    setCaps((prev) => {
      const next = new Set(prev);
      next.has(cap) ? next.delete(cap) : next.add(cap);
      return next;
    });

  const allSelected = caps.size >= ALL_CAPABILITIES.length;
  const toggleAll = () =>
    setCaps(allSelected ? new Set() : new Set(ALL_CAPABILITIES));

  const selectedCount = useMemo(
    () => ALL_CAPABILITIES.filter((c) => caps.has(c)).length,
    [caps],
  );

  const save = async () => {
    if (!nome.trim()) {
      return showAlert("Dê um nome ao perfil.", "Atenção", "warning");
    }
    setSaving(true);
    try {
      const res = await api.auth.saveProfile({
        id: profile?.id,
        nome: nome.trim(),
        permissoes: [...caps],
      });
      if (res?.success) {
        showAlert("Perfil salvo.", "Sucesso", "success");
        onSaved?.();
        onClose();
      } else {
        showAlert(res?.error || "Falha ao salvar o perfil.", "Erro", "error");
      }
    } catch {
      showAlert("Erro técnico ao salvar o perfil.", "Erro", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEditing ? `Editar perfil · ${profile.nome}` : "Novo perfil de acesso"}
      icon="id-card"
      size="2xl"
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Fechar
          </Button>
          <Button variant="primary" loading={saving} onClick={save} className="flex-1">
            Salvar perfil
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)] mb-1">
            Nome do perfil
          </label>
          <input
            className="w-full rounded-[var(--radius-md)] border border-[var(--input)] bg-[var(--card)] text-[var(--foreground)] h-9 px-3 text-sm outline-none transition focus:border-[var(--ring)] focus:ring-4 focus:ring-[var(--ring)]/20"
            placeholder="Ex: Supervisor, Estoquista..."
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--muted-foreground)]">
            {selectedCount} de {ALL_CAPABILITIES.length} permissões
          </span>
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs font-semibold text-[var(--primary)] hover:underline"
          >
            {allSelected ? "Desmarcar tudo" : "Marcar tudo"}
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {PERMISSION_MODULES.map((mod) => (
            <div key={mod.key}>
              <div className="text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)] mb-2">
                {mod.label}
              </div>
              <div className="flex flex-col divide-y divide-[var(--border)] rounded-[var(--radius-lg)] border border-[var(--border)]">
                {mod.caps.map((cap) => {
                  const on = caps.has(cap.key);
                  return (
                    <button
                      key={cap.key}
                      type="button"
                      onClick={() => toggle(cap.key)}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[var(--hover-surface)] transition"
                    >
                      <span className="text-sm text-[var(--foreground)]">{cap.label}</span>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border ${
                          on
                            ? "bg-[var(--primary)] border-[var(--primary)] text-white"
                            : "border-[var(--border)] text-transparent"
                        }`}
                      >
                        <Icon name="check" size={13} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default ProfileEditorModal;
