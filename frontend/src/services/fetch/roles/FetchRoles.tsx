import axios from "axios";
import { api } from "@api";

export interface RolePermission {
  id: string;
  name: string;
}

export const fetchRolesFn = async (token: string): Promise<RolePermission[]> => {
  try {
    const response = await api.get<RolePermission[]>("/users/roles", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const message =
        err.response?.data?.detail || err.message || "Erro ao listar roles";
      throw new Error(message);
    }
    throw new Error("Erro ao listar roles");
  }
};
