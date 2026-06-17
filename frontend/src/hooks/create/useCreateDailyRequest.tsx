import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateDailyRequestFn } from "../../services/create/CreateDailyRequest";
import { AuthStore } from "../../stores/AuthStore";
import { useState } from "react";

export const useCreateDailylRequest = () => {
  const queryClient = useQueryClient();
  const token = AuthStore((state) => state.token);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const mutateCreateDailyRequest = useMutation({
    mutationFn: ({
      data,
      comprador_id,
      observacoes,
      permitir_multiplas_no_dia,
    }: {
      data: string;
      comprador_id: string;
      observacoes: string;
      permitir_multiplas_no_dia?: boolean;
    }) =>
      CreateDailyRequestFn(
        { data, comprador_id, observacoes, permitir_multiplas_no_dia },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyMission"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.log(message);
      setErrorMessage(`Falha na exclusão. Tente novamente.`);
    },
  });

  return { mutateCreateDailyRequest, errorMessage };
};
