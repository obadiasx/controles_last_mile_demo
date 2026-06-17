import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { sincronizeSuppliersFn } from "../../services/sincronize/SincronizeSuppliers";
import { AuthStore } from "../../stores/AuthStore";

export const useSincronizeSuppliers = () => {
    const [sincronizeError, setSincronizeError] = useState("");
    const { token } = AuthStore((state) => state);

    const mutateSincronizeSuppliers = useMutation({
        mutationFn: () => sincronizeSuppliersFn(token),
        onSuccess: (data) => {
            console.log("Sincronização de fornecedores bem-sucedida:", data);
            setSincronizeError("");
        }
        ,
        onError: (error) => {
            const message = error instanceof Error ? error.message : String(error);
            console.log(message);
            setSincronizeError(`Falha na sincronização de fornecedores. Tente novamente.`);
        }
    });

    return { mutateSincronizeSuppliers, sincronizeError };
}