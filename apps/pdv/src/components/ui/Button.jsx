import React from "react";
import { Icon, faToLucide } from "./Icon";

/**
 * Button — alinhado ao SysControl Design System (tokens semânticos).
 * Uma ação `primary` por tela; o resto usa `outline`/`ghost`. `success` só para
 * finalizar venda; `destructive` para ações perigosas (cancelar/excluir).
 *
 * props:
 *  - variant: primary | secondary | outline | ghost | flat | destructive | success | link
 *  - size: sm | md | lg  (32 / 36 / 40px; ≥44px em telas de toque)
 *  - icon / iconEnd: classe FontAwesome sem o prefixo (ex.: "fa-plus")
 *  - loading, fullWidth, disabled, ...rest
 */
const VARIANTS = {
  primary:
    "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)]",
  secondary:
    "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--secondary-hover)]",
  outline:
    "bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-[var(--shadow-xs)] hover:bg-[var(--accent)]",
  ghost:
    "bg-transparent text-[var(--foreground)] hover:bg-[var(--accent)]",
  flat:
    "bg-[var(--primary-soft)] text-[var(--primary-soft-foreground)] hover:bg-[var(--primary-soft-hover)]",
  destructive:
    "bg-[var(--danger)] text-[var(--danger-foreground)] hover:bg-[var(--danger-hover)]",
  success:
    "bg-[var(--success)] text-[var(--success-foreground)] hover:bg-[var(--success-hover)]",
  link:
    "bg-transparent text-[var(--primary)] hover:underline px-0",
};

const SIZES = {
  sm: "h-8 px-3 text-[0.8125rem] gap-1.5 rounded-[var(--radius-sm)]",
  md: "h-9 px-4 text-[0.875rem] gap-2 rounded-[var(--radius-md)]",
  lg: "h-10 px-6 text-base gap-2 rounded-[var(--radius-md)]",
};

const ICON_PX = { sm: 14, md: 16, lg: 18 };

const Button = ({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconEnd,
  loading = false,
  fullWidth = false,
  disabled = false,
  type = "button",
  className = "",
  ...rest
}) => {
  const isDisabled = disabled || loading;
  const iconPx = ICON_PX[size] || ICON_PX.md;
  return (
    <button
      type={type}
      disabled={isDisabled}
      className={[
        "inline-flex select-none items-center justify-center whitespace-nowrap font-medium tracking-[0.02em]",
        "outline-none transition-colors active:scale-[0.97]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1",
        SIZES[size] || SIZES.md,
        VARIANTS[variant] || VARIANTS.primary,
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {loading ? (
        <Icon name="refresh-cw" size={iconPx} className="animate-spin" />
      ) : icon ? (
        <Icon name={faToLucide(icon)} size={iconPx} />
      ) : null}
      {children}
      {iconEnd && !loading ? <Icon name={faToLucide(iconEnd)} size={iconPx} /> : null}
    </button>
  );
};

export default Button;
