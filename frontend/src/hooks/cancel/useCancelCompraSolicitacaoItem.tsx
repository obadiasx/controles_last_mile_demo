import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { cancelCompraSolicitacaoItemFn } from "../../services/cancel/CancelCompraSolicitacaoItem";
import { AuthStore } from "../../stores/AuthStore";

export const useCancelCompraSolicitacaoItem = () => {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string>("");
  const { token } = AuthStore((state) => state);

  const mutateCancelCompra = useMutation({
    mutationFn: (itemId: string) =>
      cancelCompraSolicitacaoItemFn(token!, itemId),
    onMutate: () => {
      setErrorMessage("");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyMissionItens"] });
      queryClient.invalidateQueries({ queryKey: ["dailyMission"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(message);
    },
  });

  const clearCancelError = () => setErrorMessage("");

  return {
    mutateCancelCompra,
    isPending: mutateCancelCompra.isPending,
    errorMessage,
    clearCancelError,
  };
};
