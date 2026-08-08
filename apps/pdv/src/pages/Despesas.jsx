import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { api } from "../services/api";
import { useAlert } from "../context/AlertSystem";
import { formatCurrency } from "../utils/format";
import Button from "../components/ui/Button";
import { Checkbox } from "../components/ui/Checkbox";

const PAYMENT_METHODS = [
  "Dinheiro",
  "Pix",
  "Cartão de Débito",
  "Cartão de Crédito",
  "Transferência",
  "Boleto",
  "Cheque",
  "Outros",
];

const emptyForm = {
  id: null,
  descricao: "",
  categoria: "Outros",
  valor: "",
  data_despesa: dayjs().format("YYYY-MM-DD"),
  forma_pagamento: "",
  recorrente: false,
  observacoes: "",
};

const Despesas = () => {
  const { showAlert, showConfirm } = useAlert();
  const [expenses, setExpenses] = useState([]);
  const [totals, setTotals] = useState({ total: 0, qtd: 0 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [filters, setFilters] = useState({
    startDate: dayjs().startOf("month").format("YYYY-MM-DD"),
    endDate: dayjs().endOf("month").format("YYYY-MM-DD"),
    categoria: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.expenses.list({
        startDate: filters.startDate,
        endDate: filters.endDate,
        categoria: filters.categoria || undefined,
      });
      setExpenses(result.expenses || []);
      setTotals(result.totals || { total: 0, qtd: 0 });
    } catch (error) {
      console.error(error);
      showAlert("Erro ao carregar despesas.", "Erro", "error");
    } finally {
      setLoading(false);
    }
  }, [filters, showAlert]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.expenses
      .categories()
      .then((c) => setCategories(c || []))
      .catch(() => setCategories([]));
  }, []);

  const resetForm = () => setForm(emptyForm);

  const editExpense = (expense) => {
    setForm({
      id: expense.id,
      descricao: expense.descricao || "",
      categoria: expense.categoria || "Outros",
      valor: String(expense.valor ?? ""),
      data_despesa: dayjs(Number(expense.data_despesa) || expense.data_despesa).format("YYYY-MM-DD"),
      forma_pagamento: expense.forma_pagamento || "",
      recorrente: !!expense.recorrente,
      observacoes: expense.observacoes || "",
    });
  };

  const save = async () => {
    if (!form.descricao.trim()) return showAlert("Informe a descrição.", "Atenção", "warning");
    const valor = Number(String(form.valor).replace(",", "."));
    if (!Number.isFinite(valor) || valor <= 0) return showAlert("Informe um valor maior que zero.", "Atenção", "warning");

    setSaving(true);
    try {
      const payload = { ...form, valor };
      const result = form.id ? await api.expenses.update(payload) : await api.expenses.create(payload);
      if (result.success) {
        showAlert(form.id ? "Despesa atualizada." : "Despesa registrada.", "Sucesso", "success");
        resetForm();
        await load();
      } else {
        showAlert(result.error || "Falha ao salvar.", "Erro", "error");
      }
    } catch (error) {
      showAlert(error.message || "Falha ao salvar despesa.", "Erro", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (expense) => {
    const ok = await showConfirm(`Excluir a despesa "${expense.descricao}"?`, "Excluir despesa");
    if (!ok) return;
    try {
      const result = await api.expenses.delete(expense.id);
      if (result.success) {
        if (form.id === expense.id) resetForm();
        await load();
      } else {
        showAlert(result.error || "Falha ao excluir.", "Erro", "error");
      }
    } catch (error) {
      showAlert(error.message || "Falha ao excluir.", "Erro", "error");
    }
  };

  const byCategory = useMemo(() => {
    const map = {};
    for (const e of expenses) map[e.categoria] = (map[e.categoria] || 0) + Number(e.valor || 0);
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  // Alinhado ao Design System (mesmos tokens do Input/FormField).
  const inputClass =
    "w-full rounded-lg border border-[var(--input)] bg-[var(--card)] text-[var(--foreground)] p-2.5 text-sm outline-none transition placeholder:text-[var(--muted-foreground)] hover:border-[var(--ring)]/60 focus:border-[var(--ring)] focus:ring-4 focus:ring-[var(--ring)]/20";

  return (
    <div className="h-full overflow-y-auto p-6 bg-surface-50">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-surface-800 tracking-tight flex items-center gap-3">
              <i className="fas fa-file-invoice-dollar text-primary-600"></i> Despesas da Loja
            </h1>
            <p className="text-sm text-surface-500 mt-1">
              Controle de saídas para o cálculo do lucro líquido.
            </p>
          </div>
        </header>

        {/* Cards resumo */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-surface-100 p-5 rounded-2xl border border-surface-200 shadow-sm">
            <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Total no período</span>
            <p className="text-2xl font-black text-red-600 mt-1">{formatCurrency(totals.total)}</p>
          </div>
          <div className="bg-surface-100 p-5 rounded-2xl border border-surface-200 shadow-sm">
            <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Lançamentos</span>
            <p className="text-2xl font-black text-surface-800 mt-1">{totals.qtd}</p>
          </div>
          <div className="bg-surface-100 p-5 rounded-2xl border border-surface-200 shadow-sm hidden md:block">
            <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Maior categoria</span>
            <p className="text-lg font-black text-surface-800 mt-1 truncate">
              {byCategory[0] ? `${byCategory[0][0]} · ${formatCurrency(byCategory[0][1])}` : "—"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário */}
          <div className="bg-surface-100 p-6 rounded-2xl border border-surface-200 shadow-sm h-fit">
            <h2 className="text-sm font-black text-surface-800 uppercase tracking-widest border-b border-surface-200 pb-3 mb-4">
              {form.id ? "Editar despesa" : "Nova despesa"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest">Descrição</label>
                <input className={inputClass} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Aluguel de julho" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest">Categoria</label>
                  <select className={inputClass} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                    {[...new Set([form.categoria, ...categories])].filter(Boolean).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest">Valor (R$)</label>
                  <input className={inputClass} inputMode="decimal" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="0,00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest">Data</label>
                  <input type="date" className={inputClass} value={form.data_despesa} onChange={(e) => setForm({ ...form, data_despesa: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest">Pagamento</label>
                  <select className={inputClass} value={form.forma_pagamento} onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })}>
                    <option value="">Selecione...</option>
                    {[...new Set([form.forma_pagamento, ...PAYMENT_METHODS])].filter(Boolean).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Checkbox
                label="Despesa recorrente (mensal)"
                labelClassName="text-xs font-bold text-surface-600"
                checked={form.recorrente}
                onChange={(e) => setForm({ ...form, recorrente: e.target.checked })}
              />
              <div>
                <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest">Observações</label>
                <textarea className={inputClass} rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="primary" icon={form.id ? "fa-save" : "fa-plus"} loading={saving} onClick={save} className="flex-1">
                  {form.id ? "Salvar" : "Adicionar"}
                </Button>
                {form.id && (
                  <Button variant="secondary" onClick={resetForm}>Cancelar</Button>
                )}
              </div>
            </div>
          </div>

          {/* Lista */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-surface-100 p-4 rounded-2xl border border-surface-200 shadow-sm flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest block">De</label>
                <input type="date" className={inputClass} value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest block">Até</label>
                <input type="date" className={inputClass} value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest block">Categoria</label>
                <select className={inputClass} value={filters.categoria} onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}>
                  <option value="">Todas</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-surface-100 rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-200/60 text-[10px] uppercase tracking-widest text-surface-500">
                  <tr>
                    <th className="text-left p-3">Descrição</th>
                    <th className="text-left p-3">Categoria</th>
                    <th className="text-left p-3">Data</th>
                    <th className="text-right p-3">Valor</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-t border-surface-200 hover:bg-surface-50">
                      <td className="p-3 font-bold text-surface-800">
                        {e.descricao}
                        {e.recorrente ? <i className="fas fa-sync-alt text-[10px] text-surface-400 ml-2" title="Recorrente"></i> : null}
                      </td>
                      <td className="p-3"><span className="text-xs font-bold bg-surface-200 rounded-lg px-2 py-1">{e.categoria}</span></td>
                      <td className="p-3 text-surface-500">{dayjs(Number(e.data_despesa) || e.data_despesa).format("DD/MM/YYYY")}</td>
                      <td className="p-3 text-right font-black text-red-600">{formatCurrency(e.valor)}</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button onClick={() => editExpense(e)} className="text-surface-400 hover:text-primary-600 px-2" title="Editar"><i className="fas fa-pen"></i></button>
                        <button onClick={() => remove(e)} className="text-surface-400 hover:text-red-500 px-2" title="Excluir"><i className="fas fa-trash"></i></button>
                      </td>
                    </tr>
                  ))}
                  {!loading && expenses.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-surface-400 font-bold">Nenhuma despesa no período.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Despesas;
