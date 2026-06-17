import { useState } from "react";
import { AuthStore } from "../../stores/AuthStore";
import { useMutation } from "@tanstack/react-query";
import { UpdateDailyNotes } from "../../services/update/daily_mission/UpdateDailyNotes";

export const useUpdateDailyNotes = () => {
  const { token } = AuthStore((state) => state);
  const [errorMessage, setErrorMessage] = useState("");

  const mutateUpdateNotes = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      UpdateDailyNotes(id, notes, token),

    onError: (error) => {
      const message =
        error instanceof Error ? error.message : String(error);
      console.error(message);
      setErrorMessage("Falha ao atualizar as notas diárias.");
    },
  });

  return { mutateUpdateNotes, errorMessage };
};
