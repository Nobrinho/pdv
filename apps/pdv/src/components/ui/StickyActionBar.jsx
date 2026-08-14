import React from "react";

/**
 * Barra de acao fixa no rodape (mobile), acima da bottom nav. Para a acao
 * principal da tela sempre visivel (ex.: "Cobrar" com o total).
 */
const StickyActionBar = ({ children }) => (
  <div
    className="lg:hidden fixed inset-x-0 z-[64] bg-surface-100/95 backdrop-blur border-t border-surface-200 px-4 py-3"
    style={{ bottom: "calc(3.75rem + env(safe-area-inset-bottom))" }}
  >
    {children}
  </div>
);

export default StickyActionBar;
