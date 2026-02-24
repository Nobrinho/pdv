import React from "react";
import { Product } from "../../types";

interface ProductTableProps {
  products: Product[];
  onAddStock: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}

const ProductTable: React.FC<ProductTableProps> = ({
  products,
  onAddStock,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-md flex-1 overflow-hidden border border-gray-100 flex flex-col">
      <div className="overflow-auto flex-1 custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-20">
                Cód.
              </th>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[150px]">
                Descrição
              </th>
              <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="hidden md:table-cell px-3 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                Custo
              </th>
              <th className="px-3 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                Venda
              </th>
              <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                Saldo
              </th>
              <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-28">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((p) => (
              <tr
                key={p.id}
                className={`hover:bg-gray-50 transition-colors ${
                  p.estoque_atual === 0 ? "bg-red-50" : ""
                }`}
              >
                <td className="px-3 py-3 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">
                  {p.codigo}
                </td>
                <td className="px-3 py-3 text-xs md:text-sm text-gray-700 break-words whitespace-normal font-medium">
                  {p.descricao}
                </td>

                <td className="px-3 py-3 whitespace-nowrap text-center">
                  <span
                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                      p.tipo === "usado"
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    {p.tipo === "usado" ? "USADO" : "NOVO"}
                  </span>
                </td>

                <td className="hidden md:table-cell px-3 py-3 whitespace-nowrap text-xs md:text-sm text-right text-gray-500">
                  R$ {p.custo.toFixed(2)}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-xs md:text-sm text-right font-medium text-gray-900">
                  R$ {p.preco_venda.toFixed(2)}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-center">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-4 font-bold rounded-full ${
                      (p.estoque_atual || 0) > 5
                        ? "bg-green-100 text-green-800"
                        : (p.estoque_atual || 0) > 0
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-200 text-red-900"
                    }`}
                  >
                    {p.estoque_atual}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-center text-sm font-medium">
                  <div className="flex justify-center items-center gap-1 md:gap-2">
                    <button
                      onClick={() => onAddStock(p)}
                      className="text-white bg-green-500 hover:bg-green-600 w-7 h-7 md:w-8 md:h-8 rounded transition shadow-sm flex items-center justify-center"
                      title="Entrada de Estoque"
                    >
                      <i className="fas fa-plus text-xs"></i>
                    </button>
                    <button
                      onClick={() => onEdit(p)}
                      className="text-white bg-blue-500 hover:bg-blue-600 w-7 h-7 md:w-8 md:h-8 rounded transition shadow-sm flex items-center justify-center"
                      title="Editar Produto"
                    >
                      <i className="fas fa-edit text-xs"></i>
                    </button>
                    <button
                      onClick={() => p.id && onDelete(p.id)}
                      className="text-white bg-red-500 hover:bg-red-600 w-7 h-7 md:w-8 md:h-8 rounded transition shadow-sm flex items-center justify-center"
                      title="Excluir Produto"
                    >
                      <i className="fas fa-trash text-xs"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-gray-500 flex flex-col items-center justify-center"
                >
                  <i className="fas fa-box-open text-3xl mb-2 opacity-30"></i>
                  <span className="text-sm">Nenhum produto encontrado.</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductTable;
