import { useQuery } from "@tanstack/react-query";
import { AuthStore } from "../../../stores/AuthStore";
import { fetchRolesFn } from "../../../services/fetch/roles/FetchRoles";

export const useFetchRoles = () => {
  const { token } = AuthStore((state) => state);

  const {
    data: roles = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["roles", token],
    queryFn: () => fetchRolesFn(token!),
    enabled: !!token,
  });

  return {
    roles,
    isLoading,
    isError,
    error,
  };
};
