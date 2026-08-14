import React from "react";

/**
 * Barra de skeleton (placeholder pulsante) para feedback de carregamento.
 * Ex.: <SkeletonBar className="h-4 w-2/3" />
 */
export const SkeletonBar = ({ className = "" }) => (
  <div className={`animate-pulse rounded bg-surface-200 ${className}`} aria-hidden="true" />
);

/**
 * Cartão de skeleton (para listas em cards no mobile).
 */
export const SkeletonCard = () => (
  <div className="bg-surface-100 border border-surface-200 rounded-2xl p-4 space-y-2.5">
    <SkeletonBar className="h-4 w-2/3" />
    <SkeletonBar className="h-3 w-full" />
    <SkeletonBar className="h-3 w-1/2" />
  </div>
);

export default SkeletonBar;
