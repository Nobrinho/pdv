import React, { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import { useAlert } from "../context/AlertSystem";
import CupomFiscal from "../components/CupomFiscal";
import { Sale, SaleItem, CompanyInfo } from "../types";
import { useSales } from "../hooks/useSales";
import { usePeople } from "../hooks/usePeople";
import { useClients } from "../hooks/useClients";

import SalesHistoryTable from "../components/reports/SalesHistoryTable";
import SalesFilters from "../components/reports/SalesFilters";
import CancelSaleModal from "../components/reports/CancelSaleModal";

const Recibos: React.FC = () => {
  const { showAlert } = useAlert();
  const { sales, cancelSale, getSaleItems, isLoading } = useSales();
  const { sellers } = usePeople();
  const { clients } = useClients();

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

  // Filtros
  const [periodType, setPeriodType] = useState("weekly");
  const [filters, setFilters] = useState({
    startDate: dayjs().startOf("week").format("YYYY-MM-DD"),
    endDate: dayjs().endOf("week").format("YYYY-MM-DD"),
    sellerId: "all",
    clientId: "",
  });
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [showClientResults, setShowClientResults] = useState(false);

  // Modais
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      const data = await window.api.getCompanyInfo();
      setCompanyInfo(data);
    };
    fetchCompanyInfo();
  }, []);

  const handlePeriodChange = (type: string) => {
    setPeriodType(type);
    const now = dayjs();
    let newStart = filters.startDate;
    let newEnd = filters.endDate;

    if (type === "weekly") {
      newStart = now.startOf("week").format("YYYY-MM-DD");
      newEnd = now.endOf("week").format("YYYY-MM-DD");
    } else if (type === "monthly") {
      newStart = now.startOf("month").format("YYYY-MM-DD");
      newEnd = now.endOf("month").format("YYYY-MM-DD");
    } else if (type === "yearly") {
      newStart = now.startOf("year").format("YYYY-MM-DD");
      newEnd = now.endOf("year").format("YYYY-MM-DD");
    }

    setFilters((prev) => ({ ...prev, startDate: newStart, endDate: newEnd }));
  };

  const filteredSales = useMemo(() => {
    let result = sales;

    // Filtro Data
    const start = dayjs(filters.startDate).startOf("day");
    const end = dayjs(filters.endDate).endOf("day");
    
    result = result.filter((s: Sale) => {
      const date = dayjs(s.data_venda);
      return (
        date.isSame(start, "day") ||
        date.isSame(end, "day") ||
        (date.isAfter(start) && date.isBefore(end))
      );
    });

    // Filtro Vendedor
    if (filters.sellerId !== "all") {
      result = result.filter((s: Sale) => s.vendedor_id === parseInt(filters.sellerId));
    }

    // Filtro Cliente
    if (filters.clientId) {
      result = result.filter((s: Sale) => s.cliente_id === parseInt(filters.clientId));
    }

    return result;
  }, [sales, filters]);

  const filteredClientsList = useMemo(() => {
    if (!clientSearchTerm) return [];
    const lower = clientSearchTerm.toLowerCase();
    return clients.filter((c: any) => 
      c.nome.toLowerCase().includes(lower) || 
      (c.documento && c.documento.includes(lower))
    ).slice(0, 5);
  }, [clientSearchTerm, clients]);

  const getClientName = (id?: number | null) => {
    if (!id) return "Consumidor Final";
    const client = clients.find((c: any) => c.id === id);
    return client ? client.nome : "Desconhecido";
  };

  const handleViewReceipt = async (sale: Sale) => {
    const items = await getSaleItems(sale.id!);
    const saleWithClientName = { ...sale, cliente_nome: getClientName(sale.cliente_id || null) };
    setSelectedSale(saleWithClientName);
    setSaleItems(items);
    setShowReceiptModal(true);
  };

  const handleOpenCancel = (sale: Sale) => {
    setSaleToCancel(sale);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async (id: number, reason: string, user: string, pass: string) => {
    const auth = await window.api.loginAttempt({ username: user, password: pass });
    if (!auth.success || auth.user.cargo !== "admin") {
      showAlert("Permissão negada.", "Erro", "error");
      return;
    }

    const res = await cancelSale(id, `${reason} (Autorizado por: ${auth.user.nome})`);
    if (res.success) {
      showAlert("Venda cancelada!", "Sucesso", "success");
      setShowCancelModal(false);
    } else {
      showAlert(res.error || "Erro ao cancelar", "Erro", "error");
    }
  };

  const handleSilentPrint = async () => {
    const receiptElement = document.getElementById("cupom-fiscal");
    if (!receiptElement) return showAlert("Cupom não encontrado.", "Erro", "error");
    
    const printer = await window.api.getConfig("impressora_padrao");
    const res = await window.api.printSilent(receiptElement.outerHTML, printer);
    if (res.success) showAlert("Impressão enviada com sucesso!", "Sucesso", "success");
    else showAlert("Erro: " + res.error, "Erro", "error");
  };

  const formatCurrency = (val: number) => `R$ ${val.toFixed(2).replace(".", ",")}`;

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 dark:bg-slate-950">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-800 dark:text-slate-100 tracking-tight flex items-center">
          <i className="fas fa-file-invoice-dollar mr-3 text-blue-600"></i> Histórico de Vendas
        </h1>
        <p className="text-gray-500 dark:text-slate-400 text-sm">Visualize e gerencie transações realizadas.</p>
      </div>

      <SalesFilters
        periodType={periodType}
        onPeriodChange={handlePeriodChange}
        startDate={filters.startDate}
        setStartDate={(val) => { setFilters({ ...filters, startDate: val }); setPeriodType("custom"); }}
        endDate={filters.endDate}
        setEndDate={(val) => { setFilters({ ...filters, endDate: val }); setPeriodType("custom"); }}
        sellerId={filters.sellerId}
        setSellerId={(val) => setFilters({ ...filters, sellerId: val })}
        sellers={sellers}
        clientSearchTerm={clientSearchTerm}
        setClientSearchTerm={setClientSearchTerm}
        clientId={filters.clientId}
        setClientId={(val) => setFilters({ ...filters, clientId: val })}
        showClientResults={showClientResults}
        setShowClientResults={setShowClientResults}
        filteredClients={filteredClientsList}
        onSelectClient={(c) => {
          setFilters({ ...filters, clientId: c ? String(c.id) : "" });
          setClientSearchTerm(c ? c.nome : "");
        }}
        onClear={() => {
          setPeriodType("custom");
          setFilters({ startDate: "", endDate: "", sellerId: "all", clientId: "" });
          setClientSearchTerm("");
        }}
      />

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <i className="fas fa-circle-notch fa-spin text-blue-500 text-4xl"></i>
        </div>
      ) : (
        <SalesHistoryTable
          sales={filteredSales}
          onView={handleViewReceipt}
          onCancel={handleOpenCancel}
          formatCurrency={formatCurrency}
          getClientName={getClientName}
        />
      )}

      {/* Modal de Recibo */}
      {showReceiptModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-gray-100 dark:bg-slate-800 p-6 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] w-full max-w-sm">
            <div className="overflow-y-auto pr-1 flex-1 custom-scrollbar">
              <div id="cupom-fiscal" className="bg-white dark:bg-slate-900 p-2 text-black">
                <CupomFiscal sale={selectedSale} items={saleItems} companyInfo={companyInfo} />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSilentPrint}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
              >
                <i className="fas fa-print mr-2"></i> Imprimir
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 py-3 rounded-xl font-bold hover:bg-gray-50 dark:bg-slate-950 transition border border-gray-200 dark:border-slate-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <CancelSaleModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        sale={saleToCancel}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
};

export default Recibos;
