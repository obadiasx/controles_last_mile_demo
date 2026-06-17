import { useQuery } from "@tanstack/react-query";
import { AuthStore } from "../../../stores/AuthStore";
import { FetchDailyMissionItensFn } from "../../../services/fetch/daily_mission/FetchDailyMissionItens";

export const useDailyMissionItens = (id: string) => {
  const { token } = AuthStore((state) => state);

  const {
    data: dailyMissionItens,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["dailyMissionItens", id],
    queryFn: () => FetchDailyMissionItensFn(token, id!),
    enabled: !!token && !!id,
    refetchOnWindowFocus: false,
    retry: false,
  });

  return { dailyMissionItens, isLoading, error };
};
