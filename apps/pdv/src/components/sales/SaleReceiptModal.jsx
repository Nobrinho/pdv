import React, { useState } from "react";
import CupomFiscal from "../CupomFiscal";
import MobileReceipt from "../MobileReceipt";
import Button from "../ui/Button";
import { Icon } from "../ui/Icon";
import { useTenant } from "../../context/TenantContext";
import { shareReceiptImage } from "../../utils/whatsapp";

const SaleReceiptModal = ({
  lastSale,
  onPrint,
  onClose,
  isPrintingReceipt = false,
}) => {
  const { tenant } = useTenant();
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      const element = document.getElementById("cupom-fiscal");
      await shareReceiptImage(element, lastSale, tenant);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-end justify-center sm:items-center z-[70] sm:p-4">
      <div className="bg-surface-300 p-4 pt-2 rounded-t-2xl sm:rounded-lg shadow-2xl flex flex-col max-h-[95vh] w-full sm:max-w-[340px] pb-safe">
        <div className="sheet-grabber sm:hidden" />
        <div className="relative flex-1 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
          {/* Mobile: recibo digital amigável */}
          <div className="lg:hidden">
            <MobileReceipt sale={lastSale} items={lastSale.itens} />
          </div>
          {/* Desktop: cupom térmico. No mobile fica fora da tela (renderizado) para compartilhar/imprimir. */}
          <div className="flex w-full justify-center absolute -left-[9999px] top-0 lg:static lg:left-auto lg:top-auto">
            <CupomFiscal sale={lastSale} items={lastSale.itens} />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 pt-2 border-t border-surface-300">
          <Button variant="success" size="lg" fullWidth loading={sharing} onClick={handleShare}>
            {!sharing && <Icon name="whatsapp" size={18} className="mr-1 inline" />}
            {sharing ? "Gerando recibo..." : "Compartilhar recibo"}
          </Button>
          <div className="flex gap-2">
            <Button variant="primary" size="lg" icon="fa-print" loading={isPrintingReceipt} onClick={onPrint} className="flex-1">
              {isPrintingReceipt ? "Imprimindo..." : "Imprimir"}
            </Button>
            <Button variant="secondary" size="lg" onClick={onClose} className="flex-1">Fechar</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaleReceiptModal;
