import React from "react";
import { Icon } from "../ui/Icon";
import FormField from "../ui/FormField";
import Button from "../ui/Button";
import { Card } from "../ui/Card";
import ConfigCardHeader from "./ConfigCardHeader";

const StoreIdentitySettings = ({
  identity,
  onIdentityChange,
  logoPreview = "",
  logoInputRef,
  onLogoUpload,
  onClearLogo,
  onSave,
  isSaving = false,
}) => {
  return (
    <Card padding="lg" className="flex flex-col">
      <ConfigCardHeader
        icon="store"
        title="Identidade da loja"
        subtitle="Sai impresso no topo dos recibos"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        <div className="space-y-4">
          <span className="text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)]">
            Dados da empresa
          </span>
          <FormField
            label="Nome da loja"
            required
            placeholder="Ex: Barba Pneus"
            value={identity.nome}
            onChange={(value) => onIdentityChange("nome", value)}
            icon="fa-store"
          />
          <FormField
            label="Subtítulo do sistema"
            placeholder="Ex: Terminal de vendas"
            value={identity.subtitulo}
            onChange={(value) => onIdentityChange("subtitulo", value)}
            icon="fa-tag"
          />
          <FormField
            label="Endereço"
            placeholder="Av. Principal, 100"
            value={identity.endereco}
            onChange={(value) => onIdentityChange("endereco", value)}
            icon="fa-map-marker-alt"
          />
          <FormField
            label="Cidade / UF"
            placeholder="Ex: São Paulo/SP"
            value={identity.cidade}
            onChange={(value) => onIdentityChange("cidade", value)}
            icon="fa-city"
          />
          <FormField
            label="Telefone"
            placeholder="(00) 00000-0000"
            value={identity.telefone}
            onChange={(value) => onIdentityChange("telefone", value)}
            icon="fa-phone"
          />
          <FormField
            label="CNPJ"
            placeholder="00.000.000/0000-00"
            value={identity.documento}
            onChange={(value) => onIdentityChange("documento", value)}
            icon="fa-file-alt"
          />
        </div>

        <div className="space-y-4">
          <span className="text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)]">
            Logo do recibo
          </span>

          <div className="p-4 border border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--muted)]">
            <p className="text-xs text-[var(--muted-foreground)] mb-3 leading-relaxed">
              Exibida colorida na tela e no compartilhamento. Na impressão do
              recibo ela é convertida automaticamente para preto e branco.
            </p>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={onLogoUpload}
              className="hidden"
            />

            {logoPreview ? (
              <div className="flex items-center gap-3">
                <div
                  className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-md)] p-2 flex items-center justify-center"
                  style={{ width: 80, height: 60 }}
                >
                  <img
                    src={logoPreview}
                    alt="Logo"
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:underline"
                  >
                    <Icon name="rotate-cw" size={13} /> Trocar
                  </button>
                  <button
                    onClick={onClearLogo}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--danger)] hover:underline"
                  >
                    <Icon name="trash-2" size={13} /> Remover
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => logoInputRef.current?.click()}
                className="w-full border-2 border-dashed border-[var(--border)] rounded-[var(--radius-lg)] py-6 text-center hover:border-[var(--ring)] transition text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex flex-col items-center gap-2"
              >
                <Icon name="cloud-upload" size={24} />
                <span className="text-xs font-semibold">Clique para enviar a logo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-[var(--border)] flex justify-end">
        <Button variant="primary" size="lg" icon="fa-save" loading={isSaving} onClick={onSave}>
          {isSaving ? "Salvando..." : "Salvar identidade"}
        </Button>
      </div>
    </Card>
  );
};

export default StoreIdentitySettings;
