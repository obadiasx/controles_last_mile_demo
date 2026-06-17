import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { api } from "@api";
import { AuthStore } from "../../stores/AuthStore";
import { usePermissions } from "../../hooks/auth/usePermissions";
import { hasPermission } from "../../utils/permissions";
import LoadingScreen from "../../components/Loading/LoadingScreen";
import ErrorMessage from "../../components/Error/ErrorMessage";
import { labelStatusItemConferencia } from "../../utils/conferenceUi";

const STATUS_PENDENTE_DECISAO_FINANCEIRO = "PendenteDecisaoFinanceiro" as const;

interface PendenciaCompraItem {
  item_id: string;
  solicitacao_id: string;
  data_solicitacao: string;
  comprador_id?: string | null;
  comprador_nome: string;
  produto_codigo: number;
  produto_descricao: string;
  quantidade: number;
  unidade: string;
  observacao?: string | null;
}

interface PendenciaRecebimentoItem {
  pedido_id: number;
  item: number;
  fornecedor: string;
  produto: string;
  quantidade_esperada: number;
  quantidade_fisica: number;
  status_conferencia: string;
  cancelado: boolean;
  observacoes?: string | null;
}

interface PendenciasDiaResponse {
  data: string;
  total_pendencias_compra: number;
  total_pendencias_recebimento: number;
  pendencias_compra: PendenciaCompraItem[];
  pendencias_recebimento: PendenciaRecebimentoItem[];
}

const BRAND = "#8542F9";

const PendenciasDia = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token } = AuthStore((state) => state);
  const hoje = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
  const [dataConsulta, setDataConsulta] = useState(hoje);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const {
    user,
    isLoading: isLoadingPermissios,
    error: errorOnPermissions,
  } = usePermissions();

  const semAcesso = useMemo(() => {
    if (!user) return false;
    return !hasPermission(user, "solicitacoes_dia:ler");
  }, [user]);

  const {
    data,
    isLoading,
    error,
  } = useQuery<PendenciasDiaResponse, Error>({
    queryKey: ["pendencias-dia", dataConsulta, token],
    queryFn: async () => {
      const res = await api.get<PendenciasDiaResponse>("/pendencias-dia/", {
        params: { data: dataConsulta },
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    enabled: Boolean(token) && Boolean(dataConsulta),
    refetchOnWindowFocus: false,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["pendencias-dia"] });
  };

  const pendenciasRecebimentoOrdenadas = useMemo(() => {
    const list = data?.pendencias_recebimento ?? [];
    return [...list].sort((a, b) => {
      const ap =
        a.status_conferencia === STATUS_PENDENTE_DECISAO_FINANCEIRO ? 0 : 1;
      const bp =
        b.status_conferencia === STATUS_PENDENTE_DECISAO_FINANCEIRO ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return a.fornecedor.localeCompare(b.fornecedor, "pt-BR", {
        sensitivity: "base",
      });
    });
  }, [data?.pendencias_recebimento]);

  const cancelarMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/pendencias-dia/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      setMensagem("Pendência cancelada com sucesso.");
      refresh();
    },
  });

  const naoRepetirMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await api.post(
        `/pendencias-dia/${itemId}/nao-repetir`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
    },
    onSuccess: () => {
      setMensagem("Pendência marcada como não repetir.");
      refresh();
    },
  });

  const reagendarMutation = useMutation({
    mutationFn: async (params: { itemId: string; novaData: string }) => {
      await api.post(
        `/pendencias-dia/${params.itemId}/reagendar`,
        { nova_data: params.novaData },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    },
    onSuccess: () => {
      setMensagem("Pendência reagendada com sucesso.");
      refresh();
    },
  });

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [token, navigate]);

  if (!token) return null;

  if (isLoadingPermissios) return <LoadingScreen />;
  if (errorOnPermissions) return <ErrorMessage message="Usuário não autenticado." />;

  if (semAcesso) {
    return (
      <Container maxWidth="md" sx={{ mt: 10 }}>
        <Alert severity="error">Você não possui acesso ao painel de pendências.</Alert>
      </Container>
    );
  }

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorMessage message="Falha ao carregar pendências do dia." />;

  return (
    <Container maxWidth="lg" sx={{ py: 3, mt: { xs: 6, md: 8 } }}>
      <Paper
        elevation={0}
        sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, mb: 2 }}
      >
        <Box
          sx={{
            background: `linear-gradient(135deg, ${BRAND} 0%, #6b35cc 100%)`,
            color: "white",
            px: 3,
            py: 2,
          }}
        >
          <Typography variant="h5" fontWeight={700}>
            Painel de pendências do dia
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Sem repetição automática: o financeiro decide o que reagendar, cancelar ou não repetir.
          </Typography>
        </Box>
        <Divider />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ p: 2 }}>
          <TextField
            type="date"
            label="Data de fechamento"
            value={dataConsulta}
            onChange={(e) => setDataConsulta(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ maxWidth: 240, bgcolor: "white" }}
          />
          <Chip
            color="warning"
            label={`Não comprados: ${data?.total_pendencias_compra ?? 0}`}
            sx={{ fontWeight: 600 }}
          />
          <Chip
            color="info"
            label={`Não recebidos: ${data?.total_pendencias_recebimento ?? 0}`}
            sx={{ fontWeight: 600 }}
          />
        </Stack>
      </Paper>

      {mensagem ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMensagem(null)}>
          {mensagem}
        </Alert>
      ) : null}

      <Paper elevation={0} sx={{ p: 2, border: "1px solid", borderColor: "divider", mb: 2 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          O que não foi comprado
        </Typography>
        {(data?.pendencias_compra ?? []).length === 0 ? (
          <Typography color="text.secondary">
            Sem pendências de compra nesta data.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {data?.pendencias_compra.map((item) => (
              <Paper
                key={item.item_id}
                elevation={0}
                sx={{
                  p: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1.5,
                  bgcolor: "rgba(255,167,38,0.08)",
                }}
              >
                <Typography fontWeight={700}>
                  {item.produto_descricao} ({item.quantidade} {item.unidade})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Comprador: {item.comprador_nome} · Solicitação:{" "}
                  {new Date(item.data_solicitacao).toLocaleDateString("pt-BR")}
                </Typography>
                {item.observacao ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Obs.: {item.observacao}
                  </Typography>
                ) : null}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.25 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      reagendarMutation.mutate({
                        itemId: item.item_id,
                        novaData: new Date(
                          Date.now() + 24 * 60 * 60 * 1000,
                        ).toLocaleDateString("en-CA", {
                          timeZone: "America/Sao_Paulo",
                        }),
                      })
                    }
                    disabled={reagendarMutation.isPending}
                  >
                    Reagendar +1 dia
                  </Button>
                  <Button
                    size="small"
                    color="warning"
                    variant="outlined"
                    onClick={() => naoRepetirMutation.mutate(item.item_id)}
                    disabled={naoRepetirMutation.isPending}
                  >
                    Não repetir
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={() => cancelarMutation.mutate(item.item_id)}
                    disabled={cancelarMutation.isPending}
                  >
                    Cancelar
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper elevation={0} sx={{ p: 2, border: "1px solid", borderColor: "divider" }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          O que falta receber (conferência)
        </Typography>
        {(data?.pendencias_recebimento ?? []).length === 0 ? (
          <Typography color="text.secondary">
            Sem pendências de recebimento nesta data.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {pendenciasRecebimentoOrdenadas.map((item) => {
              const aguardaFinanceiro =
                item.status_conferencia === STATUS_PENDENTE_DECISAO_FINANCEIRO;
              const obs = (item.observacoes ?? "").trim();
              return (
                <Paper
                  key={`${item.pedido_id}-${item.item}`}
                  elevation={0}
                  sx={(theme) => ({
                    p: 1.25,
                    border: "1px solid",
                    borderRadius: 1.5,
                    ...(aguardaFinanceiro
                      ? {
                          borderColor: theme.palette.warning.main,
                          borderLeftWidth: 4,
                          borderLeftStyle: "solid",
                          borderLeftColor: theme.palette.warning.dark,
                          bgcolor: alpha(theme.palette.warning.main, 0.1),
                          boxShadow: `0 0 0 1px ${alpha(theme.palette.warning.main, 0.35)}`,
                        }
                      : { borderColor: "divider" }),
                  })}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    justifyContent="space-between"
                    sx={{ mb: obs ? 0.75 : 0 }}
                  >
                    <Typography fontWeight={600}>
                      {item.fornecedor} · {item.produto}
                    </Typography>
                    {aguardaFinanceiro ? (
                      <Chip
                        size="small"
                        color="warning"
                        label="Aguarda decisão financeiro"
                        sx={{ fontWeight: 700, alignSelf: { xs: "flex-start", sm: "center" } }}
                      />
                    ) : null}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Pedido {item.pedido_id} · Item {item.item} · Esperado{" "}
                    {item.quantidade_esperada} · Físico {item.quantidade_fisica} · Status{" "}
                    {labelStatusItemConferencia(item.status_conferencia)}
                  </Typography>
                  {obs ? (
                    <Typography variant="body2" sx={{ mt: 1, color: "text.primary" }}>
                      <strong>Observação do conferente:</strong> {obs}
                    </Typography>
                  ) : aguardaFinanceiro ? (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75 }} display="block">
                      Nenhuma observação registrada na conferência.
                    </Typography>
                  ) : null}
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>
    </Container>
  );
};

export default PendenciasDia;
