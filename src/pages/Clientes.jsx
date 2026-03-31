// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import { useAlert } from "../context/AlertSystem";
import {
  applyCpfCnpjMask,
  applyNameMask,
  applyPhoneMask,
  validarDocumento,
} from "../utils/validators";
import { formatCurrency } from "../utils/format";
import { api } from "../services/api";
import DataTable from "../components/ui/DataTable";
import FormField from "../components/ui/FormField";
import Modal from "../components/ui/Modal";
import StatusBadge from "../components/ui/StatusBadge";

const Clientes = () => {
  const { showAlert, showConfirm } = useAlert();

  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal Cadastro
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    documento: "",
    endereco: "",
  });
  const [editingId, setEditingId] = useState(null);

  // Modal Dívida
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [debts, setDebts] = useState([]);
  const [paymentValue, setPaymentValue] = useState("");
  const [debtLoading, setDebtLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.clients.list();
      setClients(data || []);
    } catch (error) {
      console.error(error);
      showAlert("Erro ao carregar clientes.", "Erro", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    const lower = searchTerm.toLowerCase();
    const rawSearch = searchTerm.replace(/\D/g, "");

    return clients.filter((c) => {
      const docRaw = c.documento ? c.documento.replace(/\D/g, "") : "";
      const telRaw = c.telefone ? c.telefone.replace(/\D/g, "") : "";
      return (
        c.nome.toLowerCase().includes(lower) ||
        (c.documento && c.documento.toLowerCase().includes(lower)) ||
        (rawSearch && docRaw && docRaw.includes(rawSearch)) ||
        (c.telefone && c.telefone.includes(lower)) ||
        (rawSearch && telRaw && telRaw.includes(rawSearch))
      );
    });
  }, [searchTerm, clients]);

  // --- CRUD ---
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.nome.trim())
      return showAlert("Nome é obrigatório.", "Atenção", "warning");

    const clientToSave = {
      nome: formData.nome,
      telefone: formData.telefone,
      documento: formData.documento,
      endereco: formData.endereco,
    };

    if (editingId) clientToSave.id = editingId;

    try {
      const result = await api.clients.save(clientToSave);

      if (result.success) {
        setShowModal(false);
        resetForm();
        loadData();
        showAlert(
          editingId ? "Cliente atualizado!" : "Cliente cadastrado!",
          "Sucesso",
          "success",
        );
      } else {
        showAlert("Erro ao salvar: " + result.error, "Erro", "error");
      }
    } catch (error) {
      showAlert("Erro técnico ao salvar.", "Erro", "error");
    }
  };

  const handleDelete = async (id) => {
    const confirmou = await showConfirm(
      "Tem a certeza que deseja excluir este cliente?",
    );
    if (confirmou) {
      try {
        const result = await api.clients.delete(id);
        if (result.success) {
          loadData();
          showAlert("Cliente excluído.", "Sucesso", "success");
        } else {
          showAlert(result.error, "Não permitido", "warning");
        }
      } catch (error) {
        showAlert("Erro ao excluir cliente.", "Erro", "error");
      }
    }
  };

  const handleEdit = (client) => {
    setFormData({
      nome: client.nome || "",
      telefone: client.telefone || "",
      documento: client.documento || "",
      endereco: client.endereco || "",
    });
    setEditingId(client.id);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ nome: "", telefone: "", documento: "", endereco: "" });
    setEditingId(null);
  };

  // --- GESTÃO DE DÍVIDAS ---
  const handleOpenDebt = async (client) => {
    setSelectedClient(client);
    setDebtLoading(true);
    setShowDebtModal(true);
    setPaymentValue("");
    try {
      const data = await api.clients.debts(client.id);
      setDebts(data);
    } catch (error) {
      showAlert("Erro ao carregar débitos.", "Erro", "error");
    } finally {
      setDebtLoading(false);
    }
  };

  const handlePayDebt = async (debtId, saldoDevedor) => {
    if (!paymentValue || parseFloat(paymentValue) <= 0)
      return showAlert("Digite um valor válido.");

    const valorPagar = parseFloat(paymentValue);
    if (valorPagar > saldoDevedor + 0.01)
      return showAlert("Valor maior que a dívida.", "Aviso", "warning");

    try {
      const result = await api.clients.payDebt({
        contaId: debtId,
        valorPago: valorPagar,
      });

      if (result.success) {
        showAlert("Pagamento registrado!", "Sucesso", "success");
        const updatedDebts = await api.clients.debts(selectedClient.id);
        setDebts(updatedDebts);
        setPaymentValue("");
        loadData();
      } else {
        showAlert("Erro: " + result.error, "Erro", "error");
      }
    } catch (error) {
      showAlert("Erro ao processar pagamento.", "Erro", "error");
    }
  };

  const columns = [
    {
      key: "nome",
      label: "Nome",
      bold: true,
      format: (val, row) => (
        <div>
          <div className="font-bold text-gray-900">{val}</div>
          {row.documento && (
            <div className="text-[10px] text-gray-400 font-normal">
              {row.documento}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "telefone",
      label: "Contato",
      format: (val) =>
        val ? (
          <span className="flex items-center gap-1.5">
            <i className="fas fa-phone-alt text-[10px] text-gray-400"></i>
            {val}
          </span>
        ) : (
          "-"
        ),
    },
    {
      key: "saldo_devedor",
      label: "Saldo Devedor",
      align: "center",
      format: (val) => (
        <StatusBadge
          type={val > 0.01 ? "cancelada" : "usado"}
          label={val > 0.01 ? formatCurrency(val) : "EM DIA"}
        />
      ),
    },
    {
      key: "id",
      label: "Ações",
      align: "center",
      format: (_, row) => (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => handleOpenDebt(row)}
            className="bg-indigo-50 text-indigo-700 p-2 rounded-lg hover:bg-indigo-100 transition shadow-sm border border-indigo-100"
            title="Ver Conta / Pagar"
          >
            <i className="fas fa-file-invoice-dollar text-xs"></i>
          </button>
          <button
            onClick={() => handleEdit(row)}
            className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition shadow-sm border border-blue-100"
            title="Editar Dados"
          >
            <i className="fas fa-edit text-xs"></i>
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="bg-red-50 text-red-500 p-2 rounded-lg hover:bg-red-100 transition shadow-sm border border-red-100"
            title="Excluir"
          >
            <i className="fas fa-trash text-xs"></i>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            Clientes & Fiado
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Gerencie seu cadastro de clientes e controle de pendências
            financeiras.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 shadow-md transition-all active:scale-95 flex items-center gap-2 font-bold text-sm"
        >
          <i className="fas fa-user-plus"></i> Novo Cliente
        </button>
      </div>

      <div className="flex flex-col gap-4 flex-1 overflow-hidden">
        {/* Busca */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
          <FormField
            icon="fa-search"
            placeholder="Buscar por nome, telefone ou documento..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="max-w-xl"
          />
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-hidden">
          <DataTable
            columns={columns}
            data={filteredClients}
            loading={loading}
            emptyMessage="Nenhum cliente encontrado."
          />
        </div>
      </div>

      {/* --- MODAL CADASTRO --- */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "Editar Cliente" : "Novo Cliente"}
        icon="fa-user-plus"
        size="md"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button
              onClick={() => setShowModal(false)}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                !formData.nome.trim() ||
                (formData.documento && !validarDocumento(formData.documento)) ||
                (formData.endereco && formData.endereco.trim().length < 4)
              }
              className={`px-6 py-2.5 rounded-xl transition font-bold text-sm shadow-md ${
                !formData.nome.trim() ||
                (formData.documento && !validarDocumento(formData.documento)) ||
                (formData.endereco && formData.endereco.trim().length < 4)
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
              }`}
            >
              <i className="fas fa-save mr-2"></i>
              {editingId ? "Atualizar" : "Salvar Cliente"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField
            label="Nome Completo *"
            value={formData.nome}
            onChange={(val) =>
              setFormData({ ...formData, nome: applyNameMask(val) })
            }
            placeholder="Ex: João da Silva"
            error={
              formData.nome.trim().length > 0 && formData.nome.trim().length < 2
                ? "Nome muito curto"
                : null
            }
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Telefone"
              value={formData.telefone}
              onChange={(val) =>
                setFormData({ ...formData, telefone: applyPhoneMask(val) })
              }
              placeholder="(XX) XXXXX-XXXX"
              icon="fa-phone"
            />
            <FormField
              label="CPF / Documento"
              value={formData.documento}
              onChange={(val) =>
                setFormData({ ...formData, documento: applyCpfCnpjMask(val) })
              }
              placeholder="Opcional"
              icon="fa-id-card"
              maxLength={18}
              error={
                formData.documento && !validarDocumento(formData.documento)
                  ? "Documento inválido"
                  : null
              }
            />
          </div>

          <FormField
            label="Endereço"
            value={formData.endereco}
            onChange={(val) => setFormData({ ...formData, endereco: val })}
            placeholder="Opcional"
            icon="fa-map-marker-alt"
            error={
              formData.endereco && formData.endereco.trim().length < 4
                ? "Endereço muito curto"
                : null
            }
          />
        </div>
      </Modal>

      {/* --- MODAL CONTA CORRENTE (PAGAMENTOS) --- */}
      <Modal
        isOpen={showDebtModal}
        onClose={() => setShowDebtModal(false)}
        title={selectedClient?.nome || "Extrato de Débitos"}
        icon="fa-file-invoice-dollar"
        size="lg"
      >
        <div className="flex flex-col h-[60vh]">
          {selectedClient && (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center mb-4">
              <div className="text-sm font-medium text-blue-800 uppercase tracking-wider">
                Saldo Devedor Total
              </div>
              <div className="text-2xl font-black text-red-600">
                {formatCurrency(selectedClient.saldo_devedor)}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            <DataTable
              loading={debtLoading}
              columns={[
                {
                  key: "data_lancamento",
                  label: "Data",
                  format: (val) => dayjs(val).format("DD/MM/YY"),
                },
                { key: "descricao", label: "Descrição", bold: true },
                {
                  key: "valor_total",
                  label: "Original",
                  align: "right",
                  format: formatCurrency,
                },
                {
                  key: "valor_pago",
                  label: "Pago",
                  align: "right",
                  format: formatCurrency,
                },
                {
                  key: "restante",
                  label: "Restante",
                  align: "right",
                  format: (_, row) => {
                    const restante = row.valor_total - row.valor_pago;
                    const isQuitado = restante <= 0.01;
                    return (
                      <span
                        className={`font-bold ${isQuitado ? "text-green-600" : "text-red-600"}`}
                      >
                        {isQuitado ? "QUITADO" : formatCurrency(restante)}
                      </span>
                    );
                  },
                },
                {
                  key: "acoes",
                  label: "Abater",
                  align: "right",
                  format: (_, row) => {
                    const restante = row.valor_total - row.valor_pago;
                    if (restante <= 0.01)
                      return (
                        <i className="fas fa-check-circle text-green-500 text-lg"></i>
                      );
                    return (
                      <div className="flex items-center gap-2 justify-end">
                        <input
                          type="number"
                          className="w-24 border border-gray-300 rounded-lg p-1.5 text-xs text-right focus:ring-2 focus:ring-green-100 focus:border-green-500 outline-none transition-all"
                          placeholder="Valor R$"
                          value={paymentValue}
                          onChange={(e) => setPaymentValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              handlePayDebt(row.id, restante);
                          }}
                        />
                        <button
                          onClick={() => handlePayDebt(row.id, restante)}
                          className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition shadow-sm active:scale-90"
                          title="Pagar"
                        >
                          <i className="fas fa-check text-xs"></i>
                        </button>
                      </div>
                    );
                  },
                },
              ]}
              data={debts}
              emptyMessage="Cliente sem débitos registrados."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Clientes;
