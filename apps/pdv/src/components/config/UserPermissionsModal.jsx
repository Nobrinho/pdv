import React, { useMemo, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { Icon } from "../ui/Icon";
import { useAlert } from "../../context/AlertSystem";
import { api } from "../../services/api";
import {
  PERMISSION_MODULES,
  ROLE_PRESETS,
  computeEffectivePermissions,
} from "../../../../../packages/shared/domain/permissions.mjs";

const STATE_META = {
  inherit: { label: "Herdar", cls: "bg-[var(--muted)] text-[var(--muted-foreground)]" },
  allow: { label: "Permitir", cls: "bg-[var(--success)] text-[var(--success-foreground)]" },
  deny: { label: "Negar", cls: "bg-[var(--danger)] text-[var(--danger-foreground)]" },
};

/**
 * UserPermissionsModal — editor de controle de acesso granular por usuário.
 * Cada capability tem 3 estados: Herdar (usa o preset do cargo), Permitir
 * (grant) ou Negar (deny). Mostra o resultado efetivo em tempo real.
 */
const UserPermissionsModal = ({ user, onClose, onSaved }) => {
  const { showAlert } = useAlert();
  const isAdmin = String(user?.cargo || "").toLowerCase() === "admin";

  const base = useMemo(() => new Set(ROLE_PRESETS[String(user?.cargo || "").toLowerCase()] || []), [user]);

  const [grants, setGrants] = useState(() => new Set(user?.overrides?.grants || []));
  const [denies, setDenies] = useState(() => new Set(user?.overrides?.denies || []));
  const [saving, setSaving] = useState(false);

  const stateOf = (cap) => (denies.has(cap) ? "deny" : grants.has(cap) ? "allow" : "inherit");

  const setState = (cap, next) => {
    setGrants((prev) => {
      const g = new Set(prev);
      next === "allow" ? g.add(cap) : g.delete(cap);
      return g;
    });
    setDenies((prev) => {
      const d = new Set(prev);
      next === "deny" ? d.add(cap) : d.delete(cap);
      return d;
    });
  };

  const effective = useMemo(
    () =>
      new Set(
        computeEffectivePermissions({
          cargo: user?.cargo,
          overrides: { grants: [...grants], denies: [...denies] },
        }),
      ),
    [user, grants, denies],
  );

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.auth.saveUserPermissions(user.id, {
        grants: [...grants],
        denies: [...denies],
      });
      if (res?.success) {
        showAlert("Permissões atualizadas.", "Sucesso", "success");
        onSaved?.();
        onClose();
      } else {
        showAlert(res?.error || "Falha ao salvar permissões.", "Erro", "error");
      }
    } catch (err) {
      showAlert("Erro técnico ao salvar permissões.", "Erro", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Permissões · ${user?.nome || ""}`}
      icon="shield"
      size="2xl"
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Fechar
          </Button>
          <Button variant="primary" loading={saving} onClick={save} disabled={isAdmin} className="flex-1">
            Salvar permissões
          </Button>
        </div>
      }
    >
      <p className="text-xs text-[var(--muted-foreground)] mb-4">
        Cargo base: <strong className="text-[var(--foreground)]">{user?.cargo}</strong>. “Herdar” usa o padrão do
        cargo; “Permitir”/“Negar” sobrescrevem por usuário.
      </p>

      {isAdmin ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary-soft-foreground)] border border-[var(--primary-soft-border)] px-4 py-3 text-sm">
          <Icon name="shield" size={16} /> Administrador tem acesso total — não é editável.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {PERMISSION_MODULES.map((mod) => (
            <div key={mod.key}>
              <div className="text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)] mb-2">
                {mod.label}
              </div>
              <div className="flex flex-col divide-y divide-[var(--border)] rounded-[var(--radius-lg)] border border-[var(--border)]">
                {mod.caps.map((cap) => {
                  const st = stateOf(cap.key);
                  const on = effective.has(cap.key);
                  return (
                    <div key={cap.key} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="text-sm text-[var(--foreground)] flex items-center gap-2">
                          {cap.label}
                          <Icon
                            name={on ? "circle-check" : "ban"}
                            size={13}
                            className={on ? "text-[var(--success)]" : "text-[var(--muted-foreground)]"}
                          />
                        </div>
                        <div className="text-[10px] text-[var(--muted-foreground)]">
                          padrão do cargo: {base.has(cap.key) ? "liberado" : "bloqueado"}
                        </div>
                      </div>
                      <div className="flex shrink-0 rounded-[var(--radius-md)] border border-[var(--border)] overflow-hidden">
                        {["inherit", "allow", "deny"].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setState(cap.key, opt)}
                            className={`px-2.5 py-1 text-[11px] font-semibold transition ${
                              st === opt ? STATE_META[opt].cls : "bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--hover-surface)]"
                            }`}
                          >
                            {STATE_META[opt].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default UserPermissionsModal;
