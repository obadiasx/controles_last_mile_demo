import axios from "axios";
import type { ILoginForm } from "../../interfaces/ILogin";
import { api } from "@api";

export const loginFn = async (data: ILoginForm) => {
  try {
    const response = await api.post(`/users/login`, data);
    if (response.status === 200) {
      return response.data;
    }
    if (response.status === 401) {
      throw new Error("Credenciais inválidas");
    }
    throw new Error("Resposta inesperada do servidor");
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const message = err.response?.data?.message || err.message || "Falha no login";
      throw new Error(message);
    }
    if (err instanceof Error) {
      throw new Error(err.message);
    }
    throw new Error("falha no login desconhecida");
  }
};




















// async (data: ILoginForm) => {
//       if (errors.username) {
//         console.log(errors.username.message);
//       }
//       if (errors.password) {
//         console.log(errors.password.message);
//       }

//       console.log("Enviando dados de login:", data);

//       const response = await axios.post(`${api}/users/login"`, data);
      
//     },
