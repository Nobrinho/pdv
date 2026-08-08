import React from "react";

/**
 * Card — container de superfície alinhado ao Design System (SysControl).
 * Substitui os vários `bg-surface-100 ... rounded-* shadow-sm border` espalhados
 * pelas telas por uma base única com tokens do DS (--card / --border).
 *
 * Props:
 * - padding: "none" | "sm" | "md" | "lg"  (default "md")
 * - radius:  "md" | "lg" | "xl"           (default "lg")
 * - as:      elemento/So componente raiz    (default "div")
 * - className: classes extras (layout: flex, space-y, larguras, etc.)
 */

const PADDING = { none: "", sm: "p-4", md: "p-5", lg: "p-6" };
const RADIUS = { md: "rounded-xl", lg: "rounded-2xl", xl: "rounded-3xl" };

export function Card({
  padding = "md",
  radius = "lg",
  as: Tag = "div",
  className = "",
  children,
  ...props
}) {
  return (
    <Tag
      className={`bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] shadow-sm ${RADIUS[radius]} ${PADDING[padding]} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

/**
 * Cabeçalho opcional para uso dentro do Card: título + ícone + ações à direita.
 * Uso: <CardHeader title="Ajustes" icon="fa-sliders" actions={<Button.../>} />
 */
export function CardHeader({ title, icon, actions, className = "" }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
        {icon && <i className={`fas ${icon} text-[var(--primary)]`} />}
        {title}
      </h2>
      {actions}
    </div>
  );
}

export default Card;
