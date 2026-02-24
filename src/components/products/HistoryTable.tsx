import React from "react";
import dayjs from "dayjs";
import { ProductHistory } from "../../types";

interface HistoryTableProps {
  history: ProductHistory[];
  formatCurrency: (val?: number | null) => string;
}

const HistoryTable: React.FC<HistoryTableProps> = ({ history, formatCurrency }) => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden flex-1 flex flex-col border border-gray-200">
      <div className="overflow-y-auto flex-1 custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Data</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Produto</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Preço (Ant / Novo)</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Estoque (Ant / Novo)</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Tipo</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {history.map((item) => {
              const precoSubiu = item.preco_novo > (item.preco_antigo || 0);
              const estoqueSubiu = item.estoque_novo > (item.estoque_antigo || 0);
              const isNovo = item.tipo_alteracao === "cadastro_inicial";

              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {dayjs(item.data_alteracao).format("DD/MM/YY HH:mm")}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="font-bold text-gray-800">{item.descricao}</div>
                    <div className="text-xs text-gray-400 font-mono">{item.codigo}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {isNovo ? (
                      <span className="font-bold text-blue-700">{formatCurrency(item.preco_novo)}</span>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-gray-400 text-xs line-through">{formatCurrency(item.preco_antigo)}</span>
                        <i className={`fas fa-arrow-right text-[10px] ${precoSubiu ? "text-red-400" : item.preco_novo < (item.preco_antigo || 0) ? "text-green-500" : "text-gray-300"}`}></i>
                        <span className={`font-bold ${precoSubiu ? "text-red-600" : "text-gray-900"}`}>{formatCurrency(item.preco_novo)}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {isNovo ? (
                      <span className="font-bold text-blue-700">{item.estoque_novo}</span>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-gray-400 text-xs">{item.estoque_antigo}</span>
                        <i className={`fas fa-arrow-right text-[10px] ${estoqueSubiu ? "text-green-500" : "text-red-400"}`}></i>
                        <span className="font-bold text-gray-900">{item.estoque_novo}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      item.tipo_alteracao === "cadastro_inicial" ? "bg-blue-100 text-blue-800" :
                      item.tipo_alteracao === "reposicao_estoque" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {item.tipo_alteracao === "alteracao_preco" ? "Preço" :
                       item.tipo_alteracao === "reposicao_estoque" ? "Estoque" : "Novo"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {history.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-20 text-gray-400">
                  <i className="fas fa-search text-3xl mb-2 opacity-20"></i>
                  <p>Nenhuma alteração encontrada para os filtros aplicados.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryTable;
