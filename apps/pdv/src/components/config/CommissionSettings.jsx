import React from "react";
import FormField from "../ui/FormField";
import Button from "../ui/Button";

const CommissionSettings = ({
  defaultCommission = "",
  usedCommission = "",
  onDefaultCommissionChange,
  onUsedCommissionChange,
  onSave,
  isSaving = false,
}) => {
  return (
    <div className="bg-surface-100 p-6 rounded-2xl shadow-sm border border-surface-200 flex flex-col">
      <h2 className="text-sm font-black mb-6 text-surface-800 uppercase tracking-widest border-b pb-4 flex items-center gap-2">
        <i className="fas fa-percent text-primary"></i> Taxas de Comissao
      </h2>

      <div className="space-y-4 flex-1">
        <FormField
          label="Pecas Novas (% Total)"
          type="number"
          placeholder="Ex: 5"
          value={defaultCommission}
          onChange={onDefaultCommissionChange}
          icon="fa-tag"
        />
        <FormField
          label="Pecas Usadas (% Lucro)"
          type="number"
          placeholder="Ex: 25"
          value={usedCommission}
          onChange={onUsedCommissionChange}
          icon="fa-recycle"
        />
      </div>

      <Button variant="primary" size="lg" fullWidth loading={isSaving} onClick={onSave} className="mt-6">
        {isSaving ? "Salvando..." : "Atualizar taxas"}
      </Button>
    </div>
  );
};

export default CommissionSettings;
