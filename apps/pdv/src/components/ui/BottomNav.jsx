import React from "react";
import { Icon } from "./Icon";

/**
 * Barra de navegacao inferior (mobile/tablet). Fica fixa no rodape, na zona do
 * polegar. Aparece so em telas pequenas (lg:hidden); no desktop usa-se a sidebar.
 *
 * props:
 *  - items: [{ path, label, lucide }]   (4 itens; o 5º "Mais" é fixo)
 *  - currentPath
 *  - onNavigate(path)
 *  - onMore()  -> abre o menu completo (drawer)
 *
 * Ícones do design system (Lucide). Ativo em var(--primary); inativo em
 * var(--muted-foreground).
 */
const BottomNav = ({ items = [], currentPath, onNavigate, onMore }) => {
  const itemCls = (active) =>
    `flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] transition active:scale-95 ${
      active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
    }`;

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[65] bg-[var(--background)] border-t border-[var(--border)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-safe">
      <div className="flex items-stretch justify-around">
        {items.map((item) => {
          const active = currentPath === item.path;
          return (
            <button key={item.path} onClick={() => onNavigate(item.path)} className={itemCls(active)}>
              <Icon name={item.lucide} size={22} strokeWidth={active ? 2.4 : 2} />
              <span className={`text-[10px] tracking-tight ${active ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
        <button onClick={onMore} className={itemCls(false)}>
          <Icon name="menu" size={22} />
          <span className="text-[10px] font-medium tracking-tight">Mais</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
