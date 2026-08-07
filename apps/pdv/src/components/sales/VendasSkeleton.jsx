import React from "react";
import { SkeletonBar } from "../ui/Skeleton";

/**
 * Skeleton da tela de Vendas (busca + carrinho + pagamento) exibido apenas na
 * primeira carga (sem cache). Espelha o layout real para evitar "pulo".
 */
const VendasSkeleton = () => (
  <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
    {/* Esquerda: busca + carrinho */}
    <div className="flex-1 flex flex-col gap-4">
      <div className="bg-surface-100 p-4 rounded-xl shadow-sm border border-surface-200 space-y-3">
        <div className="flex gap-4">
          <SkeletonBar className="h-11 flex-1" />
          <SkeletonBar className="h-11 flex-1" />
        </div>
        <SkeletonBar className="h-12 w-full" />
      </div>
      <div className="flex-1 bg-surface-100 rounded-xl shadow-sm border border-surface-200 p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBar key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>

    {/* Direita: pagamento (só desktop) */}
    <div className="hidden lg:flex lg:w-96 flex-col gap-4">
      <div className="bg-surface-100 rounded-xl shadow-sm border border-surface-200 p-5 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBar key={i} className="h-9 w-full" />
        ))}
      </div>
      <div className="flex-1 bg-surface-100 rounded-xl shadow-sm border border-surface-200 p-5 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBar key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  </div>
);

export default VendasSkeleton;
