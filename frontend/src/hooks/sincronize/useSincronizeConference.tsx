import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { sincronizeConferenceFn } from "../../services/sincronize/SincronizeConference";

export interface SincronizacaoConferenciaResponse {
  message: string;
  mensagem_resumo: string;
  detalhes: Record<string, unknown>;
}

export const useSincronizeConference = () => {
  const [sincronizeError, setSincronizeError] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (token: string) => sincronizeConferenceFn(token),
    retry: 2,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conferenceOrders"] });
      queryClient.invalidateQueries({ queryKey: ["pendencias-dia"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      setSincronizeError("Falha na sincronização. Tente novamente.");
    },
  });

  return {
    mutateSincronizeConference: mutation,
    sincronizeError,
    syncData: mutation.data as SincronizacaoConferenciaResponse | undefined,
  };
};
