import { useState } from "react";
import { WriteOffSupplierFn } from "../../services/update/supplier/WriteOffSupplier";
import { AuthStore } from "../../stores/AuthStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { IWriteOffSupplier } from "../../interfaces/ISupplier";
import type { ICompraBaixaResponse } from "../../interfaces/IDailyMission";

export const useWriteOffSuppliers = () => {
  const queryClient = useQueryClient();
  const { token } = AuthStore((state) => state);
  const [errorMessage, setErrorMessage] = useState("");

  const mutateWriteOffSupplier = useMutation({
    mutationFn: ({
      itemId,
      supplierId,
      quantity,
      unity,
      unitaryValue,
      formaPagamentoId,
      observacao,
    }: IWriteOffSupplier): Promise<ICompraBaixaResponse> =>
      WriteOffSupplierFn(
        token,
        itemId,
        supplierId,
        quantity,
        unity,
        unitaryValue,
        formaPagamentoId,
        observacao,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyMissionItens"] });
      queryClient.invalidateQueries({ queryKey: ["dailyMission"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      setErrorMessage("Falha ao dar baixa no fornecedor.");
    },
  });

  return { mutateWriteOffSupplier, errorMessage };
};
