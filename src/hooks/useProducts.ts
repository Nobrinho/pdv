import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Product } from "../types";

export const useProducts = () => {
  const queryClient = useQueryClient();

  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const data = await window.api.getProducts();
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: (product: any) => window.api.saveProduct(product) as Promise<{ success: boolean; error?: string }>,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => window.api.deleteProduct(id) as Promise<{ success: boolean; error?: string }>,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
      }
    },
  });

  const saveProduct = async (product: any) => {
    try {
      return await saveMutation.mutateAsync(product);
    } catch (error) {
      console.error(error);
      return { success: false, error: "Erro ao salvar produto" };
    }
  };

  const deleteProduct = async (id: number) => {
    try {
      return await deleteMutation.mutateAsync(id);
    } catch (error) {
      console.error(error);
      return { success: false, error: "Erro ao excluir produto" };
    }
  };

  const updateStock = async (id: number, quantityToAdd: number) => {
    const product = products.find((p: { id: number; }) => p.id === id);
    if (!product) return { success: false, error: "Produto não encontrado" };

    const updatedProduct = {
      ...product,
      estoque_atual: (product.estoque_atual || 0) + quantityToAdd,
    };

    return await saveProduct(updatedProduct);
  };

  return {
    products,
    isLoading,
    loadProducts: refetch,
    saveProduct,
    deleteProduct,
    updateStock,
  };
};
