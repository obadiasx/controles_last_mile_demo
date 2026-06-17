import { Add } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import DailyMissionModal from "../../components/Modal/DailyMissionModal/DailyMissionModal";
import { useSincronizeProducts } from "../../hooks/sincronize/useSincronizeProducts";
import { useDailyMission } from "../../hooks/fetch/dailyMission/useDailyMission";
import { AuthStore } from "../../stores/AuthStore";
import ErrorMessage from "../../components/Error/ErrorMessage";
import LoadingScreen from "../../components/Loading/LoadingScreen";
import { usePermissions } from "../../hooks/auth/usePermissions";
import { hasPermission } from "../../utils/permissions";
import type { IDailyMission } from "../../interfaces/IDailyMission";
import DailyMissionHeaderCard from "../../components/Cards/DailyMissionHeaderCard/DailyMissionHeaderCard";
import { useAuth } from "../../hooks/auth/useAuth";
import {
  SOLICITACAO_DIRETA_COMPRADOR_USERNAME,
  isSolicitacaoDiretaUsername,
  labelCompradorParaExibicao,
} from "../../config/solicitacaoDireta";

const BRAND = "#8542F9";

const DailyMission = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPedidoFornecedorPage =
    location.pathname === "/pedido-fornecedor" ||
    location.pathname.endsWith("/pedido-fornecedor");
  const { userId, isLoading: loadingAuth, isError } = useAuth();

  useEffect(() => {
    if (loadingAuth) return;

    if (isError || !userId) {
      navigate("/login", { replace: true });
    }
  }, [loadingAuth, isError, userId, navigate]);

  const {
    user,
    isLoading: isLoadingPermissios,
    error: errorOnPermissions,
  } = usePermissions();

  useEffect(() => {
    if (isLoadingPermissios) return;
    if (!user) return;

    if (user.role_name?.toLowerCase() === "comprador") {
      navigate("/ceagesp", { replace: true });
      return;
    }

    const podeLer = hasPermission(user, "solicitacoes_dia:ler");
    const podeAtualizar = hasPermission(user, "solicitacoes_dia:atualizar");
    const acessoPedidoDireto =
      isPedidoFornecedorPage && podeAtualizar;
    if (!podeLer && !acessoPedidoDireto) {
      if (hasPermission(user, "ceagesp:acessar")) {
        navigate("/ceagesp", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    }
  }, [user, isLoadingPermissios, navigate, isPedidoFornecedorPage]);

  const { token } = AuthStore((state) => state);

  const todayIsoSp = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

  const isComprador = user?.role_name?.toLowerCase() === "comprador";

  const [inputDate, setInputDate] = useState(todayIsoSp);
  const [queryDate, setQueryDate] = useState(todayIsoSp);

  const effectiveQueryDate = isComprador ? todayIsoSp : queryDate;
  const [modalHeader, setModalHeader] = useState<React.ReactNode>(null);
  const [selectedBuyer, setSelectedBuyer] = useState<string | null>(null);

  const { mutateSincronizeProducts } = useSincronizeProducts();

  const {
    data: dailyMission,
    isLoading: loadingMission,
    error: errorMission,
  } = useDailyMission(effectiveQueryDate, undefined);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    mutateSincronizeProducts.mutate(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const missionsFiltered = useMemo(() => {
    if (!dailyMission) return undefined;
    if (isPedidoFornecedorPage) {
      return dailyMission.filter((m) =>
        isSolicitacaoDiretaUsername(m.comprador?.username),
      );
    }
    // Solicitações do dia (/dailymission): comprador técnico exclusivo de /pedido-fornecedor
    return dailyMission.filter(
      (m) => !isSolicitacaoDiretaUsername(m.comprador?.username),
    );
  }, [dailyMission, isPedidoFornecedorPage]);

  const missionsByBuyer = useMemo(() => {
    if (!missionsFiltered) return {};

    const agrupado = missionsFiltered.reduce(
      (acc: Record<string, IDailyMission[]>, mission: IDailyMission) => {
        const buyerName = mission.comprador?.username || "sem_comprador";

        if (!acc[buyerName]) {
          acc[buyerName] = [];
        }

        acc[buyerName].push(mission);
        return acc;
      },
      {} as Record<string, IDailyMission[]>,
    );

    Object.values(agrupado).forEach((lista) => {
      lista.sort(
        (a, b) =>
          new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime(),
      );
    });

    return agrupado;
  }, [missionsFiltered]);

  const buyerNames = Object.keys(missionsByBuyer).sort();

  const canCreateDailySolicitation =
    user && hasPermission(user, "solicitacoes_dia:criar");
  const canSendDirectOrderEmail =
    user && hasPermission(user, "solicitacoes_dia:atualizar");

  const noMissionsForDay =
    !loadingMission &&
    Array.isArray(missionsFiltered) &&
    missionsFiltered.length === 0;

  const dateLabel = useMemo(() => {
    if (!effectiveQueryDate) return "";
    const [y, m, d] = effectiveQueryDate.split("-").map(Number);
    if (!y || !m || !d) return effectiveQueryDate;
    return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    });
  }, [effectiveQueryDate]);

  useEffect(() => {
    if (buyerNames.length === 0) {
      setSelectedBuyer(null);
      return;
    }

    if (!selectedBuyer || !buyerNames.includes(selectedBuyer)) {
      setSelectedBuyer(buyerNames[0]);
    }
  }, [buyerNames, selectedBuyer]);

  const aplicarDataFinanceiro = () => {
    setQueryDate(inputDate || todayIsoSp);
    setInputDate(inputDate === "" ? todayIsoSp : inputDate);
  };

  if (loadingMission || isLoadingPermissios) {
    return <LoadingScreen />;
  }

  if (errorMission) {
    return <ErrorMessage message="Falha ao carregar solicitações do dia!" />;
  }

  if (errorOnPermissions) {
    return <ErrorMessage message="Usuário não autenticado" />;
  }

  if (user?.role_name?.toLowerCase() === "comprador") {
    return <LoadingScreen />;
  }

  return (
    <>
      {modalHeader}

      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, mt: { xs: 6, md: 8 } }}>
        <Paper
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            overflow: "hidden",
            mb: 3,
          }}
        >
          <Box
            sx={{
              background: `linear-gradient(135deg, ${BRAND} 0%, #6b35cc 100%)`,
              px: { xs: 2, sm: 3 },
              py: { xs: 2, sm: 2.5 },
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              <Box>
                <Typography
                  variant="h5"
                  component="h1"
                  sx={{ color: "white", fontWeight: 700, letterSpacing: 0.2 }}
                >
                  {isPedidoFornecedorPage
                    ? "Pedido ao fornecedor (e-mail)"
                    : "Solicitações do dia"}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(255,255,255,0.88)", mt: 0.5, maxWidth: 520 }}
                >
                  {isComprador
                    ? "Lista de compras do dia atual. Para registrar compras no entreposto, use Ordens de Compra no menu."
                    : isPedidoFornecedorPage
                      ? "Monte ou abra a solicitação do dia, inclua os itens e use Enviar pedido por e-mail no card da lista para o fornecedor escolhido."
                      : "Escolha a data e o comprador para ver ou editar a lista de produtos da missão."}
                </Typography>
              </Box>

              {isComprador ? (
                <Chip
                  label={`Hoje · ${dateLabel}`}
                  sx={{
                    alignSelf: { xs: "flex-start", sm: "center" },
                    bgcolor: "rgba(255,255,255,0.2)",
                    color: "white",
                    fontWeight: 600,
                    border: "1px solid rgba(255,255,255,0.35)",
                  }}
                />
              ) : (
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  alignItems={{ xs: "stretch", sm: "flex-end" }}
                  sx={{
                    minWidth: { sm: 320 },
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: "rgba(255,255,255,0.14)",
                    border: "1px solid rgba(255,255,255,0.28)",
                    backdropFilter: "blur(2px)",
                  }}
                >
                  <Box sx={{ flex: 1, maxWidth: { sm: 220 } }}>
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        color: "rgba(255,255,255,0.92)",
                        fontWeight: 700,
                        mb: 0.5,
                        pl: 0.25,
                        letterSpacing: 0.2,
                      }}
                    >
                      Data da lista
                    </Typography>
                    <TextField
                      type="date"
                      value={inputDate}
                      onChange={(e) => setInputDate(e.target.value)}
                      size="small"
                      sx={{
                        bgcolor: "rgba(255,255,255,0.98)",
                        borderRadius: 1.25,
                        width: "100%",
                        "& .MuiInputBase-root": {
                          borderRadius: 1.25,
                          fontWeight: 600,
                        },
                        "& .MuiInputBase-input": {
                          color: "rgba(20,20,20,0.92)",
                        },
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "rgba(255,255,255,0.45)",
                        },
                        "& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline":
                          {
                            borderColor: "rgba(133,66,249,0.55)",
                          },
                      }}
                    />
                  </Box>
                  <Button
                    variant="contained"
                    onClick={aplicarDataFinanceiro}
                    sx={{
                      bgcolor: "rgba(255,255,255,0.98)",
                      color: BRAND,
                      fontWeight: 700,
                      borderRadius: 1.25,
                      border: "1px solid rgba(255,255,255,0.5)",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
                      "&:hover": {
                        bgcolor: "white",
                        boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
                      },
                      py: 1,
                    }}
                  >
                    Aplicar data
                  </Button>
                </Stack>
              )}
            </Stack>
          </Box>

          {buyerNames.length > 0 ? (
            <>
              <Divider />
              <Box sx={{ bgcolor: "grey.50", px: 1 }}>
                <Tabs
                  value={selectedBuyer}
                  onChange={(_, value) => setSelectedBuyer(value)}
                  variant="scrollable"
                  scrollButtons="auto"
                  aria-label="Compradores com solicitação nesta data"
                  TabIndicatorProps={{
                    sx: {
                      bgcolor: BRAND,
                      height: 3,
                      borderRadius: "3px 3px 0 0",
                    },
                  }}
                  sx={{
                    minHeight: 48,
                    "& .MuiTab-root": {
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      textTransform: "none",
                      minHeight: 48,
                    },
                    "& .Mui-selected": { color: BRAND },
                  }}
                >
                  {buyerNames.map((buyer) => (
                    <Tab
                      key={buyer}
                      value={buyer}
                      label={labelCompradorParaExibicao(buyer)}
                    />
                  ))}
                </Tabs>
              </Box>
            </>
          ) : null}
        </Paper>

        {selectedBuyer &&
          missionsByBuyer[selectedBuyer]?.map((mission: IDailyMission) => (
            <DailyMissionHeaderCard
              key={mission.id}
              mission={mission}
              queryDate={effectiveQueryDate}
              canSendDirectOrderEmail={Boolean(canSendDirectOrderEmail)}
              modoPedidoDireto={isPedidoFornecedorPage}
            />
          ))}
        {isPedidoFornecedorPage &&
        selectedBuyer &&
        (missionsByBuyer[selectedBuyer]?.length || 0) > 1 ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Exibindo {(missionsByBuyer[selectedBuyer] || []).length} compras diretas nesta data
            (mais recente primeiro).
          </Typography>
        ) : null}

        {noMissionsForDay && (
          <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
            {isPedidoFornecedorPage ? (
              <>
                Não há <strong>solicitação direta</strong> (
                {SOLICITACAO_DIRETA_COMPRADOR_USERNAME}) para o dia{" "}
                <strong>{dateLabel}</strong>.
                {canCreateDailySolicitation
                  ? " Use o botão abaixo para criar a nova lista."
                  : null}
              </>
            ) : (
              <>
                Não há solicitações cadastradas para o dia <strong>{dateLabel}</strong>.
                {canCreateDailySolicitation
                  ? " Use o botão abaixo para criar uma nova solicitação para um comprador."
                  : " Aguarde o financeiro criar a solicitação deste dia para o seu perfil."}
              </>
            )}
          </Alert>
        )}

        {canCreateDailySolicitation && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: 2,
              textAlign: "center",
              bgcolor: "grey.50",
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Financeiro
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<Add />}
              onClick={() =>
                setModalHeader(
                  <DailyMissionModal
                    onClose={() => setModalHeader(null)}
                    initialDate={inputDate}
                    modoPedidoDireto={isPedidoFornecedorPage}
                  />,
                )
              }
              sx={{
                bgcolor: BRAND,
                px: 3,
                py: 1.25,
                borderRadius: 2,
                fontWeight: 700,
                textTransform: "none",
                "&:hover": { bgcolor: "#6b35cc" },
              }}
            >
              {isPedidoFornecedorPage
                ? "Nova solicitação direta"
                : "Nova solicitação do dia"}
            </Button>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1.5 }}>
              {isPedidoFornecedorPage
                ? "Usa o comprador técnico fixo do pedido direto. Depois inclua produtos e envie por e-mail ao fornecedor."
                : "Cria a missão (data + comprador). Depois inclua produtos na lista abaixo."}
            </Typography>
          </Paper>
        )}
      </Container>
    </>
  );
};

export default DailyMission;
