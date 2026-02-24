import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "light" | "dark" | "glass";
  showText?: boolean;
  className?: string;
}

/**
 * Logo do sistema padronizada (Cubes icon)
 */
const Logo: React.FC<LogoProps> = ({
  size = "md",
  variant = "light",
  showText = false,
  className = "",
}) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-xl p-1.5 rounded-lg",
    md: "w-12 h-12 text-2xl p-2.5 rounded-xl",
    lg: "w-20 h-20 text-4xl p-4 rounded-2xl",
    xl: "w-24 h-24 text-5xl p-5 rounded-[2rem]",
  };

  const variantClasses = {
    light: "bg-blue-600 text-white shadow-lg shadow-blue-500/20",
    dark: "bg-gray-900 text-blue-500 shadow-xl",
    glass: "bg-white/10 text-white backdrop-blur-xl border border-white/20 shadow-2xl",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
    xl: "text-4xl",
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`flex items-center justify-center transition-all duration-500 hover:scale-110 ${sizeClasses[size]} ${variantClasses[variant]}`}
      >
        <i className="fas fa-cubes"></i>
      </div>
      {showText && (
        <span className={`font-bold tracking-tight ${textSizes[size]} ${variant === "dark" || variant === "glass" ? "text-white" : "text-gray-800"}`}>
          Sys<span className="text-blue-500">Control</span>
        </span>
      )}
    </div>
  );
};

// SVG Base64 da logo para uso em recibos térmicos (fallback)
export const LOGO_FALLBACK_BASE64 = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cGF0aCBmaWxsPSIjMDAwMDAwIiBkPSJNMzY4LjUgMzgwbDY1LjUgMzVMMzk2IDQ2N2wtNjQuMi0zNC4yIDM2LjctNTIuOHpNMTEuNSA0NzNsNjUuMy0zNS4xIDM2LjggNTIuOGwtNjQgMzQuMkwxMS41IDQ3M3pNMjU2IDBsNjggMzUuN2wtMzYuNyA1Mi44bC02NC4zLTM0LjNMMjU2IDB6TTI1NiAxNzQuNEwyNTMuMyA0NjhIMjU2bDIuNy0yOTMuNnoiLz48L3N2Zz4=`;

export default Logo;
