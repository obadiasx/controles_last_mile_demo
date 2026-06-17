import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Container, Paper, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router";
import { useEffect } from "react";
import { api } from "@api";
import { AuthStore } from "../../stores/AuthStore";
import { usePermissions } from "../../hooks/auth/usePermissions";
import { hasPermission } from "../../utils/permissions";
import LoadingScreen from "../../components/Loading/LoadingScreen";
import ErrorMessage from "../../components/Error/ErrorMessage";

type PendenciaEmailSidi = {
  pedido_id: number;
  tentativas: number;
  ultima_falha: string;
  primeiro_erro_em: string;
  ultima_tentativa_em: string;
};

const NotificacaoSidiPendencias = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token } = AuthStore((s) => s);
  const { user, isLoading: loadingPerm, error: errorPerm } = usePermissions();

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  const { data = [], isLoading, error } = useQuery<PendenciaEmailSidi[], Error>({
    queryKey: ["sidi-notificacao-pendencias", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const r = await api.get<PendenciaEmailSidi[]>(
        "/conferencia/financeiro/notificacoes-pendentes",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return r.data;
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (pedidoId: number) => {
      await api.post(
        `/conferencia/financeiro/notificacoes-pendentes/${pedidoId}/reenviar`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sidi-notificacao-pendencias"] });
    },
  });

  if (!token) return null;
  if (loadingPerm || isLoading) return <LoadingScreen />;
  if (errorPerm) return <ErrorMessage message="Usuário não autenticado." />;
  if (!user || !hasPermission(user, "solicitacoes_dia:atualizar")) {
    return (
      <Container maxWidth="md" sx={{ mt: 10 }}>
        <Alert severity="error">Você não possui acesso às pendências de e-mail SIDI.</Alert>
      </Container>
    );
  }
  if (error) return <ErrorMessage message="Falha ao carregar pendências de e-mail SIDI." />;

  return (
    <Container maxWidth="lg" sx={{ py: 3, mt: { xs: 6, md: 8 } }}>
      <Paper elevation={0} sx={{ p: 2, border: "1px solid", borderColor: "divider", mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>
          Pendências de envio de e-mail (SIDI)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Quando o envio falha por SMTP/configuração, o pedido fica listado aqui para novo envio.
        </Typography>
      </Paper>

      {data.length === 0 ? (
        <Alert severity="success">Sem pendências de e-mail no momento.</Alert>
      ) : (
        <Stack spacing={1.5}>
          {data.map((p) => (
            <Paper
              key={p.pedido_id}
              elevation={0}
              sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}
            >
              <Typography fontWeight={700}>Pedido {p.pedido_id}</Typography>
              <Typography variant="body2" color="text.secondary">
                Tentativas: {p.tentativas} · Última tentativa:{" "}
                {new Date(p.ultima_tentativa_em).toLocaleString("pt-BR")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Última falha: {p.ultima_falha}
              </Typography>
              <Button
                sx={{ mt: 1 }}
                variant="contained"
                onClick={() => retryMutation.mutate(p.pedido_id)}
                disabled={retryMutation.isPending}
              >
                Reenviar e-mail
              </Button>
            </Paper>
          ))}
        </Stack>
      )}
    </Container>
  );
};

export default NotificacaoSidiPendencias;
