import { api } from "@api";

export const verifyPermissionsFn = async (token: string) => {
  const response = await api.get("/users/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};
