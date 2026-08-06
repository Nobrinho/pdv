// =============================================================
// MobileReceipt.jsx — Recibo "digital" otimizado para telas de
// celular. Usado como PREVIEW no mobile; o CupomFiscal (termico)
// continua sendo a fonte de impressao/compartilhamento.
// =============================================================
import React from "react";
import dayjs from "dayjs";
import { useTenant } from "../context/TenantContext";
import { formatCurrency } from "../utils/format";

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const MobileReceipt = ({ sale, items = [] }) => {
  const { tenant } = useTenant();
  if (!sale) return null;

  const accent = tenant?.corPrimaria || "#2563eb";
  const subtotal = toNumber(sale.subtotal);
  const acrescimo = toNumber(sale.acrescimo_valor ?? sale.acrescimo);
  const desconto = toNumber(sale.desconto_valor);
  const total = toNumber(sale.total_final);
  const data = sale.data_venda || new Date();

  const clienteObj = sale.cliente || null;
  const clienteNome = clienteObj?.nome || sale.cliente_nome || null;
  const clienteDocumento = clienteObj?.documento || sale.cliente_documento || null;
  const clienteTelefone = clienteObj?.telefone || sale.cliente_telefone || null;

  const listaPagamentos = sale.lista_pagamentos || sale.pagamentos || [];
  const isCanceled = sale.cancelada === true || sale.cancelada === 1;

  return (
    <div className="w-full overflow-hidden rounded-2xl bg-white text-slate-900 shadow-sm">
      {/* Cabecalho */}
      <div className="px-5 py-4 text-white text-center" style={{ backgroundColor: accent }}>
        {tenant?.logoBase64 && (
          <img
            src={tenant.logoBase64}
            alt="logo"
            className="mx-auto mb-2 max-h-14 object-contain bg-white/90 rounded-lg p-1"
          />
        )}
        <div className="text-lg font-black leading-tight">{tenant?.nome || "Minha Loja"}</div>
        <div className="mt-1 text-[11px] font-bold uppercase tracking-widest opacity-90">
          Recibo de venda
        </div>
        <div className="mt-1 text-xs opacity-90">
          {dayjs(data).format("DD/MM/YYYY HH:mm")} · #{sale.id}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Vendedor / Cliente */}
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-slate-400 font-semibold">Vendedor</span>
            <span className="font-bold text-slate-800 text-right">{sale.vendedor_nome || "—"}</span>
          </div>
          {clienteNome && (
            <div className="flex justify-between gap-3">
              <span className="text-slate-400 font-semibold">Cliente</span>
              <span className="font-bold text-slate-800 text-right">{clienteNome}</span>
            </div>
          )}
          {clienteDocumento && (
            <div className="flex justify-between gap-3">
              <span className="text-slate-400 font-semibold">Documento</span>
              <span className="text-slate-700 text-right">{clienteDocumento}</span>
            </div>
          )}
          {clienteTelefone && (
            <div className="flex justify-between gap-3">
              <span className="text-slate-400 font-semibold">Telefone</span>
              <span className="text-slate-700 text-right">{clienteTelefone}</span>
            </div>
          )}
        </div>

        {/* Itens */}
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Itens
          </div>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {items.map((item, idx) => {
              const qty = toNumber(item.qty ?? item.quantidade);
              const unit = toNumber(item.preco_venda ?? item.preco_unitario);
              return (
                <div key={idx} className="flex items-start justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800 break-words">
                      {item.descricao || "Produto"}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {qty} × {formatCurrency(unit)}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-slate-900 whitespace-nowrap">
                    {formatCurrency(qty * unit)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Totais */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {acrescimo > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Acréscimo</span>
              <span>+ {formatCurrency(acrescimo)}</span>
            </div>
          )}
          {desconto > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Desconto</span>
              <span>- {formatCurrency(desconto)}</span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
            <span className="text-base font-black text-slate-800">TOTAL</span>
            <span className="text-2xl font-black" style={{ color: accent }}>
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Pagamentos */}
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Pagamento
          </div>
          <div className="space-y-1 text-sm">
            {listaPagamentos.length > 0 ? (
              listaPagamentos.map((p, i) => (
                <div key={i} className="flex justify-between text-slate-700">
                  <span>
                    {p.metodo} {p.detalhes ? `(${p.detalhes})` : ""}
                  </span>
                  <span className="font-semibold">{formatCurrency(toNumber(p.valor))}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between text-slate-700">
                <span>{sale.forma_pagamento || "Não informado"}</span>
                <span className="font-semibold">{formatCurrency(total)}</span>
              </div>
            )}
          </div>
        </div>

        {isCanceled && (
          <div className="rounded-xl border-2 border-red-500 bg-red-50 py-2 text-center text-sm font-black uppercase tracking-widest text-red-600">
            Venda cancelada
          </div>
        )}

        <div className="pt-1 text-center text-xs text-slate-400">Obrigado pela preferência!</div>
      </div>
    </div>
  );
};

export default MobileReceipt;
