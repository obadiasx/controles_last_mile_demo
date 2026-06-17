import { useQuery } from "@tanstack/react-query";
import type { IConferenceOrder } from "../../../interfaces/IConference";
import { conferenceOrdersFn } from "../../../services/fetch/conference_orders/FetchConferenceOrders";

export const useFetchConferenceOrders = (
  token: string,
  supplierFilter: string,
  productFilter: string,
  incluirCancelados: boolean = false,
) => {
  const {
    data: conferenceOrders,
    isLoading,
    error: loadConferenceOrdersError,
    refetch,
  } = useQuery<IConferenceOrder[], Error>({
    queryKey: [
      "conferenceOrders",
      token,
      supplierFilter,
      productFilter,
      incluirCancelados,
    ],
    queryFn: async () =>
      conferenceOrdersFn(
        token,
        supplierFilter,
        productFilter,
        incluirCancelados,
      ),
    enabled: !!token,
    refetchOnWindowFocus: false,
    refetchInterval: 20000,
  });

  return { conferenceOrders, isLoading, loadConferenceOrdersError, refetch };
};
