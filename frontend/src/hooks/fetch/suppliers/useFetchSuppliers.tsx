import { useQuery } from "@tanstack/react-query";
import { fetchSuppliersFn } from "../../../services/fetch/suppliers/FetchSuppliers";
import { AuthStore } from "../../../stores/AuthStore";

export const useFetchSuppliers = (search: string) => {
  const { token } = AuthStore((state) => state);

  const {
    data: suppliers = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["suppliers", search],
    queryFn: () => fetchSuppliersFn(token, search),
    enabled: Boolean(token) && search.length >= 2,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });
  return { suppliers, isLoading, error };
};
