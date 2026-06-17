import { useMutation } from "@tanstack/react-query";
import { loginFn } from "../../services/auth/Login";
import { AuthStore } from "../../stores/AuthStore";
import { useState } from "react";
import { useNavigate } from "react-router";

export const useLogin = () => {
  const setToken = AuthStore((state) => state.setToken);
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");

  const mutateLogin = useMutation({
    mutationFn: loginFn,
    onSuccess: (data) => {
      console.log("Login bem-sucedido:", data.access_token);
      setToken(data.access_token);  
      navigate("/menuredirect");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.log(message);
      setErrorMessage(`Usuário ou senha inválidos. Tente novamente.`);
    },
  });

  return { mutateLogin, errorMessage };
};
