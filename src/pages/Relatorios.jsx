// @ts-nocheck
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable"; // Importação corrigida para Vite

const Relatorios = () => {
  // Dados brutos
  const [allSales, setAllSales] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [allPeople, setAllPeople] = useState([]);

  // Filtros
  const [startDate, setStartDate] = useState(
    dayjs().startOf("month").format("YYYY-MM-DD")
  );
  const [endDate, setEndDate] = useState(
    dayjs().endOf("month").format("YYYY-MM-DD")
  );
  const [selectedSeller, setSelectedSeller] = useState("all");

  // Dados Processados (Totais)
  const [metrics, setMetrics] = useState({
    faturamento: 0,
    custo: 0,
    maoDeObra: 0,
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
  }, [allSales, allServices, startDate, endDate, selectedSeller]);

  const loadData = async () => {
    const sales = await window.api.getSales();
    const services = await window.api.getServices();
    const people = await window.api.getPeople();

    setAllSales(sales);
    setAllServices(services);
    setAllPeople(people);
  };

  const processData = () => {
    // 1. Filtrar Vendas por Data e Vendedor
    let vendasFiltradas = allSales.filter((s) => {
      const sDate = dayjs(s.data_venda);
      const inDate =
        sDate.isAfter(dayjs(startDate).subtract(1, "day")) &&
        sDate.isBefore(dayjs(endDate).add(1, "day"));
      const isSeller =
        selectedSeller === "all" || s.vendedor_id === parseInt(selectedSeller);
      return inDate && isSeller;
    });

    // 2. Filtrar Serviços Avulsos por Data
    let servicosFiltrados = allServices.filter((s) => {
      const sDate = dayjs(s.data_servico);
      return (
        sDate.isAfter(dayjs(startDate).subtract(1, "day")) &&
        sDate.isBefore(dayjs(endDate).add(1, "day"))
      );
    });

    // 3. Calcular Métricas Financeiras
    let totalFat = 0;
    let totalCusto = 0;
    let totalMO_Vendas = 0;
    let totalMO_Avulsa = 0;
    let totalComissoes = 0;
    let totalDescontos = 0;

    // Processar Vendas
    const vendasProcessadas = vendasFiltradas.map((venda) => {
      const vendedor = allPeople.find((p) => p.id === venda.vendedor_id);
      const taxaComissao = vendedor?.comissao_fixa
        ? vendedor.comissao_fixa / 100
        : 0.3;

      // Calcular valores da venda
      // Subtotal é o valor bruto dos produtos
      const subtotalProdutos = venda.subtotal;

      // Calcular desconto
      let desconto = 0;
      if (venda.desconto_valor) {
        if (venda.desconto_tipo === "fixed") {
          desconto = venda.desconto_valor;
        } else {
          desconto = (subtotalProdutos * venda.desconto_valor) / 100;
        }
      }

      // Valor final dos produtos (sem MO)
      const valorFinalProdutos = subtotalProdutos - desconto;

      // Estimativa de Custo (60% do valor final dos produtos, ajustável)
      const custoEstimado = valorFinalProdutos * 0.6;

      // Lucro Base para comissão (Produtos - Custo)
      const lucroBase = valorFinalProdutos - custoEstimado;

      const comissao = lucroBase > 0 ? lucroBase * taxaComissao : 0;

      // Mão de obra desta venda
      let moVenda = 0;
      // Verifica se a MO foi salva como ajuste fixo ou percentual na venda antiga, ou no campo mao_de_obra novo
      if (venda.mao_de_obra) {
        moVenda = venda.mao_de_obra;
      }

      totalFat += valorFinalProdutos;
      totalCusto += custoEstimado;
      totalMO_Vendas += moVenda;
      totalComissoes += comissao;
      totalDescontos += desconto;

      return {
        ...venda,
        comissao_calculada: comissao,
        valor_final_produtos: valorFinalProdutos,
      };
    });

    // Processar Serviços Avulsos
    servicosFiltrados.forEach((serv) => {
      totalMO_Avulsa += serv.valor;
    });

    // 4. Agrupar Mão de Obra por Trocador
    const mapMO = {};

    // MO das Vendas
    vendasFiltradas.forEach((v) => {
      if (v.mao_de_obra > 0 && v.trocador_id) {
        if (!mapMO[v.trocador_id])
          mapMO[v.trocador_id] = { nome: v.trocador_nome, total: 0, qtd: 0 };
        mapMO[v.trocador_id].total += v.mao_de_obra;
        mapMO[v.trocador_id].qtd += 1;
      }
    });

    // MO dos Serviços Avulsos
    servicosFiltrados.forEach((s) => {
      if (s.trocador_id) {
        // Buscar nome do trocador se não vier no objeto (depende do join no backend, assumindo que vem)
        // Se o backend de serviços não trouxer o nome, buscamos na lista de pessoas
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
      comissoes: totalComissoes,
      lucro:
        totalFat +
        totalMO_Vendas +
        totalMO_Avulsa -
        totalCusto -
        totalComissoes,
    });
  };

  const formatCurrency = (val) => `R$ ${val?.toFixed(2).replace(".", ",")}`;

  // --- EXPORTAÇÃO PDF ---
  const exportPDF = () => {
    try {
      const doc = new jsPDF();

      // Título e Datas
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
      doc.text(`Gerado em: ${dayjs().format("DD/MM/YYYY HH:mm")}`, 14, 33);

      // Tabela de Resumo Financeiro
      autoTable(doc, {
        startY: 40,
        head: [
          [
            "Faturamento (Prod)",
            "Custos (Est.)",
            "Mão de Obra",
            "Comissões",
            "LUCRO LÍQUIDO",
          ],
        ],
        body: [
          [
            formatCurrency(metrics.faturamento),
            formatCurrency(metrics.custo),
            formatCurrency(metrics.maoDeObra),
            formatCurrency(metrics.comissoes),
            formatCurrency(metrics.lucro),
          ],
        ],
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185] },
        styles: { halign: "center" },
      });

      let finalY = doc.lastAutoTable.finalY || 40;

      // Tabela de Mão de Obra
      if (laborSummary.length > 0) {
        doc.text("Resumo de Mão de Obra (Trocadores)", 14, finalY + 15);
        autoTable(doc, {
          startY: finalY + 20,
          head: [["Responsável", "Qtd Serviços", "Valor Total"]],
          body: laborSummary.map((l) => [
            l.nome,
            l.qtd,
            formatCurrency(l.total),
          ]),
          theme: "striped",
        });
        finalY = doc.lastAutoTable.finalY;
      }

      // Tabela de Vendas Detalhadas
      doc.text("Detalhamento de Vendas", 14, finalY + 15);
      const tableData = filteredSales.map((v) => [
        dayjs(v.data_venda).format("DD/MM/YY"),
        v.vendedor_nome,
        `#${v.id}`,
        formatCurrency(v.total_final),
        formatCurrency(v.comissao_calculada),
      ]);

      autoTable(doc, {
        startY: finalY + 20,
        head: [["Data", "Vendedor", "ID", "Total Venda", "Comissão"]],
        body: tableData,
      });

      // Salvar Arquivo
      doc.save(`relatorio_${dayjs().format("YYYY-MM-DD_HH-mm")}.pdf`);
      alert("PDF gerado com sucesso! Verifique sua pasta de downloads.");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert(
        "Ocorreu um erro ao gerar o PDF. Verifique o console para mais detalhes."
      );
    }
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Relatórios Financeiros
        </h1>
        <button
          onClick={exportPDF}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center shadow-md transition transform active:scale-95"
        >
          <i className="fas fa-file-pdf mr-2"></i> Exportar PDF
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-wrap gap-4 items-end border border-gray-100">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
            Início
          </label>
          <input
            type="date"
            className="border rounded p-2 text-sm"
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
            className="border rounded p-2 text-sm"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="w-48">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
            Vendedor
          </label>
          <select
            className="border rounded p-2 text-sm w-full bg-white"
            value={selectedSeller}
            onChange={(e) => setSelectedSeller(e.target.value)}
          >
            <option value="all">Todos</option>
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

      {/* Cards de KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
          <p className="text-xs text-gray-500 font-bold uppercase">
            Faturamento (Prod)
          </p>
          <p className="text-xl font-bold text-gray-800">
            {formatCurrency(metrics.faturamento)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-400">
          <p className="text-xs text-gray-500 font-bold uppercase">
            Custos (Est.)
          </p>
          <p className="text-xl font-bold text-red-600">
            {formatCurrency(metrics.custo)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-400">
          <p className="text-xs text-gray-500 font-bold uppercase">
            Mão de Obra Total
          </p>
          <p className="text-xl font-bold text-orange-600">
            {formatCurrency(metrics.maoDeObra)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-purple-500">
          <p className="text-xs text-gray-500 font-bold uppercase">Comissões</p>
          <p className="text-xl font-bold text-purple-600">
            {formatCurrency(metrics.comissoes)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
          <p className="text-xs text-gray-500 font-bold uppercase">
            Lucro Líquido
          </p>
          <p className="text-2xl font-bold text-green-700">
            {formatCurrency(metrics.lucro)}
          </p>
        </div>
      </div>

      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Tabela de Vendas */}
        <div className="flex-1 bg-white rounded-xl shadow-md flex flex-col overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 text-sm">
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
                    Total Venda
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Comissão
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSales.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {dayjs(v.data_venda).format("DD/MM/YY HH:mm")}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {v.vendedor_nome}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-medium">
                      {formatCurrency(v.total_final)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-purple-600">
                      {formatCurrency(v.comissao_calculada)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabela de Mão de Obra */}
        <div className="w-1/3 bg-white rounded-xl shadow-md flex flex-col overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 text-sm">
            Resumo Mão de Obra (Trocadores)
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
