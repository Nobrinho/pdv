import React from "react";

/**
 * Barra de navegacao inferior (mobile/tablet). Fica fixa no rodape, na zona do
 * polegar. Aparece so em telas pequenas (lg:hidden); no desktop usa-se a sidebar.
 *
 * props:
 *  - items: [{ path, label, icon }]
 *  - currentPath
 *  - onNavigate(path)
 *  - onMore()  -> abre o menu completo (drawer)
 *  - accent    -> cor de destaque (tenant)
 */
const BottomNav = ({ items = [], currentPath, onNavigate, onMore, accent = "#4f46e5" }) => {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[65] bg-surface-100 border-t border-surface-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-safe">
      <div className="flex items-stretch justify-around">
        {items.map((item) => {
          const active = currentPath === item.path;
          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] transition active:scale-95"
              style={active ? { color: accent } : undefined}
            >
              <i className={`fas ${item.icon} text-lg ${active ? "" : "text-surface-400"}`}></i>
              <span className={`text-[10px] font-bold tracking-tight ${active ? "" : "text-surface-500"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
        <button
          onClick={onMore}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-surface-500 transition active:scale-95"
        >
          <i className="fas fa-ellipsis text-lg text-surface-400"></i>
          <span className="text-[10px] font-bold tracking-tight text-surface-500">Mais</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
