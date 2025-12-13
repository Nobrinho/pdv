// @ts-nocheck
import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';

const Recibos = () => {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [sellers, setSellers] = useState([]);
  
  // Filtros
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    sellerId: ''
  });

  // Modal Recibo
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, sales]);

  const loadData = async () => {
    const salesData = await window.api.getSales();
    const peopleData = await window.api.getPeople();
    
    setSales(salesData);
    setFilteredSales(salesData);
    setSellers(peopleData.filter(p => p.cargo_nome === 'Vendedor'));
  };

  const applyFilters = () => {
    let result = sales;

    if (filters.startDate) {
        result = result.filter(s => dayjs(s.data_venda).isAfter(dayjs(filters.startDate).subtract(1, 'day')));
    }
    if (filters.endDate) {
        result = result.filter(s => dayjs(s.data_venda).isBefore(dayjs(filters.endDate).add(1, 'day')));
    }
    if (filters.sellerId && filters.sellerId !== 'all') {
        result = result.filter(s => s.vendedor_id === parseInt(filters.sellerId));
    }

    setFilteredServices(result);
  };
  
  // Corrigindo nome da função de estado no applyFilters (erro comum de copy/paste)
  const setFilteredServices = (data) => {
      setFilteredSales(data); // Usando o setter correto
  };

  const handleViewReceipt = async (sale) => {
      const items = await window.api.getSaleItems(sale.id);
      setSelectedSale(sale);
      setSaleItems(items);
      setShowModal(true);
  };

  const clearFilters = () => {
      setFilters({ startDate: '', endDate: '', sellerId: '' });
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Histórico de Vendas</h1>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Data Início</label>
                <input 
                    type="date" 
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                    value={filters.startDate}
                    onChange={e => setFilters({...filters, startDate: e.target.value})}
                />
            </div>
            <div className="flex-1 w-full">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Data Fim</label>
                <input 
                    type="date" 
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                    value={filters.endDate}
                    onChange={e => setFilters({...filters, endDate: e.target.value})}
                />
            </div>
            <div className="flex-1 w-full">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Vendedor</label>
                <select 
                    className="w-full border border-gray-300 rounded p-2 text-sm bg-white"
                    value={filters.sellerId}
                    onChange={e => setFilters({...filters, sellerId: e.target.value})}
                >
                    <option value="all">Todos</option>
                    {sellers.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
            </div>
            <div className="pb-0.5">
                <button onClick={clearFilters} className="text-sm text-blue-600 hover:underline px-4 py-2">
                    Limpar
                </button>
            </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden flex-1 flex flex-col">
        <div className="overflow-y-auto flex-1">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ação</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-blue-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">#{sale.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {dayjs(sale.data_venda).format('DD/MM/YYYY HH:mm')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                {sale.vendedor_nome}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                                R$ {sale.total_final.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button 
                                    onClick={() => handleViewReceipt(sale)}
                                    className="text-blue-600 hover:text-blue-900 bg-blue-100 px-3 py-1 rounded-full text-xs font-semibold transition"
                                >
                                    Ver Recibo
                                </button>
                            </td>
                        </tr>
                    ))}
                     {filteredSales.length === 0 && (
                        <tr><td colSpan="5" className="text-center py-10 text-gray-400">Nenhuma venda encontrada.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Modal de Recibo (Reutilizado) */}
      {showModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 print:bg-white print:p-0">
             <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm print:shadow-none print:w-full max-h-[90vh] overflow-y-auto">
                <div className="text-center border-b pb-4 mb-4 border-dashed border-gray-300">
                    <h2 className="text-2xl font-bold">RECIBO DE VENDA</h2>
                    <p className="text-sm text-gray-500">{dayjs(selectedSale.data_venda).format('DD/MM/YYYY HH:mm')}</p>
                    <p className="text-sm text-gray-500 font-mono mt-1">ID: #{selectedSale.id}</p>
                </div>
                
                <div className="space-y-1 mb-4 text-sm">
                    <div className="flex justify-between">
                        <span>Vendedor:</span>
                        <span className="font-bold">{selectedSale.vendedor_nome}</span>
                    </div>
                    {selectedSale.trocador_nome && (
                        <div className="flex justify-between">
                            <span>Serviço/M.O.:</span>
                            <span className="font-bold">{selectedSale.trocador_nome}</span>
                        </div>
                    )}
                </div>

                <table className="w-full text-sm mb-4">
                    <thead>
                        <tr className="border-b border-gray-300">
                            <th className="text-left py-1">Item</th>
                            <th className="text-center py-1">Qtd</th>
                            <th className="text-right py-1">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {saleItems.map((item, idx) => (
                            <tr key={idx}>
                                <td className="py-1">{item.descricao}</td>
                                <td className="text-center py-1">{item.quantidade}</td>
                                <td className="text-right py-1">{(item.preco_unitario * item.quantidade).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="border-t border-dashed border-gray-300 pt-4 space-y-1">
                     <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>{selectedSale.subtotal.toFixed(2)}</span>
                    </div>
                    {selectedSale.mao_de_obra > 0 && (
                        <div className="flex justify-between text-sm">
                            <span>Mão de Obra (+)</span>
                            <span>{selectedSale.mao_de_obra.toFixed(2)}</span>
                        </div>
                    )}
                    {selectedSale.desconto_valor > 0 && (
                        <div className="flex justify-between text-sm text-red-500">
                            <span>Desconto {selectedSale.desconto_tipo === 'percent' ? '(%)' : '(R$)'} (-)</span>
                            <span>
                                {selectedSale.desconto_tipo === 'percent' 
                                    ? ((selectedSale.subtotal * selectedSale.desconto_valor)/100).toFixed(2) 
                                    : selectedSale.desconto_valor.toFixed(2)
                                }
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between text-xl font-bold mt-2 pt-2 border-t border-gray-800">
                        <span>TOTAL</span>
                        <span>R$ {selectedSale.total_final.toFixed(2)}</span>
                    </div>
                    <div className="text-center text-xs text-gray-500 mt-4">
                        Pagamento: {selectedSale.forma_pagamento}
                    </div>
                </div>

                <div className="mt-8 flex gap-2 print:hidden">
                    <button onClick={() => window.print()} className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                        <i className="fas fa-print mr-2"></i> Imprimir
                    </button>
                    <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300">
                        Fechar
                    </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default Recibos;