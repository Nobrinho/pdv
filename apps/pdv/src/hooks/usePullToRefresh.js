// =============================================================
// usePullToRefresh — gesto "puxar para atualizar" em um container rolável.
// Só dispara quando a lista está no topo (scrollTop <= 0) e o dedo desce
// além do limiar. Mobile-first; em desktop (sem toque) fica inerte.
// =============================================================
import { useRef, useState, useCallback } from "react";

const THRESHOLD = 70; // px para disparar
const MAX = 90; // px máximo de "esticada"

export default function usePullToRefresh(onRefresh) {
  const scrollRef = useRef(null);
  const startY = useRef(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dragging, setDragging] = useState(false);

  const onTouchStart = useCallback(
    (e) => {
      if (!onRefresh || refreshing) return;
      const el = scrollRef.current;
      startY.current = el && el.scrollTop <= 0 ? e.touches[0].clientY : null;
    },
    [onRefresh, refreshing],
  );

  const onTouchMove = useCallback(
    (e) => {
      if (startY.current == null || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        if (!dragging) setDragging(true);
        setPull(Math.min(dy * 0.5, MAX));
      } else {
        setPull(0);
      }
    },
    [refreshing, dragging],
  );

  const onTouchEnd = useCallback(async () => {
    if (startY.current == null) {
      setDragging(false);
      return;
    }
    startY.current = null;
    setDragging(false);
    if (pull >= THRESHOLD && onRefresh) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  }, [pull, onRefresh]);

  return {
    scrollRef,
    pull,
    refreshing,
    dragging,
    threshold: THRESHOLD,
    handlers: onRefresh ? { onTouchStart, onTouchMove, onTouchEnd } : {},
  };
}
