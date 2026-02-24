import { useState, useEffect, useCallback } from "react";
import { ProductHistory } from "../types";
import { useAlert } from "../context/AlertSystem";

export const useProductHistory = () => {
  const [history, setHistory] = useState<ProductHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { showAlert } = useAlert();

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await window.api.getProductHistory();
      setHistory(data || []);
    } catch (error) {
      console.error(error);
      showAlert("Erro ao carregar histórico", "Erro", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    history,
    isLoading,
    loadHistory,
  };
};
