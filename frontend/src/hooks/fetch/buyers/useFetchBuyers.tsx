import { useQuery } from "@tanstack/react-query";
import { FetchBuyersFn } from "../../../services/fetch/buyers/FetchBuyers";
import { AuthStore } from "../../../stores/AuthStore";

export const useFetchBuyers = () => {
  const { token } = AuthStore((state) => state);

  const { data, isLoading, error } = useQuery({
    queryKey: ["buyers"],
    queryFn: () => FetchBuyersFn(token),
    refetchOnWindowFocus: false,
  });

  return { data, isLoading, error };
};
