import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { deleteDailyMissionItemFn } from "../../services/delete/DeleteDailyMissionItem";
import { AuthStore } from "../../stores/AuthStore";

export const useDeleteDailyMissionItem = () => {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string>("");
  const { token } = AuthStore((state) => state);

  const mutateDeleteDailyMissionItem = useMutation({
    mutationFn: (id: string) => deleteDailyMissionItemFn(token, id),
    onMutate: () => {
      setErrorMessage("");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyMissionItens"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(message);
    },
  });

  const clearDeleteError = () => setErrorMessage("");

  return { mutateDeleteDailyMissionItem, errorMessage, clearDeleteError };
};
