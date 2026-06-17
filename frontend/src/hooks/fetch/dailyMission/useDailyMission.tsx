import { useQuery } from "@tanstack/react-query";
import { FetchDailyMissionsFn } from "../../../services/fetch/daily_mission/FetchDaiyMissions";
import { AuthStore } from "../../../stores/AuthStore";

export function useDailyMission(queryDate: string, userId: string | undefined) {
  const { token } = AuthStore((state) => state);
  return useQuery({
    queryKey: [
      "dailyMission",
      queryDate,
      userId ?? "all", // admin = all
    ],
    queryFn: () =>
      FetchDailyMissionsFn(
        token,
        queryDate,
        userId, // undefined → backend retorna todos
      ),
    enabled: !!queryDate,
  });
}
