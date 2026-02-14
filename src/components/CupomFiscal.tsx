// @ts-nocheck
import React from "react";
import dayjs from "dayjs";
import { LOGO_BASE64 as logo } from "../assets/logoBase64";

interface CupomFiscalProps {
  sale: any;
  items: any[];
}

const CupomFiscal = ({ sale, items }: CupomFiscalProps) => {
  if (!sale || !items) return null;

  const styles = {
    container: {
      backgroundColor: "#fff",
      color: "#000",
      fontFamily: "'Courier New', monospace",
      fontSize: "12px",
      padding: "10px",
      width: "100%",
      maxWidth: "300px",
      margin: "0 auto",
    },
    center: { textAlign: "center" },
    bold: { fontWeight: "bold" },
    borderBottom: {
      borderBottom: "1px dashed #000",
      marginBottom: "5px",
      paddingBottom: "5px",
    },
    table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }, // tableLayout fixed ajuda no controle de colunas
    tdItem: {
      padding: "4px 0",
      verticalAlign: "top",
      wordWrap: "break-word",
      overflowWrap: "break-word",
      whiteSpace: "normal", // Garante a quebra de linha
      width: "70%", // Dá mais espaço para o nome do produto
    },
    tdTotal: {
      padding: "4px 0",
      verticalAlign: "top",
      textAlign: "right",
      width: "30%",
    },
    textSmall: { fontSize: "10px", color: "#333" },
    cancelado: {
      border: "2px solid #000",
      padding: "5px",
      textAlign: "center",
      fontWeight: "bold",
      marginTop: "10px",
    },
  };

  const subtotal = sale.subtotal || 0;
  const acrescimo = sale.acrescimo_valor || sale.acrescimo || 0;
  const desconto = sale.desconto_valor || 0;
  const total = sale.total_final || 0;
  const data = sale.data_venda || new Date();
  const clienteObj = sale.cliente || null;
  const clienteNome = clienteObj?.nome || sale.cliente_nome || null;
  const listaPagamentos = sale.lista_pagamentos || sale.pagamentos || [];

  return (
    <div id="cupom-fiscal" style={styles.container}>
      {/* Cabeçalho */}
      <div style={{ ...styles.center, ...styles.borderBottom }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "5px",
          }}
        >
          <img src={logo} alt="logo" width={70} />
        </div>
        <h2 style={{ ...styles.bold, fontSize: "14px", margin: "0" }}>
          BARBA PNEUS
        </h2>
        <p style={{ margin: "2px 0" }}>Av. Brigadeiro Hilario Gurjão, 22</p>
        <p style={{ margin: "1px 0" }}>Jorge Teixeira 1 etapa - MANAUS/AM</p>
        <p style={{ margin: "1px 0" }}>Tel: (92) 99148-7719</p>
        <p style={{ ...styles.bold, margin: "5px 0 2px 0" }}>RECIBO DE VENDA</p>
        <p style={styles.textSmall}>{dayjs(data).format("DD/MM/YYYY HH:mm")}</p>
        <p style={styles.textSmall}>ID: #{sale.id}</p>
      </div>

      {/* Vendedor */}
      <div style={styles.borderBottom}>
        <p style={{ margin: "2px 0" }}>
          Vendedor: <span style={styles.bold}>{sale.vendedor_nome}</span>
        </p>
      </div>

      {/* Cliente */}
      {(clienteNome || (clienteObj && (clienteObj.telefone || clienteObj.documento))) && (
        <div style={styles.borderBottom}>
          {clienteNome && (
            <p style={{ margin: "1px 0" }}>
              Cliente: <b>{clienteNome}</b>
            </p>
          )}
          {clienteObj?.telefone && (
            <p style={{ margin: "1px 0" }}>Tel: {clienteObj.telefone}</p>
          )}
          {clienteObj?.documento && (
            <p style={{ margin: "1px 0" }}>Doc: {clienteObj.documento}</p>
          )}
        </div>
      )}

      {/* Tabela de Itens (Ajustada para quebrar linha) */}
      <table style={{ ...styles.table, ...styles.borderBottom }}>
        <thead>
          <tr>
            <th
              style={{
                ...styles.tdItem,
                textAlign: "left",
                fontWeight: "bold",
              }}
            >
              QTD x ITEM
            </th>
            <th style={{ ...styles.tdTotal, fontWeight: "bold" }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td style={styles.tdItem}>
                {/* Removido o substring para mostrar o nome todo */}
                {item.qty || item.quantidade} x{" "}
                {item.descricao || "Produto sem descrição"}
                <br />
                <span style={styles.textSmall}>
                  Unit: {(item.preco_venda || item.preco_unitario).toFixed(2)}
                </span>
              </td>
              <td style={styles.tdTotal}>
                {(
                  (item.qty || item.quantidade) *
                  (item.preco_venda || item.preco_unitario)
                ).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={styles.borderBottom}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Subtotal:</span>
          <span>{subtotal.toFixed(2)}</span>
        </div>
        {acrescimo > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Acréscimo:</span>
            <span>+ {acrescimo.toFixed(2)}</span>
          </div>
        )}
        {desconto > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Desconto:</span>
            <span>- {desconto.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "14px",
          fontWeight: "bold",
          margin: "5px 0",
        }}
      >
        <span>TOTAL:</span>
        <span>R$ {total.toFixed(2)}</span>
      </div>

      <div style={{ ...styles.borderBottom, margin: "10px 0" }}>
        <p style={{ margin: "0", fontWeight: "bold" }}>Pagamento:</p>
        {listaPagamentos.length > 0 ? (
          listaPagamentos.map((p, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
              }}
            >
              <span>
                {p.metodo} {p.detalhes && `(${p.detalhes})`}
              </span>
              <span>{Number(p.valor).toFixed(2)}</span>
            </div>
          ))
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "11px",
            }}
          >
            <span>{sale.forma_pagamento || "Não informado"}</span>
            <span>{total.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div style={{ ...styles.center, ...styles.textSmall }}>
        <p>Obrigado pela preferência!</p>
      </div>

      {sale.cancelada === 1 && (
        <div style={styles.cancelado}>VENDA CANCELADA</div>
      )}
    </div>
  );
};

export default CupomFiscal;
