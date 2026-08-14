import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { api } from "../services/api";
import { useAlert } from "../context/AlertSystem";
import { formatCurrency } from "../utils/format";
import Button from "../components/ui/Button";
import { Checkbox } from "../components/ui/Checkbox";
import { Badge } from "../components/ui/Badge";
import { Icon } from "../components/ui/Icon";

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
            <h1 className="text-lg md:text-xl font-semibold text-[var(--foreground)] tracking-tight flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
              <Icon name="wallet" size={20} className="text-[var(--primary)]" /> Despesas
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Controle de saídas para o cálculo do lucro líquido.
            </p>
          </div>
        </header>

        {/* Cards resumo */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-[var(--card)] p-5 rounded-[var(--radius-xl)] border border-[var(--border)] shadow-[var(--shadow-xs)]">
            <span className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[var(--tracking-caps)]">Total no período</span>
            <p className="text-2xl font-semibold text-[var(--money-negative)] mt-1" style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(totals.total)}</p>
          </div>
          <div className="bg-[var(--card)] p-5 rounded-[var(--radius-xl)] border border-[var(--border)] shadow-[var(--shadow-xs)]">
            <span className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[var(--tracking-caps)]">Lançamentos</span>
            <p className="text-2xl font-semibold text-[var(--foreground)] mt-1" style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>{totals.qtd}</p>
          </div>
          <div className="bg-[var(--card)] p-5 rounded-[var(--radius-xl)] border border-[var(--border)] shadow-[var(--shadow-xs)] hidden md:block">
            <span className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[var(--tracking-caps)]">Maior categoria</span>
            <p className="text-lg font-semibold text-[var(--foreground)] mt-1 truncate">
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
                <Button variant="primary" loading={saving} onClick={save} className="flex-1 gap-2">
                  <Icon name={form.id ? "save" : "plus"} size={16} /> {form.id ? "Salvar" : "Adicionar"}
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

            <div className="bg-[var(--card)] rounded-[var(--radius-xl)] border border-[var(--border)] shadow-[var(--shadow-xs)] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--content2)] text-[10px] uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)]">
                  <tr>
                    <th className="text-left px-[18px] py-[11px] font-semibold">Descrição</th>
                    <th className="text-left px-[18px] py-[11px] font-semibold">Categoria</th>
                    <th className="text-left px-[18px] py-[11px] font-semibold">Data</th>
                    <th className="text-right px-[18px] py-[11px] font-semibold">Valor</th>
                    <th className="px-[18px] py-[11px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-t border-[var(--border)] hover:bg-[var(--hover-surface)]">
                      <td className="px-[18px] py-3 font-semibold text-[var(--foreground)]">
                        <span className="inline-flex items-center gap-2">
                          {e.descricao}
                          {e.recorrente ? <Icon name="refresh-cw" size={11} className="text-[var(--muted-foreground)]" /> : null}
                        </span>
                      </td>
                      <td className="px-[18px] py-3"><Badge variant="neutral">{e.categoria}</Badge></td>
                      <td className="px-[18px] py-3 text-[var(--muted-foreground)]" style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>{dayjs(Number(e.data_despesa) || e.data_despesa).format("DD/MM/YYYY")}</td>
                      <td className="px-[18px] py-3 text-right font-semibold text-[var(--money-negative)]" style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(e.valor)}</td>
                      <td className="px-[18px] py-3 text-right whitespace-nowrap">
                        <button onClick={() => editExpense(e)} className="text-[var(--muted-foreground)] hover:text-[var(--primary)] px-2" title="Editar"><Icon name="pencil" size={15} /></button>
                        <button onClick={() => remove(e)} className="text-[var(--muted-foreground)] hover:text-[var(--danger)] px-2" title="Excluir"><Icon name="trash-2" size={15} /></button>
                      </td>
                    </tr>
                  ))}
                  {!loading && expenses.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-[var(--muted-foreground)] font-medium">Nenhuma despesa no período.</td></tr>
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
