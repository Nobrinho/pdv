// @ts-nocheck
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { useAlert } from "../context/AlertSystem";

const Clientes = () => {
  const { showAlert, showConfirm } = useAlert();

  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await window.api.getClients();
      setClients(data || []);
    } catch (error) {
      console.error(error);
      showAlert("Erro ao carregar clientes.", "Erro", "error");
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.telefone && c.telefone.includes(searchTerm)) ||
      (c.documento && c.documento.includes(searchTerm)),
  );

  // --- CRUD ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome.trim())
      return showAlert("Nome é obrigatório.", "Atenção", "warning");

    // CORREÇÃO: Criar um objeto limpo apenas com os campos que existem no banco
    // Isso evita enviar 'saldo_devedor' ou outros lixos que quebram o update
    const clientToSave = {
      nome: formData.nome,
      telefone: formData.telefone,
      documento: formData.documento,
      endereco: formData.endereco,
    };

    if (editingId) clientToSave.id = editingId;

    const result = await window.api.saveClient(clientToSave);

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
  };

  const handleDelete = async (id) => {
    const confirmou = await showConfirm(
      "Tem a certeza que deseja excluir este cliente?",
    );
    if (confirmou) {
      const result = await window.api.deleteClient(id);
      if (result.success) {
        loadData();
        showAlert("Cliente excluído.", "Sucesso", "success");
      } else {
        showAlert(result.error, "Não permitido", "warning");
      }
    }
  };

  const handleEdit = (client) => {
    // Popula o form garantindo que não venha null
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
    const data = await window.api.getClientDebts(client.id);
    setDebts(data);
    setShowDebtModal(true);
    setPaymentValue("");
  };

  const handlePayDebt = async (debtId, saldoDevedor) => {
    if (!paymentValue || parseFloat(paymentValue) <= 0)
      return showAlert("Digite um valor válido.");

    const valorPagar = parseFloat(paymentValue);
    // Margem de 1 centavo para arredondamento
    if (valorPagar > saldoDevedor + 0.01)
      return showAlert("Valor maior que a dívida.", "Aviso", "warning");

    const result = await window.api.payDebt({
      contaId: debtId,
      valorPago: valorPagar,
    });

    if (result.success) {
      showAlert("Pagamento registrado!", "Sucesso", "success");
      // Atualiza lista interna
      const updatedDebts = await window.api.getClientDebts(selectedClient.id);
      setDebts(updatedDebts);
      setPaymentValue("");
      loadData(); // Atualiza saldo total na lista principal
    } else {
      showAlert("Erro: " + result.error, "Erro", "error");
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val || 0);
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Clientes & Fiado</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md transition flex items-center"
        >
          <i className="fas fa-user-plus mr-2"></i> Novo Cliente
        </button>
      </div>

      {/* Busca */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100 flex items-center gap-2">
        <i className="fas fa-search text-gray-400 ml-2"></i>
        <input
          className="w-full border-none outline-none text-gray-700 placeholder-gray-400"
          placeholder="Buscar por nome, telefone ou documento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden flex-1 flex flex-col border border-gray-100">
        <div className="overflow-y-auto flex-1">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Contato
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Saldo Devedor
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredClients.map((c) => (
                <tr key={c.id} className="hover:bg-blue-50 transition">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {c.nome}
                    </div>
                    {c.documento && (
                      <div className="text-xs text-gray-500">{c.documento}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {c.telefone ? (
                      <span className="flex items-center gap-1">
                        <i className="fas fa-phone-alt text-xs"></i>{" "}
                        {c.telefone}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${c.saldo_devedor > 0.01 ? "bg-red-100 text-red-600 border border-red-200" : "bg-green-100 text-green-700 border border-green-200"}`}
                    >
                      {c.saldo_devedor > 0.01
                        ? formatCurrency(c.saldo_devedor)
                        : "EM DIA"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleOpenDebt(c)}
                        className="bg-indigo-100 text-indigo-700 p-2 rounded hover:bg-indigo-200 transition"
                        title="Ver Conta / Pagar"
                      >
                        <i className="fas fa-file-invoice-dollar w-4 h-4 flex items-center justify-center"></i>
                      </button>
                      <button
                        onClick={() => handleEdit(c)}
                        className="bg-blue-50 text-blue-600 p-2 rounded hover:bg-blue-100 transition"
                        title="Editar Dados"
                      >
                        <i className="fas fa-edit w-4 h-4 flex items-center justify-center"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="bg-red-50 text-red-500 p-2 rounded hover:bg-red-100 transition"
                        title="Excluir"
                      >
                        <i className="fas fa-trash w-4 h-4 flex items-center justify-center"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-gray-400">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL CADASTRO --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md transform transition-all scale-100">
            <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-4 flex justify-between items-center">
              <span>{editingId ? "Editar" : "Novo"} Cliente</span>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Nome Completo *
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Telefone
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                    value={formData.telefone}
                    onChange={(e) =>
                      setFormData({ ...formData, telefone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    CPF / Documento
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                    value={formData.documento}
                    onChange={(e) =>
                      setFormData({ ...formData, documento: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Endereço
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                  value={formData.endereco}
                  onChange={(e) =>
                    setFormData({ ...formData, endereco: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold text-sm shadow-md"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL CONTA CORRENTE (PAGAMENTOS) --- */}
      {showDebtModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {selectedClient.nome}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-500">
                    Saldo Devedor Total:
                  </span>
                  <span className="text-lg font-bold text-red-600">
                    {formatCurrency(selectedClient.saldo_devedor)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowDebtModal(false)}
                className="bg-gray-100 text-gray-500 hover:text-gray-700 p-2 rounded-full w-10 h-10 transition"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50 sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                      Data
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                      Descrição
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                      Valor Orig.
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                      Pago
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                      Restante
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-32">
                      Abater
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {debts.map((d) => {
                    const restante = d.valor_total - d.valor_pago;
                    const isQuitado = restante <= 0.01;
                    return (
                      <tr
                        key={d.id}
                        className={
                          isQuitado
                            ? "bg-green-50 opacity-60"
                            : "hover:bg-gray-50 transition"
                        }
                      >
                        <td className="px-4 py-3 text-gray-600">
                          {dayjs(d.data_lancamento).format("DD/MM/YY")}
                        </td>
                        <td className="px-4 py-3 text-gray-800 font-medium">
                          {d.descricao}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatCurrency(d.valor_total)}
                        </td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">
                          {formatCurrency(d.valor_pago)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-bold ${isQuitado ? "text-green-600" : "text-red-600"}`}
                        >
                          {isQuitado ? "QUITADO" : formatCurrency(restante)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {!isQuitado && (
                            <div className="flex items-center gap-2 justify-end">
                              <input
                                type="number"
                                className="w-20 border border-gray-300 rounded p-1.5 text-xs text-right focus:ring-1 focus:ring-green-500 outline-none"
                                placeholder="R$"
                                value={paymentValue}
                                onChange={(e) =>
                                  setPaymentValue(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handlePayDebt(d.id, restante);
                                }}
                              />
                              <button
                                onClick={() => handlePayDebt(d.id, restante)}
                                className="bg-green-500 text-white p-1.5 rounded hover:bg-green-600 transition shadow-sm"
                                title="Pagar"
                              >
                                <i className="fas fa-check"></i>
                              </button>
                            </div>
                          )}
                          {isQuitado && (
                            <i className="fas fa-check-circle text-green-500 text-lg"></i>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {debts.length === 0 && (
                    <tr>
                      <td
                        colSpan="6"
                        className="text-center py-10 text-gray-400"
                      >
                        Cliente sem débitos registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clientes;
