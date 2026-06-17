import { useQuery } from "@tanstack/react-query";
import { AuthFn } from "../../services/auth/Auth";
import { AuthStore } from "../../stores/AuthStore";

export const useAuth = () => {
  const { token } = AuthStore((state) => state);

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => AuthFn(token!), 
    enabled: !!token,             
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    user: data,
    userId: data?.id ?? null,
    isLoading,
    isError,
    isAuthenticated: !!data,
  };
};
