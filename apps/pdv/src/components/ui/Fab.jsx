import React from "react";

/**
 * Botao flutuante de acao (criar) — so no mobile (lg:hidden), acima da bottom nav.
 * No desktop as telas usam seus proprios botoes.
 */
const Fab = ({ onClick, icon = "fa-plus", label, accent = "#0f7391" }) => (
  <button
    onClick={onClick}
    className="lg:hidden fixed right-4 z-[66] flex items-center gap-2 text-white font-black rounded-full shadow-xl px-5 h-14 active:scale-95 transition"
    style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))", backgroundColor: accent }}
  >
    <i className={`fas ${icon} text-lg`}></i>
    {label && <span className="text-sm">{label}</span>}
  </button>
);

export default Fab;
