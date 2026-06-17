import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Chip,
  Divider,
  Grid,
  TextField,
  InputAdornment,
  Typography,
  Button,
  Pagination,
  Stack,
  Snackbar,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  FormControlLabel,
  Switch,
  CircularProgress,
  Checkbox,
} from "@mui/material";
import ConferenceCard from "../../components/Cards/ConferenceCard/ConferenceCard";
import { Search } from "@mui/icons-material";
import { AuthStore } from "../../stores/AuthStore";
import { useNavigate } from "react-router";
import LoadingScreen from "../../components/Loading/LoadingScreen";
import ErrorMessage from "../../components/Error/ErrorMessage";
import {
  useSincronizeConference,
  type SincronizacaoConferenciaResponse,
} from "../../hooks/sincronize/useSincronizeConference";
import { useEffect, useState } from "react";
import { useFetchConferenceOrders } from "../../hooks/fetch/conferenceOrders/useFetchConferenceOrders";
import type { IConferenceOrder } from "../../interfaces/IConference";
import { useFetchDivergences } from "../../hooks/fetch/divergences/useFetchDivergences";
import { getDivergenceDesc } from "../../utils/getDvergenceDesc";
import { hasPermission } from "../../utils/permissions";
import { usePermissions } from "../../hooks/auth/usePermissions";
import { conferenceOrdersFn } from "../../services/fetch/conference_orders/FetchConferenceOrders";
import {
  aplicarFiltroFasePainel,
  resumirPainelConferencia,
  type FasePainelFiltro,
} from "../../utils/conferencePanel";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchFinanceQueueFn } from "../../services/fetch/conference_orders/FetchFinanceQueue";
import { fetchFinanceOrderSummaryFn } from "../../services/fetch/conference_orders/FetchFinanceOrderSummary";
import {
  applyFinanceLineActionFn,
  type FinanceLineAction,
} from "../../services/update/conference_orders/ApplyFinanceLineAction";
import {
  applyFinanceGlobalReleaseFn,
} from "../../services/update/conference_orders/ApplyFinanceGlobalRelease";
import type {
  IFinanceGlobalReleasePreview,
  ISidiEnvioManualRegistro,
  IFinanceOrderSummary,
} from "../../interfaces/IConference";
import {
  podeConfirmarLiberacaoGlobal,
  proximoPassoLiberacaoGlobal,
  type FinanceGlobalReleaseStep,
} from "../../utils/financeGlobalReleaseFlow";
import {
  dispararNotificacaoPedidoSidiFn,
  listRegistrosEnvioManualSidiFn,
  registrarEnvioManualSidiFn,
} from "../../services/admin/sidiNotificationAdmin";
import SmtpSidiAdminPanel from "../../components/Admin/SmtpSidiAdminPanel";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";

const Conference = () => {
  const navigate = useNavigate();
  const { token } = AuthStore((state) => state);
  const [supplierFilter, setSupplierFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [productFilter, setProductFilter] = useState<string>("");
  const [filterTrigger, setFilterTrigger] = useState<{
    supplier: string;
    product: string;
  }>({ supplier: "", product: "" });
  const [mostrarCancelados, setMostrarCancelados] = useState(false);
  const [filtroFaseRapida, setFiltroFaseRapida] =
    useState<FasePainelFiltro>("todas");
  const [financeiroDialogAberto, setFinanceiroDialogAberto] = useState(false);
  const [financeiroFornecedorFiltro, setFinanceiroFornecedorFiltro] = useState("");
  const [pedidoFinanceiroSelecionado, setPedidoFinanceiroSelecionado] = useState<
    number | null
  >(null);
  const [erroFinanceiroAcao, setErroFinanceiroAcao] = useState<string | null>(null);
  const [globalDialogAberto, setGlobalDialogAberto] = useState(false);
  const [globalPreview, setGlobalPreview] = useState<IFinanceGlobalReleasePreview | null>(null);
  const [globalStep, setGlobalStep] = useState<FinanceGlobalReleaseStep>("preview");
  const [globalCiencia, setGlobalCiencia] = useState(false);
  const [adminNotificacaoAberto, setAdminNotificacaoAberto] = useState(false);
  const [registroManualForm, setRegistroManualForm] = useState({
    protocolo: "",
    observacao: "",
  });
  const { mutateSincronizeConference, sincronizeError } =
    useSincronizeConference();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [syncMensagem, setSyncMensagem] = useState<string | null>(null);
  const [alertaFiltro, setAlertaFiltro] = useState<string | null>(null);
  const [confirmacaoFornecedorAberta, setConfirmacaoFornecedorAberta] =
    useState(false);
  const [fornecedoresCandidatos, setFornecedoresCandidatos] = useState<string[]>(
    [],
  );
  const {
    conferenceOrders = [],
    isLoading,
    loadConferenceOrdersError,
    refetch,
  } = useFetchConferenceOrders(
    token,
    filterTrigger.supplier,
    filterTrigger.product,
    mostrarCancelados,
  );
  const {
    user,
    isLoading: isLoadingPermissios,
    error: errorOnPermissions,
  } = usePermissions();
  const { divergences = [] } = useFetchDivergences(token);
  const itemsPerPage = 6;
  const podeVisualizarAguardandoFinanceiro = Boolean(
    user && hasPermission(user, "conferencia:visualizar_detalhes"),
  );
  const podeExecutarAcoesFinanceiras = Boolean(
    user && hasPermission(user, "solicitacoes_dia:atualizar"),
  );
  const podeAdministrarNotificacao = Boolean(
    user && hasPermission(user, "usuarios:listarTodos"),
  );
  const resumoPainel = resumirPainelConferencia(
    conferenceOrders ?? [],
    podeVisualizarAguardandoFinanceiro,
  );
  const {
    data: filaFinanceiro = [],
    isLoading: loadingFilaFinanceiro,
    error: erroFilaFinanceiro,
    refetch: refetchFilaFinanceiro,
  } = useQuery({
    queryKey: ["conferenceFinanceQueue", token, financeiroFornecedorFiltro],
    queryFn: () => fetchFinanceQueueFn(token, financeiroFornecedorFiltro),
    enabled: !!token && financeiroDialogAberto && podeExecutarAcoesFinanceiras,
    refetchInterval: financeiroDialogAberto ? 20000 : false,
  });
  const {
    data: pedidoFinanceiroResumo,
    isLoading: loadingPedidoFinanceiro,
    error: erroPedidoFinanceiro,
    refetch: refetchPedidoFinanceiro,
  } = useQuery<IFinanceOrderSummary>({
    queryKey: ["conferenceFinanceOrder", token, pedidoFinanceiroSelecionado],
    queryFn: () => fetchFinanceOrderSummaryFn(token, pedidoFinanceiroSelecionado!),
    enabled:
      !!token &&
      !!pedidoFinanceiroSelecionado &&
      financeiroDialogAberto &&
      podeExecutarAcoesFinanceiras,
  });
  const {
    data: registrosManuaisSidi = [],
    refetch: refetchRegistrosManuaisSidi,
  } = useQuery<ISidiEnvioManualRegistro[]>({
    queryKey: ["conferenceSidiManualLogs", token, pedidoFinanceiroSelecionado],
    queryFn: () =>
      listRegistrosEnvioManualSidiFn(token, pedidoFinanceiroSelecionado!),
    enabled:
      !!token &&
      !!pedidoFinanceiroSelecionado &&
      financeiroDialogAberto &&
      podeExecutarAcoesFinanceiras,
  });
  const mutacaoAcaoFinanceira = useMutation({
    mutationFn: (payload: {
      pedido_id: number;
      item: number;
      acao: FinanceLineAction;
      observacoes?: string;
    }) => applyFinanceLineActionFn({ token, ...payload }),
    onSuccess: async () => {
      setErroFinanceiroAcao(null);
      await refetchPedidoFinanceiro();
      await refetchFilaFinanceiro();
      await refetch();
    },
    onError: (error: unknown) => {
      setErroFinanceiroAcao(
        getApiErrorMessage(error, "Falha ao aplicar ação financeira."),
      );
    },
  });
  const mutacaoLiberacaoGlobal = useMutation({
    mutationFn: (payload: { pedido_id: number; confirmar: boolean; ciente_exclusoes: boolean }) =>
      applyFinanceGlobalReleaseFn({ token, ...payload }),
    onSuccess: async (data) => {
      setGlobalPreview(data);
      setErroFinanceiroAcao(null);
      await refetchPedidoFinanceiro();
      await refetchFilaFinanceiro();
      await refetch();
    },
    onError: (error: unknown) => {
      setErroFinanceiroAcao(
        getApiErrorMessage(error, "Falha na liberação global ao SIDI."),
      );
    },
  });
  const mutacaoDispararNotificacao = useMutation({
    mutationFn: (pedidoId: number) => dispararNotificacaoPedidoSidiFn(token, pedidoId),
    onSuccess: async (data) => {
      setErroFinanceiroAcao(data.mensagem);
    },
    onError: (error: unknown) => {
      setErroFinanceiroAcao(
        getApiErrorMessage(error, "Falha ao disparar notificação SIDI."),
      );
    },
  });
  const mutacaoRegistrarEnvioManual = useMutation({
    mutationFn: (payload: { pedidoId: number; protocolo?: string; observacao?: string }) =>
      registrarEnvioManualSidiFn(token, payload.pedidoId, {
        protocolo: payload.protocolo,
        observacao: payload.observacao,
      }),
    onSuccess: async () => {
      setRegistroManualForm({ protocolo: "", observacao: "" });
      setErroFinanceiroAcao(null);
      await refetchRegistrosManuaisSidi();
    },
    onError: (error: unknown) => {
      setErroFinanceiroAcao(
        getApiErrorMessage(error, "Falha ao registrar envio manual no SIDI."),
      );
    },
  });

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number,
  ) => {
    event.preventDefault();
    setPage(value);
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    mutateSincronizeConference.mutate(token, {
      onSuccess: (data) => {
        const msg = (data as SincronizacaoConferenciaResponse)?.mensagem_resumo;
        if (msg) {
          setSyncMensagem(msg);
          setSnackbarOpen(true);
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isLoadingPermissios) return;
    if (!user) return;

    // Permissão mínima para acessar a página: listar pedidos de conferência
    if (!hasPermission(user, "conferencia:listar_pedidos")) {
      navigate("/login");
    }
  }, [user, isLoadingPermissios, navigate]);

  const aplicarFiltros = (supplier: string, product: string) => {
    setFilterTrigger({ supplier, product });
    refetch();
    setPage(1);
  };

  const detectarFornecedorPorProduto = async (): Promise<
    { tipo: "nenhum" } | { tipo: "unico"; fornecedor: string } | { tipo: "ambiguidade"; fornecedores: string[] }
  > => {
    const produto = productFilter.trim();
    if (!produto || supplierFilter.trim()) {
      return { tipo: "nenhum" };
    }
    const candidatos = await conferenceOrdersFn(token, "", produto, mostrarCancelados);
    const fornecedores = Array.from(
      new Set((candidatos ?? []).map((o) => (o.fornecedor ?? "").trim()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
    if (fornecedores.length === 1) {
      return { tipo: "unico", fornecedor: fornecedores[0] };
    }
    if (fornecedores.length > 1) {
      return { tipo: "ambiguidade", fornecedores };
    }
    return { tipo: "nenhum" };
  };

  const handleEnterPress = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key === "Enter") {
      await handleAtualizarClick();
    }
  };

  const handleAtualizarClick = async () => {
    const decisao = await detectarFornecedorPorProduto();
    if (decisao.tipo === "unico") {
      setSupplierFilter(decisao.fornecedor);
      setAlertaFiltro(
        `Fornecedor definido automaticamente para o produto informado: ${decisao.fornecedor}.`,
      );
      aplicarFiltros(decisao.fornecedor, productFilter);
      return;
    }
    if (decisao.tipo === "ambiguidade") {
      setFornecedoresCandidatos(decisao.fornecedores);
      setConfirmacaoFornecedorAberta(true);
      return;
    }
    aplicarFiltros(supplierFilter, productFilter);
  };

  if (isLoading) return <LoadingScreen />;
  if (sincronizeError) return <ErrorMessage message={sincronizeError} />;
  if (loadConferenceOrdersError)
    return (
      <ErrorMessage
        message={getApiErrorMessage(
          loadConferenceOrdersError,
          "Erro ao carregar os pedidos de compra.",
        )}
      />
    );
  if (errorOnPermissions) {
    return <ErrorMessage message="Usuário não autenticado" />;
  }

  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pedidosFiltradosPorFase = aplicarFiltroFasePainel(
    conferenceOrders ?? [],
    filtroFaseRapida,
    podeVisualizarAguardandoFinanceiro,
  );
  const paginatedOrders = pedidosFiltradosPorFase.slice(startIndex, endIndex);
  const totalPages = Math.ceil((pedidosFiltradosPorFase.length || 0) / itemsPerPage);

  return (
    <Grid
      container
      spacing={4}
      sx={{ p: { xs: 2, sm: 3, md: 4 }, justifyContent: "center" }}
    >
      <Snackbar
        open={snackbarOpen && Boolean(syncMensagem)}
        autoHideDuration={9000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          {syncMensagem}
        </Alert>
      </Snackbar>
      <Snackbar
        open={Boolean(alertaFiltro)}
        autoHideDuration={5000}
        onClose={() => setAlertaFiltro(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setAlertaFiltro(null)}
          severity="info"
          sx={{ width: "100%" }}
        >
          {alertaFiltro}
        </Alert>
      </Snackbar>
      <Dialog
        open={adminNotificacaoAberto}
        onClose={() => setAdminNotificacaoAberto(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>SMTP e destinatários (SIDI / envio)</DialogTitle>
        <DialogContent dividers>
          <SmtpSidiAdminPanel
            token={token}
            active={adminNotificacaoAberto && podeAdministrarNotificacao}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate("/smtp-envio")} color="secondary">
            Abrir em página cheia
          </Button>
          <Button onClick={() => setAdminNotificacaoAberto(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={globalDialogAberto}
        onClose={() => setGlobalDialogAberto(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Liberação global para o SIDI</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            {erroFinanceiroAcao ? <Alert severity="error">{erroFinanceiroAcao}</Alert> : null}
            {!globalPreview ? (
              <Typography color="text.secondary">
                Gere a prévia para visualizar o que entra e o que fica de fora neste envio.
              </Typography>
            ) : (
              <>
                <Alert severity="warning">
                  {globalPreview.total_itens_excluidos_sidi} de{" "}
                  {globalPreview.total_itens_excluidos_sidi +
                    globalPreview.total_itens_incluidos_sidi}{" "}
                  linha(s) ficarão fora deste envio.
                </Alert>
                <Typography variant="body2" color="text.secondary">
                  Incluídos: {globalPreview.total_itens_incluidos_sidi} · Excluídos:{" "}
                  {globalPreview.total_itens_excluidos_sidi}
                </Typography>
                <List dense sx={{ maxHeight: 220, overflowY: "auto", border: "1px solid #eee", borderRadius: 1 }}>
                  {globalPreview.linhas_excluidas.length === 0 ? (
                    <ListItem>
                      <ListItemText primary="Nenhuma linha excluída nesta prévia." />
                    </ListItem>
                  ) : (
                    globalPreview.linhas_excluidas.map((linha) => (
                      <ListItem key={`ex-${linha.item}`}>
                        <ListItemText
                          primary={`Item ${linha.item} — ${linha.produto}`}
                          secondary={`Qtd: ${linha.quantidade_esperada} · Status: ${linha.status_atual} · ${linha.motivo}`}
                        />
                      </ListItem>
                    ))
                  )}
                </List>
                {globalStep === "confirmacao_final" ? (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={globalCiencia}
                        onChange={(_, checked) => setGlobalCiencia(checked)}
                      />
                    }
                    label="Estou ciente de que as linhas listadas não serão enviadas neste pedido SIDI."
                  />
                ) : null}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setGlobalDialogAberto(false);
              setGlobalPreview(null);
              setGlobalStep("preview");
              setGlobalCiencia(false);
            }}
          >
            Fechar
          </Button>
          <Button
            variant="outlined"
            disabled={!pedidoFinanceiroSelecionado || mutacaoLiberacaoGlobal.isPending}
            onClick={() =>
              mutacaoLiberacaoGlobal.mutate({
                pedido_id: pedidoFinanceiroSelecionado!,
                confirmar: false,
                ciente_exclusoes: false,
              })
            }
          >
            Gerar prévia
          </Button>
          {globalPreview && globalStep === "preview" ? (
            <Button
              variant="contained"
              onClick={() => setGlobalStep(proximoPassoLiberacaoGlobal(globalStep))}
            >
              Avançar para confirmação
            </Button>
          ) : null}
          {globalPreview && globalStep === "confirmacao_final" ? (
            <Button
              color="error"
              variant="contained"
              disabled={
                !podeConfirmarLiberacaoGlobal(globalStep, globalCiencia) ||
                mutacaoLiberacaoGlobal.isPending
              }
              onClick={() =>
                mutacaoLiberacaoGlobal.mutate({
                  pedido_id: pedidoFinanceiroSelecionado!,
                  confirmar: true,
                  ciente_exclusoes: globalCiencia,
                })
              }
            >
              Confirmar liberação global
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
      <Dialog
        open={financeiroDialogAberto}
        onClose={() => setFinanceiroDialogAberto(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>Fila e decisão financeira por linha</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Selecione o pedido em decisão financeira e aplique a ação por linha.
              Somente itens liberados entram no próximo envio SIDI.
            </Typography>
            {erroFinanceiroAcao ? <Alert severity="error">{erroFinanceiroAcao}</Alert> : null}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Filtrar fornecedor"
                  placeholder="Fornecedor"
                  value={financeiroFornecedorFiltro}
                  onChange={(e) => setFinanceiroFornecedorFiltro(e.target.value)}
                />
                <List dense sx={{ mt: 1, maxHeight: 340, overflowY: "auto" }}>
                  {loadingFilaFinanceiro ? (
                    <ListItem>
                      <CircularProgress size={18} />
                    </ListItem>
                  ) : erroFilaFinanceiro ? (
                    <ListItem>
                      <ListItemText
                        primary={getApiErrorMessage(
                          erroFilaFinanceiro,
                          "Erro ao carregar fila financeira.",
                        )}
                        primaryTypographyProps={{ color: "error" }}
                      />
                    </ListItem>
                  ) : filaFinanceiro.length === 0 ? (
                    <ListItem>
                      <ListItemText
                        primary="Sem pedidos em decisão financeira."
                        primaryTypographyProps={{ color: "text.secondary" }}
                      />
                    </ListItem>
                  ) : (
                    filaFinanceiro.map((p) => (
                      <ListItem
                        key={p.pedido_id}
                        sx={{
                          cursor: "pointer",
                          borderRadius: 1,
                          bgcolor:
                            pedidoFinanceiroSelecionado === p.pedido_id
                              ? "rgba(133,66,249,0.10)"
                              : "transparent",
                        }}
                        onClick={() => setPedidoFinanceiroSelecionado(p.pedido_id)}
                      >
                        <ListItemText
                          primary={`Pedido ${p.pedido_id}`}
                          secondary={`${p.fornecedor_principal ?? "Fornecedor"} · elegíveis: ${p.total_itens_elegiveis_sidi} · excluídos: ${p.total_itens_excluidos_sidi}`}
                        />
                      </ListItem>
                    ))
                  )}
                </List>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                {!pedidoFinanceiroSelecionado ? (
                  <Typography color="text.secondary">
                    Selecione um pedido à esquerda para visualizar as linhas.
                  </Typography>
                ) : loadingPedidoFinanceiro ? (
                  <CircularProgress size={20} />
                ) : erroPedidoFinanceiro || !pedidoFinanceiroResumo ? (
                  <Typography color="error">
                    {erroPedidoFinanceiro
                      ? getApiErrorMessage(
                          erroPedidoFinanceiro,
                          "Erro ao carregar o detalhe do pedido financeiro.",
                        )
                      : "Não foi possível carregar o resumo deste pedido."}
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    <Alert severity="info">
                      Prévia SIDI: {pedidoFinanceiroResumo.total_itens_incluidos_sidi} incluído(s) e{" "}
                      {pedidoFinanceiroResumo.total_itens_excluidos_sidi} excluído(s).
                    </Alert>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Button
                        variant="contained"
                        color="error"
                        disabled={!pedidoFinanceiroSelecionado}
                        onClick={() => {
                          setGlobalDialogAberto(true);
                          setGlobalPreview(null);
                          setGlobalStep("preview");
                          setGlobalCiencia(false);
                        }}
                      >
                        Liberação global (2 etapas)
                      </Button>
                      <Button
                        variant="outlined"
                        disabled={
                          !pedidoFinanceiroSelecionado ||
                          mutacaoDispararNotificacao.isPending
                        }
                        onClick={() =>
                          mutacaoDispararNotificacao.mutate(
                            pedidoFinanceiroSelecionado!,
                          )
                        }
                      >
                        Enviar e-mail contingência
                      </Button>
                    </Stack>
                    <Paper variant="outlined" sx={{ p: 1.25 }}>
                      <Stack spacing={1}>
                        <Typography fontWeight={700}>
                          Registro manual de envio SIDI (Sprint 8.1)
                        </Typography>
                        <Grid container spacing={1}>
                          <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                              fullWidth
                              label="Protocolo (opcional)"
                              value={registroManualForm.protocolo}
                              onChange={(e) =>
                                setRegistroManualForm((s) => ({
                                  ...s,
                                  protocolo: e.target.value,
                                }))
                              }
                            />
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                              fullWidth
                              label="Observação"
                              placeholder="Obrigatória para registrar novo envio quando já existe registro."
                              value={registroManualForm.observacao}
                              onChange={(e) =>
                                setRegistroManualForm((s) => ({
                                  ...s,
                                  observacao: e.target.value,
                                }))
                              }
                            />
                          </Grid>
                          <Grid size={{ xs: 12, md: 2 }}>
                            <Button
                              fullWidth
                              variant="contained"
                              onClick={() =>
                                mutacaoRegistrarEnvioManual.mutate({
                                  pedidoId: pedidoFinanceiroSelecionado!,
                                  protocolo: registroManualForm.protocolo,
                                  observacao: registroManualForm.observacao,
                                })
                              }
                              disabled={mutacaoRegistrarEnvioManual.isPending}
                            >
                              Registrar
                            </Button>
                          </Grid>
                        </Grid>
                        <List dense sx={{ maxHeight: 140, overflowY: "auto" }}>
                          {registrosManuaisSidi.length === 0 ? (
                            <ListItem>
                              <ListItemText
                                primary="Sem registro manual para este pedido."
                                primaryTypographyProps={{ color: "text.secondary" }}
                              />
                            </ListItem>
                          ) : (
                            registrosManuaisSidi.map((r) => (
                              <ListItem key={r.id}>
                                <ListItemText
                                  primary={`${new Date(r.enviado_em).toLocaleString("pt-BR")} · ${r.enviado_por}`}
                                  secondary={`Canal: ${r.canal_envio}${r.protocolo ? ` · Protocolo: ${r.protocolo}` : ""}${r.observacao ? ` · Obs: ${r.observacao}` : ""}`}
                                />
                              </ListItem>
                            ))
                          )}
                        </List>
                      </Stack>
                    </Paper>
                    {pedidoFinanceiroResumo.itens.map((linha) => (
                      <Paper key={`${linha.pedido_id}-${linha.item}`} variant="outlined" sx={{ p: 1.2 }}>
                        <Stack spacing={1}>
                          <Typography fontWeight={700}>
                            Item {linha.item} — {linha.produto}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Status atual: {linha.status_conferencia} · Origem: {linha.origem_compra}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Observação da conferência:{" "}
                            {String(linha.observacoes ?? "").trim() || "—"}
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              disabled={mutacaoAcaoFinanceira.isPending}
                              onClick={() =>
                                mutacaoAcaoFinanceira.mutate({
                                  pedido_id: linha.pedido_id,
                                  item: linha.item,
                                  acao: "liberar_sidi",
                                  observacoes: "Liberado pelo financeiro para o lote SIDI.",
                                })
                              }
                            >
                              Liberar SIDI
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              disabled={mutacaoAcaoFinanceira.isPending}
                              onClick={() =>
                                mutacaoAcaoFinanceira.mutate({
                                  pedido_id: linha.pedido_id,
                                  item: linha.item,
                                  acao: "manter_fora",
                                  observacoes: "Mantido fora do envio atual para o SIDI.",
                                })
                              }
                            >
                              Manter fora
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="secondary"
                              disabled={mutacaoAcaoFinanceira.isPending}
                              onClick={() =>
                                mutacaoAcaoFinanceira.mutate({
                                  pedido_id: linha.pedido_id,
                                  item: linha.item,
                                  acao: "pendencia_financeira",
                                  observacoes: "Mantida pendência para revisão financeira.",
                                })
                              }
                            >
                              Manter pendência
                            </Button>
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFinanceiroDialogAberto(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirmacaoFornecedorAberta}
        onClose={() => setConfirmacaoFornecedorAberta(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Confirmar fornecedor do item</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Este produto aparece em mais de um fornecedor pendente. Selecione o
            fornecedor correto para continuar a conferência.
          </Typography>
          <Stack spacing={1}>
            {fornecedoresCandidatos.map((fornecedor) => (
              <Button
                key={fornecedor}
                variant="outlined"
                sx={{ justifyContent: "flex-start", textTransform: "none" }}
                onClick={() => {
                  setSupplierFilter(fornecedor);
                  setConfirmacaoFornecedorAberta(false);
                  aplicarFiltros(fornecedor, productFilter);
                }}
              >
                {fornecedor}
              </Button>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmacaoFornecedorAberta(false)}>
            Fechar
          </Button>
          <Button
            variant="contained"
            sx={{ bgcolor: "#8542F9" }}
            onClick={() => {
              setConfirmacaoFornecedorAberta(false);
              aplicarFiltros(supplierFilter, productFilter);
            }}
          >
            Continuar sem escolher
          </Button>
        </DialogActions>
      </Dialog>
      <Grid container size={{ xs: 12 }} spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
            }}
          >
            <Stack
              spacing={1.5}
              sx={{
                px: { xs: 2, md: 2.5 },
                py: { xs: 1.75, md: 2 },
                bgcolor: "rgba(133,66,249,0.06)",
              }}
            >
              <Typography variant="h6" fontWeight={700}>
                Recepção e conferência de materiais
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Busque por fornecedor e/ou produto para localizar rapidamente os itens pendentes.
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label={`Fornecedores pendentes: ${resumoPainel.fornecedoresPendentes.length}`}
                  color="info"
                />
                <Chip label={`Itens pendentes: ${resumoPainel.itensPendentes}`} color="warning" />
                {podeVisualizarAguardandoFinanceiro ? (
                  <Chip
                    label={`Aguardando financeiro: ${resumoPainel.itensAguardandoFinanceiro}`}
                    color="secondary"
                    variant="outlined"
                  />
                ) : null}
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label="Todos"
                  variant={filtroFaseRapida === "todas" ? "filled" : "outlined"}
                  color={filtroFaseRapida === "todas" ? "primary" : "default"}
                  onClick={() => {
                    setFiltroFaseRapida("todas");
                    setPage(1);
                  }}
                />
                <Chip
                  label="Abertos na conferência"
                  variant={filtroFaseRapida === "abertas" ? "filled" : "outlined"}
                  color={filtroFaseRapida === "abertas" ? "warning" : "default"}
                  onClick={() => {
                    setFiltroFaseRapida("abertas");
                    setPage(1);
                  }}
                />
                {podeVisualizarAguardandoFinanceiro ? (
                  <Chip
                    label="Aguardando decisão financeiro"
                    variant={
                      filtroFaseRapida === "aguardando_financeiro"
                        ? "filled"
                        : "outlined"
                    }
                    color={
                      filtroFaseRapida === "aguardando_financeiro"
                        ? "secondary"
                        : "default"
                    }
                    onClick={() => {
                      setFiltroFaseRapida("aguardando_financeiro");
                      setPage(1);
                    }}
                  />
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    Pedidos em decisão financeira ficam ocultos para este perfil.
                  </Typography>
                )}
              </Stack>
            </Stack>
            <Divider />
            <Grid
              container
              spacing={1.5}
              alignItems="center"
              sx={{ p: { xs: 1.5, md: 2 } }}
            >
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Fornecedor"
                  placeholder="Informe o fornecedor"
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  onKeyDown={handleEnterPress}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ backgroundColor: "white", borderRadius: 1 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Produto"
                  placeholder="Informe o produto"
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  onKeyDown={handleEnterPress}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ backgroundColor: "white", borderRadius: 1 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
                  <Button
                    sx={{ bgcolor: "#8542F9", minWidth: 140, textTransform: "none", fontWeight: 700 }}
                    variant="contained"
                    size="large"
                    onClick={handleAtualizarClick}
                  >
                    Atualizar busca
                  </Button>
                  <FormControlLabel
                    sx={{ ml: { xs: 0, sm: 1 } }}
                    control={
                      <Switch
                        checked={mostrarCancelados}
                        onChange={(_, checked) => {
                          setMostrarCancelados(checked);
                          setPage(1);
                        }}
                        color="secondary"
                      />
                    }
                    label="Mostrar cancelados"
                  />
                  {podeExecutarAcoesFinanceiras ? (
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={() => setFinanceiroDialogAberto(true)}
                    >
                      Painel financeiro
                    </Button>
                  ) : null}
                  {podeAdministrarNotificacao ? (
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={() => setAdminNotificacaoAberto(true)}
                    >
                      Admin SMTP/SIDI
                    </Button>
                  ) : null}
                </Stack>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Grid container size={{ xs: 12 }} spacing={2}>
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              p: 1.5,
            }}
          >
            <Typography variant="subtitle1" fontWeight={700}>
              Pendências por fornecedor
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Clique no fornecedor para filtrar os cards.
            </Typography>
            <List dense sx={{ mt: 1 }}>
              {resumoPainel.pendenciasPorFornecedor.length === 0 ? (
                <ListItem>
                  <ListItemText
                    primary="Sem pendências no momento."
                    primaryTypographyProps={{ color: "text.secondary", fontSize: 13 }}
                  />
                </ListItem>
              ) : (
                resumoPainel.pendenciasPorFornecedor.map((entry) => (
                  <ListItem
                    key={entry.fornecedor}
                    secondaryAction={
                      <Chip
                        size="small"
                        label={`${entry.total} item${entry.total === 1 ? "" : "ns"}`}
                        color="warning"
                        variant="outlined"
                      />
                    }
                    sx={{
                      borderRadius: 1,
                      cursor: "pointer",
                      "&:hover": { bgcolor: "rgba(133,66,249,0.06)" },
                    }}
                    onClick={() => {
                      setSupplierFilter(entry.fornecedor);
                      aplicarFiltros(entry.fornecedor, productFilter);
                    }}
                  >
                    <ListItemText
                      primary={entry.fornecedor}
                      primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                    />
                  </ListItem>
                ))
              )}
            </List>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 8, lg: 9 }}>
          <Grid
            container
            spacing={2}
            justifyContent="center"
            alignItems="stretch"
          >
            {paginatedOrders.length > 0 ? (
              paginatedOrders.map((order: IConferenceOrder) => (
                <Grid
                  key={`${order.pedido_id}-${order.item}`}
                  size={{ xs: 12, sm: 12, lg: 6 }}
                  display="flex"
                  justifyContent="center"
                >
                  <ConferenceCard
                    data_criacao={order.data_criacao}
                    divergencia_id={order.divergencia_id}
                    pedido_id={order.pedido_id}
                    item={order.item}
                    fornecedor={order.fornecedor}
                    produto={order.produto}
                    quantidade_esperada={order.quantidade_esperada}
                    quantidade_fisica={order.quantidade_fisica}
                    status_conferencia={order.status_conferencia}
                    observacoes={order.observacoes}
                    descricao={getDivergenceDesc(order, divergences)}
                    cancelado={order.cancelado}
                    origem_compra={order.origem_compra}
                    pedido_concluido={order.pedido_concluido}
                    fase_conferencia={order.fase_conferencia}
                    tem_pendencia_financeira={order.tem_pendencia_financeira}
                    unidade={order.unidade}
                  />
                </Grid>
              ))
            ) : (
              <Grid size={{ xs: 12 }}>
                <Paper
                  elevation={0}
                  sx={{
                    border: "1px dashed",
                    borderColor: "divider",
                    borderRadius: 2,
                    p: 3,
                    textAlign: "center",
                  }}
                >
                  <Typography color="text.secondary">
                    Nenhum pedido encontrado para os filtros informados.
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>

      {totalPages > 1 && (
        <Stack spacing={2} alignItems="center" sx={{ width: "100%", mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            sx={{
              "& .MuiPaginationItem-root": {
                color: "#8542F9",
              },
              "& .Mui-selected": {
                backgroundColor: "#8542F9",
                color: "#fff",
              },
            }}
            shape="rounded"
          />
        </Stack>
      )}
    </Grid>
  );
};

export default Conference;
