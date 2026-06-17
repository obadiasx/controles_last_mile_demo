import { useQuery } from "@tanstack/react-query";
import { fetchDivergencesFn } from "../../../services/fetch/divergences/FetchDivergences";
import type { IDivergences } from "../../../interfaces/IDivergences";

export const useFetchDivergences = (token: string) => {
  const {
    data: divergences,
    isLoading,
    error,
  } = useQuery<IDivergences[], Error>({
    queryKey: ["divergences"],
    queryFn: () => fetchDivergencesFn(token),
    enabled: !!token,
    refetchOnWindowFocus: false,
  });

  return { divergences, isLoading, error };
};
