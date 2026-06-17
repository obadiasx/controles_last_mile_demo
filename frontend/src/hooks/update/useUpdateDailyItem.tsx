import { useState } from "react";
import { AuthStore } from "../../stores/AuthStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateDailyitemFn } from "../../services/update/daily_mission/UpdateDailyItem";

export const useUpdateDailyItem = () => {
  const queryClient = useQueryClient();
  const { token } = AuthStore((state) => state);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const mutateUpdateDailyItem = useMutation({
    mutationFn: ({
      id,
      quantity,
      unity,
    }: {
      id: string;
      quantity: number;
      unity: string;
    }) =>
      updateDailyitemFn({ quantidade: quantity, unidade: unity, id }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyMissionItens"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      setErrorMessage("Falha ao atualizar item.");
    },
  });

  return { mutateUpdateDailyItem, errorMessage };
};
