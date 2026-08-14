import React, { forwardRef } from "react";
import dayjs from "dayjs";
import { formatCurrency } from "../../utils/format";

const sectionTitleStyle = {
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: 0,
  color: "#64748b",
  marginBottom: 8,
};

const cellHeaderStyle = {
  textAlign: "left",
  fontSize: 10,
  fontWeight: 800,
  color: "#475569",
  padding: "8px 10px",
  borderBottom: "1px solid #cbd5e1",
  backgroundColor: "#f8fafc",
};

const cellStyle = {
  fontSize: 12,
  color: "#0f172a",
  padding: "8px 10px",
  borderBottom: "1px solid #e2e8f0",
  verticalAlign: "top",
};

const BudgetDocument = forwardRef(({ budget, tenant }, ref) => {
  if (!budget) return null;

  const items = Array.isArray(budget.itens) ? budget.itens : [];

  return (
    <div
      ref={ref}
      style={{
        width: "100%",
        maxWidth: 900,
        margin: "0 auto",
        backgroundColor: "#ffffff",
        color: "#0f172a",
        padding: 24,
        borderRadius: 12,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 24,
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: "2px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          {tenant?.logoBase64 ? (
            <img
              src={tenant.logoBase64}
              alt={tenant.nome || "Logo da loja"}
              style={{
                width: 72,
                height: 72,
                objectFit: "contain",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                backgroundColor: "#fff",
                padding: 6,
              }}
            />
          ) : null}

          <div>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
                {tenant?.nome || "Minha Loja"}
              </div>
            {tenant?.subtitulo ? (
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>{tenant.subtitulo}</div>
            ) : null}
            <div style={{ fontSize: 12, lineHeight: 1.6, color: "#475569" }}>
              {tenant?.telefone ? <div>{tenant.telefone}</div> : null}
              {tenant?.endereco ? <div>{tenant.endereco}</div> : null}
              {tenant?.cidade ? <div>{tenant.cidade}</div> : null}
              {tenant?.documento ? <div>{tenant.documento}</div> : null}
            </div>
          </div>
        </div>

        <div style={{ minWidth: 220, textAlign: "right" }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#64748b" }}>
            Orcamento
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#2563eb", marginBottom: 8 }}>
            {budget.codigo}
          </div>
          <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
            <div>Emitido em {dayjs(Number(budget.data_criacao)).format("DD/MM/YYYY HH:mm")}</div>
            <div>
              Validade{" "}
              {budget.validade_em
                ? dayjs(Number(budget.validade_em)).format("DD/MM/YYYY")
                : "nao informada"}
            </div>
            <div>Status {budget.status}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <div>
          <div style={sectionTitleStyle}>Cliente</div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
              {budget.cliente_nome || "Consumidor final"}
            </div>
            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
              <div>{budget.cliente_documento || "Documento nao informado"}</div>
              <div>{budget.cliente_telefone || "Telefone nao informado"}</div>
            </div>
          </div>
        </div>

        <div>
          <div style={sectionTitleStyle}>Equipe</div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 13, marginBottom: 8 }}>
              <strong>Vendedor:</strong> {budget.vendedor_nome || "Nao informado"}
            </div>
            <div style={{ fontSize: 13 }}>
              <strong>Tecnico:</strong> {budget.trocador_nome || "Nao informado"}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={sectionTitleStyle}>Itens</div>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={cellHeaderStyle}>Codigo</th>
                <th style={cellHeaderStyle}>Descricao</th>
                <th style={{ ...cellHeaderStyle, textAlign: "center", width: 70 }}>Qtd</th>
                <th style={{ ...cellHeaderStyle, textAlign: "right", width: 110 }}>Unit.</th>
                <th style={{ ...cellHeaderStyle, textAlign: "right", width: 120 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const qty = Number(item.quantidade || item.qty || 0);
                const price = Number(item.preco_unitario || item.preco_venda || 0);
                return (
                  <tr key={`${item.id || item.produto_id || index}`}>
                    <td style={cellStyle}>{item.codigo_snapshot || item.codigo || "-"}</td>
                    <td style={cellStyle}>
                      <div style={{ fontWeight: 700 }}>{item.descricao_snapshot || item.descricao}</div>
                    </td>
                    <td style={{ ...cellStyle, textAlign: "center" }}>{qty}</td>
                    <td style={{ ...cellStyle, textAlign: "right" }}>{formatCurrency(price)}</td>
                    <td style={{ ...cellStyle, textAlign: "right", fontWeight: 700 }}>
                      {formatCurrency(price * qty)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 18 }}>
        <div>
          <div style={sectionTitleStyle}>Observacoes</div>
          <div
            style={{
              minHeight: 120,
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: 12,
              fontSize: 12,
              lineHeight: 1.6,
              color: "#334155",
              whiteSpace: "pre-wrap",
            }}
          >
            {budget.observacoes || "Nenhuma observacao registrada."}
          </div>
        </div>

        <div>
          <div style={sectionTitleStyle}>Resumo</div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14 }}>
            {[
              ["Subtotal", Number(budget.subtotal || 0)],
              ["Mao de obra", Number(budget.mao_de_obra || 0)],
              ["Acrescimo", Number(budget.acrescimo_valor || 0)],
              ["Desconto", Number(budget.desconto_valor || 0)],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12,
                  color: "#475569",
                  marginBottom: 8,
                }}
              >
                <span>{label}</span>
                <strong style={{ color: "#0f172a" }}>{formatCurrency(value)}</strong>
              </div>
            ))}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px dashed #cbd5e1",
                paddingTop: 12,
                marginTop: 12,
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 800 }}>Total</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#2563eb" }}>
                {formatCurrency(Number(budget.total_final || 0))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

BudgetDocument.displayName = "BudgetDocument";

export default BudgetDocument;
