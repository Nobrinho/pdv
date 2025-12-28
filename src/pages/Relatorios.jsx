// @ts-nocheck
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useAlert } from "../context/AlertSystem";

//

const Relatorios = () => {
  const [allSales, setAllSales] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [allPeople, setAllPeople] = useState([]);
  const showAlert = useAlert();

  // Estado para a comissão padrão
  const [defaultCommission, setDefaultCommission] = useState(0.3);

  const [startDate, setStartDate] = useState(
    dayjs().startOf("month").format("YYYY-MM-DD")
  );
  const [endDate, setEndDate] = useState(
    dayjs().endOf("month").format("YYYY-MM-DD")
  );
  const [selectedSeller, setSelectedSeller] = useState("all");

  const [metrics, setMetrics] = useState({
    faturamento: 0,
    custo: 0,
    maoDeObra: 0,
    acrescimos: 0,
    descontos: 0,
    comissoes: 0,
    lucro: 0,
  });

  const [filteredSales, setFilteredSales] = useState([]);
  const [laborSummary, setLaborSummary] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    processData();
  }, [
    allSales,
    allServices,
    startDate,
    endDate,
    selectedSeller,
    defaultCommission,
  ]);

  const loadData = async () => {
    try {
      const sales = await window.api.getSales();
      const services = await window.api.getServices();
      const people = await window.api.getPeople();
      const configComissao = await window.api.getConfig("comissao_padrao");

      setAllSales(sales);
      setAllServices(services);
      setAllPeople(people);

      if (configComissao) {
        setDefaultCommission(parseFloat(configComissao));
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const processData = () => {
    // 1. Filtrar
    let vendasFiltradas = allSales.filter((s) => {
      const sDate = dayjs(s.data_venda);
      const inDate =
        sDate.isAfter(dayjs(startDate).subtract(1, "day")) &&
        sDate.isBefore(dayjs(endDate).add(1, "day"));
      const isSeller =
        selectedSeller === "all" || s.vendedor_id === parseInt(selectedSeller);
      return inDate && isSeller;
    });

    let servicosFiltrados = allServices.filter((s) => {
      const sDate = dayjs(s.data_servico);
      return (
        sDate.isAfter(dayjs(startDate).subtract(1, "day")) &&
        sDate.isBefore(dayjs(endDate).add(1, "day"))
      );
    });

    // 2. Calcular Totais
    let totalFat = 0;
    let totalCusto = 0;
    let totalMO_Vendas = 0;
    let totalMO_Avulsa = 0;
    let totalAcrescimos = 0;
    let totalDescontos = 0;
    let totalComissoes = 0;

    const vendasProcessadas = vendasFiltradas.map((venda) => {
      const vendedor = allPeople.find((p) => p.id === venda.vendedor_id);
      const taxaComissao = vendedor?.comissao_fixa
        ? vendedor.comissao_fixa / 100
        : defaultCommission;

      const subtotalProdutos = venda.subtotal;

      let desconto = 0;
      if (venda.desconto_valor) {
        desconto =
          venda.desconto_tipo === "fixed"
            ? venda.desconto_valor
            : (subtotalProdutos * venda.desconto_valor) / 100;
      }

      const acrescimo = venda.acrescimo || 0;

      // Valor final dos produtos (para base de comissão)
      const valorFinalProdutos = subtotalProdutos - desconto;
      const custoReal = venda.custo_total_real || 0;
      const comissao =
        valorFinalProdutos > 0 ? valorFinalProdutos * taxaComissao : 0;
      let moVenda = venda.mao_de_obra || 0;

      if (!venda.cancelada) {
        totalFat += venda.total_final;
        totalCusto += custoReal;
        totalMO_Vendas += moVenda;
        totalAcrescimos += acrescimo;
        totalDescontos += desconto;
        totalComissoes += comissao;
      }

      return {
        ...venda,
        comissao_calculada: comissao,
        valor_final_produtos: valorFinalProdutos,
      };
    });

    servicosFiltrados.forEach((serv) => {
      totalMO_Avulsa += serv.valor;
      totalFat += serv.valor;
    });

    // 3. Resumo de Mão de Obra
    const mapMO = {};
    vendasFiltradas.forEach((v) => {
      if (!v.cancelada && v.mao_de_obra > 0 && v.trocador_id) {
        if (!mapMO[v.trocador_id])
          mapMO[v.trocador_id] = { nome: v.trocador_nome, total: 0, qtd: 0 };
        mapMO[v.trocador_id].total += v.mao_de_obra;
        mapMO[v.trocador_id].qtd += 1;
      }
    });
    servicosFiltrados.forEach((s) => {
      if (s.trocador_id) {
        let nomeTrocador = s.trocador_nome;
        if (!nomeTrocador) {
          const p = allPeople.find((p) => p.id === s.trocador_id);
          nomeTrocador = p ? p.nome : "Desconhecido";
        }
        if (!mapMO[s.trocador_id])
          mapMO[s.trocador_id] = { nome: nomeTrocador, total: 0, qtd: 0 };
        mapMO[s.trocador_id].total += s.valor;
        mapMO[s.trocador_id].qtd += 1;
      }
    });

    setLaborSummary(Object.values(mapMO));
    setFilteredSales(vendasProcessadas);

    setMetrics({
      faturamento: totalFat,
      custo: totalCusto,
      maoDeObra: totalMO_Vendas + totalMO_Avulsa,
      acrescimos: totalAcrescimos,
      descontos: totalDescontos,
      comissoes: totalComissoes,
      lucro: totalFat - totalCusto - totalComissoes,
    });
  };

  const formatCurrency = (val) => `R$ ${val?.toFixed(2).replace(".", ",")}`;

  // --- PDF ---
  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Relatório Gerencial", 14, 20);
      doc.setFontSize(10);
      doc.text(
        `Período: ${dayjs(startDate).format("DD/MM/YYYY")} a ${dayjs(
          endDate
        ).format("DD/MM/YYYY")}`,
        14,
        28
      );

      autoTable(doc, {
        startY: 40,
        head: [
          [
            "Faturamento",
            "(-) Custos",
            "(+) Acréscimos",
            "(-) Descontos",
            "(-) Comissões",
            "= LUCRO",
          ],
        ],
        body: [
          [
            formatCurrency(metrics.faturamento),
            formatCurrency(metrics.custo),
            formatCurrency(metrics.acrescimos),
            formatCurrency(metrics.descontos),
            formatCurrency(metrics.comissoes),
            formatCurrency(metrics.lucro),
          ],
        ],
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185] },
        styles: { halign: "center", fontSize: 9 },
      });

      let finalY = doc.lastAutoTable.finalY || 40;

      if (laborSummary.length > 0) {
        doc.text("Resumo de Mão de Obra", 14, finalY + 15);
        autoTable(doc, {
          startY: finalY + 20,
          head: [["Responsável", "Qtd", "Total"]],
          body: laborSummary.map((l) => [
            l.nome,
            l.qtd,
            formatCurrency(l.total),
          ]),
        });
        finalY = doc.lastAutoTable.finalY;
      }

      doc.text("Vendas Detalhadas", 14, finalY + 15);
      const tableData = filteredSales.map((v) => [
        dayjs(v.data_venda).format("DD/MM HH:mm"),
        v.vendedor_nome,
        formatCurrency(v.subtotal),
        v.acrescimo > 0 ? formatCurrency(v.acrescimo) : "-",
        v.desconto_valor > 0 ? formatCurrency(v.desconto_valor) : "-",
        formatCurrency(v.total_final),
        v.cancelada ? "CANCELADA" : formatCurrency(v.comissao_calculada),
      ]);

      autoTable(doc, {
        startY: finalY + 20,
        head: [
          [
            "Data",
            "Vendedor",
            "Subtotal",
            "Acrésc.",
            "Desc.",
            "Total",
            "Comissão",
          ],
        ],
        body: tableData,
        didParseCell: function (data) {
          if (
            data.row.raw[5] === "CANCELADA" ||
            data.row.raw[6] === "CANCELADA"
          ) {
            data.cell.styles.textColor = [255, 0, 0];
          }
        },
      });

      doc.save(`relatorio_financeiro.pdf`);
    } catch (error) {
      console.error(error);
      showAlert("Erro ao gerar PDF.", "error");
    }
  };

  // --- Componente de Card com Tooltip ---
  const StatCard = ({ title, value, color, tooltip }) => (
    <div
      className={`bg-white p-4 rounded-xl shadow-sm border-l-4 border-${color}-500 relative group cursor-help transition-transform hover:scale-[1.02]`}
    >
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-gray-800 text-white text-xs rounded p-2 z-50 text-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {tooltip}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
      </div>

      <p className="text-xs text-gray-500 font-bold uppercase flex items-center gap-1 border-b border-dashed border-gray-300 pb-1 mb-1 w-fit">
        {title} <i className="fas fa-info-circle text-[10px] opacity-50"></i>
      </p>
      <p
        className={`text-xl font-bold text-${
          color === "blue" || color === "gray" ? "gray-800" : color + "-600"
        }`}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Relatórios Financeiros
        </h1>
        <button
          onClick={exportPDF}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 shadow-md flex items-center gap-2 transition transform active:scale-95"
        >
          <i className="fas fa-file-pdf"></i> Exportar PDF
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-wrap gap-4 items-end border border-gray-100">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
            Início
          </label>
          <input
            type="date"
            className="border rounded p-2"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
            Fim
          </label>
          <input
            type="date"
            className="border rounded p-2"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="w-48">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
            Vendedor
          </label>
          <select
            className="border rounded p-2 bg-white"
            value={selectedSeller}
            onChange={(e) => setSelectedSeller(e.target.value)}
          >
            <option value="all">Todos Vendedores</option>
            {allPeople
              .filter((p) => p.cargo_nome === "Vendedor")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <StatCard
          title="Faturamento"
          value={metrics.faturamento}
          color="blue"
          tooltip="Valor total bruto recebido de Vendas e Serviços, incluindo Mão de Obra e Acréscimos."
        />
        <StatCard
          title="Custos (Real)"
          value={metrics.custo}
          color="red"
          tooltip="Soma do custo de aquisição dos produtos vendidos neste período."
        />
        <StatCard
          title="Mão de Obra"
          value={metrics.maoDeObra}
          color="orange"
          tooltip="Total arrecadado com serviços (incluso no Faturamento)."
        />
        <StatCard
          title="Acréscimos"
          value={metrics.acrescimos}
          color="green"
          tooltip="Taxas extras cobradas (incluso no Faturamento)."
        />
        <StatCard
          title="Descontos"
          value={metrics.descontos}
          color="red"
          tooltip="Total de descontos concedidos (já deduzido do Faturamento)."
        />
        <StatCard
          title="Comissões"
          value={metrics.comissoes}
          color="purple"
          tooltip="Valor devido aos vendedores sobre o faturamento de peças."
        />
      </div>

      {/* Lucro Líquido separado para destaque */}
      <div className="bg-green-50 p-4 rounded-xl shadow-sm border border-green-200 mb-6 flex justify-between items-center relative group cursor-help">
        {/* Tooltip Lucro */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-64 bg-gray-800 text-white text-xs rounded p-2 z-50 text-center shadow-lg">
          Faturamento Total - Custos dos Produtos - Comissões Pagas.
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>

        <div>
          <p className="text-sm text-green-700 font-bold uppercase flex items-center gap-2">
            Lucro Líquido Real <i className="fas fa-info-circle opacity-50"></i>
          </p>
          <p className="text-xs text-green-600">
            Resultado final após custos e comissões
          </p>
        </div>
        <p className="text-3xl font-bold text-green-700">
          {formatCurrency(metrics.lucro)}
        </p>
      </div>

      <div className="flex gap-6 flex-1 overflow-hidden">
        <div className="flex-1 bg-white rounded-xl shadow-md flex flex-col overflow-hidden">
          <div className="p-3 bg-gray-50 border-b font-bold text-gray-700 text-sm">
            Vendas Detalhadas
          </div>
          <div className="overflow-y-auto flex-1">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Data
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Vendedor
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Subtotal
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Acrésc.
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Desc.
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Comissão
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSales.map((v) => (
                  <tr
                    key={v.id}
                    className={`hover:bg-gray-50 ${
                      v.cancelada ? "bg-red-50 text-red-400" : ""
                    }`}
                  >
                    <td className="px-4 py-2 text-sm">
                      {dayjs(v.data_venda).format("DD/MM HH:mm")}
                    </td>
                    <td className="px-4 py-2 text-sm">{v.vendedor_nome}</td>
                    <td className="px-4 py-2 text-sm text-right">
                      {formatCurrency(v.subtotal)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-green-600">
                      {v.acrescimo > 0 ? formatCurrency(v.acrescimo) : "-"}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-red-500">
                      {v.desconto_valor > 0
                        ? formatCurrency(v.desconto_valor)
                        : "-"}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-bold">
                      {formatCurrency(v.total_final)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-purple-600">
                      {v.cancelada ? "-" : formatCurrency(v.comissao_calculada)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="w-1/3 bg-white rounded-xl shadow-md flex flex-col overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 text-sm">
            Resumo Mão de Obra
          </div>
          <div className="overflow-y-auto flex-1">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Nome
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    Qtd
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {laborSummary.map((l, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {l.nome}
                    </td>
                    <td className="px-4 py-2 text-sm text-center text-gray-500">
                      {l.qtd}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-bold text-orange-600">
                      {formatCurrency(l.total)}
                    </td>
                  </tr>
                ))}
                {laborSummary.length === 0 && (
                  <tr>
                    <td
                      colSpan="3"
                      className="p-4 text-center text-gray-400 text-xs"
                    >
                      Sem dados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;
