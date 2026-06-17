import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateDailyRequestItemFn } from "../../services/create/CreateDailyRequestItem";
import { AuthStore } from "../../stores/AuthStore";
import type { IInsertDailyMissionItem } from "../../interfaces/IDailyMission";
import { useState } from "react";

export const useCreateDailyRequestItem = () => {
  const { token } = AuthStore((state) => state);
  const [errorMessage, setErrorMessage] = useState("");
  const queryClient = useQueryClient();

  const mutateCreateDailyRequestItem = useMutation({
    mutationKey: ["dailyRequestItens"],
    mutationFn: (body: IInsertDailyMissionItem) =>
      CreateDailyRequestItemFn(token, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["dailyMissionItens"] });
      console.log(data);
    },
    onError: (error) => {
      setErrorMessage("falha na inclusão de item!");
      console.log(error);
    },
  });

  return { mutateCreateDailyRequestItem, errorMessage };
};
