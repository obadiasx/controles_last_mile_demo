import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { sincronizeProductsFn } from "../../services/sincronize/SIncronizeProducts";

export const useSincronizeProducts = () => {
  const [sincronizeError, setSincronizeError] = useState("");

  const mutateSincronizeProducts = useMutation({
    mutationFn: (token: string) => sincronizeProductsFn(token),
    onSuccess: (data) => {
      console.log("Sincronização de produtos bem-sucedida:", data);
      setSincronizeError("");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.log(message);
      setSincronizeError(
        `Falha na sincronização de produtos. Tente novamente.`
      );
    },
  });

  return { mutateSincronizeProducts, sincronizeError };
};
