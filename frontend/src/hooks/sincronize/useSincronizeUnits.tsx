import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthStore } from "../../stores/AuthStore";
import { useState } from "react";
import { sincronizeUnitsFn } from "../../services/sincronize/SincronzeUnits";

export const useSincronizeUnits = () => {
  const [sincronizeError, setSincronizeError] = useState("");
  const queryClient = useQueryClient();
  const { token } = AuthStore((state) => state);

  const mutateSincronizeUnits = useMutation({
    mutationFn: () => sincronizeUnitsFn(token),
    onSuccess: () => {
      setSincronizeError("");

      queryClient.invalidateQueries({
        queryKey: ["units"],
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.log(message);
      setSincronizeError("Falha na sincronização de unidades de medida.");
    },
  });

  return { mutateSincronizeUnits, sincronizeError };
};
