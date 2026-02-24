import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Sale } from "../types";

export const useSales = () => {
  const queryClient = useQueryClient();

  const { data: sales = [], isLoading, refetch } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const data = await window.api.getSales();
      // Ordenar decrescente por data
      return (data || []).sort((a: Sale, b: Sale) => dayjs(b.data_venda).valueOf() - dayjs(a.data_venda).valueOf());
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (data: { vendaId: number; motivo: string }) => window.api.cancelSale(data) as Promise<{ success: boolean; error?: string }>,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["sales"] });
      }
    },
  });

  const cancelSale = async (id: number, reason: string) => {
    try {
      return await cancelMutation.mutateAsync({ vendaId: id, motivo: reason });
    } catch (error) {
      console.error(error);
      return { success: false, error: "Erro ao cancelar venda" };
    }
  };

  const getSaleItems = async (id: number) => {
    try {
      return await window.api.getSaleItems(id);
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  return {
    sales,
    isLoading,
    loadSales: refetch,
    cancelSale,
    getSaleItems,
  };
};
