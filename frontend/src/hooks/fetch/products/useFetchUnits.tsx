import { useQuery } from "@tanstack/react-query";
import { AuthStore } from "../../../stores/AuthStore";
import { FetchUnitsFn } from "../../../services/fetch/products/FetchUnits";

export const useFetchUnits = (codigo: number, editingUnity?: boolean) => {
  const { token } = AuthStore((state) => state);

  const {
    data: units = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["units", codigo],
    queryFn: () => FetchUnitsFn(codigo, token),
    enabled: Boolean(codigo) && editingUnity !== false,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  return { units, isLoading, error };
};
