import { useQuery } from "@tanstack/react-query";
import { fetchFormasPagamentoFn } from "../../../services/fetch/formasPagamento/FetchFormasPagamento";
import { AuthStore } from "../../../stores/AuthStore";

export const useFetchFormasPagamento = (enabled = true) => {
  const { token } = AuthStore((state) => state);

  const { data: formas = [], isLoading, error } = useQuery({
    queryKey: ["formas-pagamento"],
    queryFn: () => fetchFormasPagamentoFn(token!),
    enabled: Boolean(token) && enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return { formas, isLoading, error };
};
