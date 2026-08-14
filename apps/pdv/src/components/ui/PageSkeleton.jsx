import React from "react";
import { SkeletonBar } from "./Skeleton";

/**
 * Skeleton de página para telas de relatório/dashboard: título + cards de KPI
 * + bloco de tabela. Substitui o spinner de página inteira.
 */
const PageSkeleton = ({ cards = 3, rows = 6 }) => (
  <div className="h-full space-y-5 bg-surface-50 p-4 md:p-6">
    <SkeletonBar className="h-7 w-56" />
    <div
      className={`grid grid-cols-2 gap-3 md:gap-4 ${
        cards >= 6 ? "md:grid-cols-3 lg:grid-cols-6" : "sm:grid-cols-3"
      }`}
    >
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="rounded-xl border border-surface-200 bg-surface-100 p-4">
          <SkeletonBar className="mb-2 h-3 w-20" />
          <SkeletonBar className="h-6 w-24" />
        </div>
      ))}
    </div>
    <div className="space-y-2.5 rounded-xl border border-surface-200 bg-surface-100 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBar key={i} className="h-4 w-full" />
      ))}
    </div>
  </div>
);

export default PageSkeleton;
