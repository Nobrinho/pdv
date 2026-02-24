import { useQuery } from "@tanstack/react-query";
import { Person } from "../types";

export const usePeople = () => {
  const { data: people = [], isLoading, refetch } = useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const data = await window.api.getPeople();
      return data || [];
    },
  });

  const sellers = people.filter((p: Person) => p.cargo_nome === "Vendedor");
  const mechanics = people.filter((p: Person) => p.cargo_nome === "Trocador");

  return {
    people,
    sellers,
    mechanics,
    isLoading,
    loadPeople: refetch,
  };
};
