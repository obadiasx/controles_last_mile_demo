import { useQuery } from "@tanstack/react-query";
import type { IProduct } from "../../../interfaces/IProduct";
import { FetchProductsFn } from "../../../services/fetch/products/FetchProducts";
import { AuthStore } from "../../../stores/AuthStore";

export const useFetchProducts = (search: string) => {
  const { token } = AuthStore((state) => state);

  const {
    data: products,
    isLoading,
    error,
  } = useQuery<IProduct[], Error>({
    queryKey: ["products", token, search],
    queryFn: () => FetchProductsFn(token, search),
    enabled: !!token && search.trim().length > 2,
    refetchOnWindowFocus: false,
  });

  return { products, isLoading, error };
};
