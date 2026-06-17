import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthStore } from "../../stores/AuthStore";
import { useState } from "react";
import { updateConferenceOrderFn } from "../../services/update/conference_orders/UpdateConferenceOrder";
import type { IModalConferenceOrder } from "../../interfaces/IConference";

export const useUpdateConferenceOrder = () => {
  const { token } = AuthStore((state) => state);
  const [errorMessage, setErrorMessage] = useState("");
  const queryClient = useQueryClient();

  const mutateUpdate = useMutation({
    mutationFn: (data: IModalConferenceOrder) => {
      setErrorMessage("");
      return updateConferenceOrderFn({ ...data, token: data.token ?? token });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["conferenceOrders"] });
      void queryClient.invalidateQueries({ queryKey: ["pendencias-dia"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      setErrorMessage(message || "Falha ao atualizar o pedido. Tente novamente.");
      // 404: linha já não existe (ex.: excluída no banco) — lista em cache ainda mostra o card
      if (
        /não encontrado|nao encontrado|not found/i.test(message) ||
        message.includes("Item de Conferência")
      ) {
        void queryClient.invalidateQueries({ queryKey: ["conferenceOrders"] });
        void queryClient.invalidateQueries({ queryKey: ["conferenceFinanceQueue"] });
        void queryClient.invalidateQueries({ queryKey: ["conferenceFinanceOrder"] });
        void queryClient.invalidateQueries({ queryKey: ["pendencias-dia"] });
      }
    },
  });

  return { mutateUpdate, errorMessage };
};
