import { useQuery } from "@tanstack/react-query";
import { AuthStore } from "../../stores/AuthStore";
import { verifyPermissionsFn } from "../../services/auth/VerifyPermissions";
import type { User } from "../../interfaces/IAuth";

export const usePermissions = () => {
  const { token } = AuthStore((state) => state);

  const {
    data: user,
    isLoading,
    isError,
    error,
  } = useQuery<User>({
    queryKey: ["auth", "permissions"],
    queryFn: () => verifyPermissionsFn(token!),
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    user,
    isLoading,
    isError,
    error,
    permissions: user?.permissions,
  };
};
