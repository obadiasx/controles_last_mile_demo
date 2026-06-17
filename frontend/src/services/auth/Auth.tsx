import axios from "axios";
import { api } from "@api";

export const AuthFn = async (token: string) => {
  if (!token) {
    throw new Error("Token ausente");
  }

  try {
    const response = await api.get("/users/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      throw new Error(
        err.response?.data?.message || err.message || "Não autorizado"
      );
    }
    throw err;
  }
};
