import React from "react";
import { Icon } from "../ui/Icon";
import { Card } from "../ui/Card";
import Button from "../ui/Button";
import ConfigCardHeader from "./ConfigCardHeader";

/**
 * ProfileManager — perfis de acesso reutilizáveis (custom roles).
 * Cada perfil define um conjunto de permissões que pode ser atribuído a vários
 * usuários. Presentational: o estado do editor mora na página Config.
 */
const ProfileManager = ({
  profiles = [],
  onNewProfile,
  onEditProfile,
  onDeleteProfile,
  deletingProfileId = null,
}) => {
  return (
    <Card padding="lg" className="flex flex-col max-h-[420px]">
      <div className="flex items-start justify-between gap-3">
        <ConfigCardHeader
          icon="shield"
          title="Perfis de acesso"
          subtitle="Modelos de permissão para atribuir aos usuários"
        />
        <Button variant="primary" size="sm" icon="fa-plus" onClick={onNewProfile} className="shrink-0">
          Novo perfil
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar mt-2">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="flex justify-between items-center px-3 py-2.5 bg-[var(--muted)] rounded-[var(--radius-md)] border border-[var(--border)] hover:border-[var(--ring)] transition"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-[var(--foreground)] truncate">{profile.nome}</div>
              <div className="text-[10px] text-[var(--muted-foreground)]">
                {(profile.permissoes?.length || 0)} permissões
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEditProfile(profile)}
                className="text-[var(--muted-foreground)] hover:text-[var(--primary)] p-1.5 transition"
                title="Editar permissões"
              >
                <Icon name="pencil" size={15} />
              </button>
              <button
                onClick={() => onDeleteProfile(profile.id)}
                className="text-[var(--muted-foreground)] hover:text-[var(--danger)] p-1.5 transition"
                title="Excluir perfil"
              >
                <Icon
                  name={deletingProfileId === profile.id ? "refresh-cw" : "trash-2"}
                  size={15}
                  className={deletingProfileId === profile.id ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>
        ))}
        {profiles.length === 0 && (
          <p className="text-[var(--muted-foreground)] text-xs text-center mt-8">
            Nenhum perfil criado. Crie um para definir o que um grupo de usuários pode fazer.
          </p>
        )}
      </div>
    </Card>
  );
};

export default ProfileManager;
