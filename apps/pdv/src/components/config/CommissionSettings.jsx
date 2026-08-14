import React from "react";
import FormField from "../ui/FormField";
import Button from "../ui/Button";
import { Card } from "../ui/Card";
import ConfigCardHeader from "./ConfigCardHeader";

const CommissionSettings = ({
  defaultCommission = "",
  usedCommission = "",
  onDefaultCommissionChange,
  onUsedCommissionChange,
  onSave,
  isSaving = false,
}) => {
  return (
    <Card padding="lg" className="flex flex-col">
      <ConfigCardHeader
        icon="percent"
        title="Taxas de comissão"
        subtitle="Só valem para vendas futuras"
      />

      <div className="space-y-4 flex-1">
        <FormField
          label="Peças novas (% total)"
          type="number"
          placeholder="Ex: 5"
          value={defaultCommission}
          onChange={onDefaultCommissionChange}
          icon="fa-tag"
        />
        <FormField
          label="Peças usadas (% lucro)"
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
    </Card>
  );
};

export default CommissionSettings;
