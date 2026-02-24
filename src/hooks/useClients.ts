import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Client } from "../types";

export const useClients = () => {
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading, refetch } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const data = await window.api.getClients();
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: (clientData: any) => window.api.saveClient(clientData) as Promise<{ success: boolean; error?: string }>,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["clients"] });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => window.api.deleteClient(id) as Promise<{ success: boolean; error?: string }>,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["clients"] });
      }
    },
  });

  const saveClient = async (clientData: any) => {
    try {
      return await saveMutation.mutateAsync(clientData);
    } catch (error) {
      console.error(error);
      return { success: false, error: "Erro ao salvar cliente" };
    }
  };

  const deleteClient = async (id: number) => {
    try {
      return await deleteMutation.mutateAsync(id);
    } catch (error) {
      console.error(error);
      return { success: false, error: "Erro ao excluir cliente" };
    }
  };

  return {
    clients,
    isLoading,
    loadClients: refetch,
    saveClient,
    deleteClient,
  };
};
