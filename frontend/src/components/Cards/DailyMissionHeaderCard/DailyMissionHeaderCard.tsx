import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useDailyMissionItens } from "../../../hooks/fetch/dailyMission/useDailyMissionItens";
import { useFetchProducts } from "../../../hooks/fetch/products/useFetchProducts";
import { useUpdateDailyNotes } from "../../../hooks/update/useUpdateDailyNotes";

import type {
  IDailyMission,
  IShowDailyMissionItem,
} from "../../../interfaces/IDailyMission";
import type { IProduct } from "../../../interfaces/IProduct";
import type { ISupplier } from "../../../interfaces/ISupplier";

import ErrorMessage from "../../Error/ErrorMessage";
import LoadingScreen from "../../Loading/LoadingScreen";
import DailyMissionItem from "../../Itens/DailyMissionItem";
import DailyMissionItemModal from "../../Modal/DailyMissionModal/DailyMissionItemModal";

import { formatISOToBR } from "../../../utils/formateIsoDate";
import { handleCloseMenu } from "../../../utils/handleCloseMenu";
import { useFetchSuppliers } from "../../../hooks/fetch/suppliers/useFetchSuppliers";
import { fetchSupplierByIdFn } from "../../../services/fetch/suppliers/FetchSupplierById";
import { AuthStore } from "../../../stores/AuthStore";
import { sendSupplierEmailFn } from "../../../services/update/daily_mission/SendSupplierEmail";
import { concluirPedidoDiretoFn } from "../../../services/update/daily_mission/ConcluirPedidoDireto";
import { deleteDailyMissionFn } from "../../../services/delete/DeleteDailyMission";
import { getApiErrorMessage } from "../../../utils/getApiErrorMessage";
import {
  fornecedorAptoPedidoDireto,
  labelCompradorParaExibicao,
} from "../../../config/solicitacaoDireta";

const BRAND = "#8542F9";

interface Props {
  mission: IDailyMission;
  queryDate: string;
  canSendDirectOrderEmail?: boolean;
  /** Fluxo Pedido ao fornecedor: fornecedor primeiro, conclusão envia e-mail e dá baixa. */
  modoPedidoDireto?: boolean;
}

const metaLabelSx = {
  display: "block",
  fontSize: "0.7rem",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "text.secondary",
  mb: 0.25,
};

const DailyMissionHeaderCard = ({
  mission,
  queryDate,
  canSendDirectOrderEmail = false,
  modoPedidoDireto = false,
}: Props) => {
  const queryClient = useQueryClient();
  const { token } = AuthStore((state) => state);
  const compradorUsername = mission.comprador?.username || "sem_comprador";

  const {
    dailyMissionItens = [],
    isLoading: isLoadingItens,
    error: errorOnItens,
  } = useDailyMissionItens(mission.id);

  const [editingObsId, setEditingObsId] = useState<string | null>(null);
  const [obsValue, setObsValue] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<React.ReactNode>();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [results, setResults] = useState<IProduct[]>([]);
  const searchFieldWrapperRef = useRef<HTMLDivElement>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [supplierInput, setSupplierInput] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<ISupplier | null>(null);
  const [emailObs, setEmailObs] = useState("");
  const [fornecedorPedidoDireto, setFornecedorPedidoDireto] = useState<ISupplier | null>(
    null,
  );
  const [fornecedorPedidoInput, setFornecedorPedidoInput] = useState("");
  /** Evita rehidratar o combo logo após o usuário limpar a seleção manualmente. */
  const usuarioLimpouFornecedorRef = useRef(false);
  const [concluirDialogOpen, setConcluirDialogOpen] = useState(false);
  const [concluirObs, setConcluirObs] = useState("");
  const [concluirError, setConcluirError] = useState<string | null>(null);
  const [concluirFeedback, setConcluirFeedback] = useState<string | null>(null);
  const [cancelarDialogOpen, setCancelarDialogOpen] = useState(false);
  const [cancelarError, setCancelarError] = useState<string | null>(null);
  const [cancelarFeedback, setCancelarFeedback] = useState<string | null>(null);

  const {
    products,
    isLoading: loadingProducts,
    error: errorProducts,
  } = useFetchProducts(search);

  const { mutateUpdateNotes, errorMessage } = useUpdateDailyNotes();
  const { suppliers, isLoading: loadingSuppliers } = useFetchSuppliers(supplierInput);
  const { suppliers: suppliersDireto, isLoading: loadingSuppliersDireto } =
    useFetchSuppliers(fornecedorPedidoInput);

  const fornecedoresAptosDireto = useMemo(
    () => suppliersDireto.filter(fornecedorAptoPedidoDireto),
    [suppliersDireto],
  );

  /** Inclui o valor selecionado nas opções para o Autocomplete exibir o rótulo ao reabrir a tela. */
  const opcoesComboPedidoDireto = useMemo(() => {
    if (!fornecedorPedidoDireto) return fornecedoresAptosDireto;
    const existe = fornecedoresAptosDireto.some(
      (o) => o.id === fornecedorPedidoDireto.id,
    );
    if (existe) return fornecedoresAptosDireto;
    return [fornecedorPedidoDireto, ...fornecedoresAptosDireto];
  }, [fornecedorPedidoDireto, fornecedoresAptosDireto]);

  const fornecedorIdUnicoDosItens = useMemo(() => {
    if (!modoPedidoDireto || !dailyMissionItens?.length) return null;
    const ids = new Set(
      dailyMissionItens
        .map((i) => i.fornecedor_id)
        .filter((id): id is number => id != null),
    );
    if (ids.size !== 1) return null;
    return [...ids][0];
  }, [modoPedidoDireto, dailyMissionItens]);

  const { data: fornecedorDosItens, isLoading: loadingFornecedorDosItens } =
    useQuery({
      queryKey: ["fornecedor", fornecedorIdUnicoDosItens],
      queryFn: () =>
        fetchSupplierByIdFn(token!, fornecedorIdUnicoDosItens!),
      enabled: Boolean(
        token &&
          modoPedidoDireto &&
          fornecedorIdUnicoDosItens != null &&
          !fornecedorPedidoDireto,
      ),
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    });

  const [emailFeedback, setEmailFeedback] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const sendSupplierEmailMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error("Usuário não autenticado.");
      }
      if (!selectedSupplier) {
        throw new Error("Selecione o fornecedor antes de enviar.");
      }
      return sendSupplierEmailFn({
        token,
        solicitacaoId: mission.id,
        fornecedorId: selectedSupplier.id,
        observacao: emailObs,
      });
    },
    onSuccess: (data) => {
      setEmailError(null);
      setEmailFeedback(
        data?.mensagem || "Pedido enviado por e-mail para o fornecedor.",
      );
      setEmailDialogOpen(false);
    },
    onError: (error: unknown) => {
      setEmailFeedback(null);
      setEmailError(
        getApiErrorMessage(
          error,
          "Falha ao enviar pedido por e-mail para o fornecedor.",
        ),
      );
    },
  });

  const concluirPedidoDiretoMutation = useMutation({
    mutationFn: () =>
      concluirPedidoDiretoFn({
        token: token!,
        solicitacaoId: mission.id,
        fornecedorId: fornecedorPedidoDireto!.id,
        observacao: concluirObs,
      }),
    onSuccess: (data) => {
      setConcluirError(null);
      setConcluirDialogOpen(false);
      setConcluirObs("");
      setFornecedorPedidoDireto(null);
      setFornecedorPedidoInput("");
      setConcluirFeedback(
        data.aviso_email ? `${data.mensagem} ${data.aviso_email}` : data.mensagem,
      );
      queryClient.invalidateQueries({ queryKey: ["dailyMissionItens", mission.id] });
      queryClient.invalidateQueries({ queryKey: ["dailyMission", queryDate] });
    },
    onError: (error: unknown) => {
      setConcluirError(
        getApiErrorMessage(
          error,
          "Falha ao concluir pedido (e-mail e registro de compra).",
        ),
      );
    },
  });

  const excluirSolicitacaoMutation = useMutation({
    mutationFn: () =>
      deleteDailyMissionFn({
        token: token!,
        solicitacaoId: mission.id,
      }),
    onSuccess: (data) => {
      setCancelarError(null);
      setCancelarDialogOpen(false);
      setCancelarFeedback(data.mensagem);
      queryClient.invalidateQueries({ queryKey: ["dailyMission"] });
      queryClient.invalidateQueries({ queryKey: ["dailyMissionItens"] });
    },
    onError: (error: unknown) => {
      setCancelarError(
        getApiErrorMessage(
          error,
          "Falha ao excluir a solicitação direta.",
        ),
      );
    },
  });

  useEffect(() => {
    setFornecedorPedidoDireto(null);
    setFornecedorPedidoInput("");
    usuarioLimpouFornecedorRef.current = false;
  }, [mission.id]);

  useEffect(() => {
    if (!fornecedorDosItens || fornecedorPedidoDireto) return;
    if (usuarioLimpouFornecedorRef.current) return;
    setFornecedorPedidoDireto(fornecedorDosItens);
    setFornecedorPedidoInput(fornecedorDosItens.fantasia);
  }, [fornecedorDosItens, fornecedorPedidoDireto]);

  useEffect(() => {
    if (products) setResults(products);
    if (errorProducts) setResults([]);
  }, [products, errorProducts]);

  useEffect(() => {
    const trimmed = searchValue.trim();
    const timer = window.setTimeout(() => {
      if (trimmed.length > 2) {
        setSearch(trimmed);
        queueMicrotask(() =>
          setAnchorEl(searchFieldWrapperRef.current),
        );
      } else {
        setSearch("");
        setAnchorEl(null);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchValue]);

  const handleProductSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const trimmed = searchValue.trim();
    if (trimmed.length > 2) {
      setSearch(trimmed);
      queueMicrotask(() =>
        setAnchorEl(searchFieldWrapperRef.current),
      );
    } else {
      setAnchorEl(null);
    }
  };

  const pendentesDoFornecedorDireto = useMemo(() => {
    if (!modoPedidoDireto || !fornecedorPedidoDireto) return [];
    return dailyMissionItens.filter(
      (i) => !i.comprado && i.fornecedor_id === fornecedorPedidoDireto.id,
    );
  }, [modoPedidoDireto, fornecedorPedidoDireto, dailyMissionItens]);

  if (isLoadingItens) return <LoadingScreen />;
  if (errorOnItens)
    return <ErrorMessage message="Erro ao mostrar itens da solicitação" />;
  if (errorMessage)
    return <ErrorMessage message="Falha ao atualizar observações" />;

  const nPendente = dailyMissionItens.filter((i) => !i.comprado).length;

  const nPendenteDireto = pendentesDoFornecedorDireto.length;

  const bloquearInclusaoProduto = modoPedidoDireto && !fornecedorPedidoDireto;

  const chipPendente =
    modoPedidoDireto && fornecedorPedidoDireto ? nPendenteDireto : nPendente;
  const chipTotalLinhas =
    modoPedidoDireto && fornecedorPedidoDireto
      ? dailyMissionItens.filter((i) => i.fornecedor_id === fornecedorPedidoDireto.id)
          .length
      : dailyMissionItens.length;

  const chipLabel =
    chipTotalLinhas === 0
      ? modoPedidoDireto && fornecedorPedidoDireto
        ? "Nenhum item deste fornecedor"
        : "Nenhum item na lista"
      : chipPendente === 0
        ? `${chipTotalLinhas} itens · tudo comprado`
        : `${chipPendente} pendente${chipPendente !== 1 ? "s" : ""} · ${chipTotalLinhas} itens`;

  return (
    <>
      {modal}

      <Paper
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
          mb: 3,
          borderLeft: `4px solid ${BRAND}`,
        }}
      >
        {modoPedidoDireto ? (
          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              py: 2,
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: "grey.100",
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Fornecedor do pedido
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Só é possível seguir com fornecedores que já tenham <strong>e-mail de envio</strong> e{" "}
              <strong>forma de pagamento padrão</strong> em Pagamento / e-mail. Demais nomes não
              aparecem na lista.
            </Typography>
            <Autocomplete
              options={opcoesComboPedidoDireto}
              loading={loadingSuppliersDireto || loadingFornecedorDosItens}
              value={fornecedorPedidoDireto}
              inputValue={fornecedorPedidoInput}
              onInputChange={(_, value) => setFornecedorPedidoInput(value)}
              onChange={(_, supplier) => {
                if (supplier && !fornecedorAptoPedidoDireto(supplier)) {
                  return;
                }
                if (supplier == null) {
                  usuarioLimpouFornecedorRef.current = true;
                }
                setFornecedorPedidoDireto(supplier);
                if (supplier) setFornecedorPedidoInput(supplier.fantasia);
                else setFornecedorPedidoInput("");
              }}
              getOptionLabel={(option) => option.fantasia}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterOptions={(opts) => opts}
              noOptionsText={
                fornecedorPedidoInput.trim().length < 2
                  ? "Digite pelo menos 2 letras."
                  : loadingSuppliersDireto
                    ? "Buscando…"
                    : suppliersDireto.length === 0
                      ? "Nenhum fornecedor encontrado."
                      : "Nenhum fornecedor atende às condições mínimas (e-mail de envio e forma padrão). Cadastre em Pagamento / e-mail."
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Fornecedor"
                  placeholder="Digite 2+ letras da fantasia"
                  helperText={
                    !loadingSuppliersDireto &&
                    fornecedorPedidoInput.trim().length >= 2 &&
                    suppliersDireto.length > 0 &&
                    fornecedoresAptosDireto.length === 0
                      ? "Há fornecedores com esse nome, mas sem e-mail de envio ou sem forma padrão. Ajuste em Pagamento / e-mail."
                      : undefined
                  }
                />
              )}
            />
            {fornecedorPedidoDireto ? (
              <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                <Typography variant="body2">
                  Forma de pagamento:{" "}
                  <strong>{fornecedorPedidoDireto.forma_pagamento_padrao?.descricao}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  E-mail de envio cadastrado — pode incluir produtos e concluir o pedido.
                </Typography>
              </Stack>
            ) : null}
          </Box>
        ) : null}

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            bgcolor: "grey.50",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "flex-start" }}
        >
          <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 2, md: 4 }} flex={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="span" sx={metaLabelSx}>
                Comprador
              </Typography>
              <Typography
                variant="body1"
                fontWeight={700}
                noWrap
                title={labelCompradorParaExibicao(compradorUsername)}
              >
                {labelCompradorParaExibicao(compradorUsername)}
              </Typography>
            </Box>
            <Box>
              <Typography component="span" sx={metaLabelSx}>
                Data da missão
              </Typography>
              <Typography variant="body1" fontWeight={700}>
                {formatISOToBR(mission.data)}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography component="span" sx={metaLabelSx}>
                Observações
              </Typography>
              {editingObsId === mission.id ? (
                <TextField
                  size="small"
                  autoFocus
                  fullWidth
                  value={obsValue}
                  onChange={(e) => setObsValue(e.target.value)}
                  onBlur={() => setEditingObsId(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      queryClient.setQueryData<IDailyMission[]>(
                        ["dailyMission", queryDate],
                        (old) =>
                          old?.map((m) =>
                            m.id === mission.id
                              ? { ...m, observacoes: obsValue }
                              : m
                          )
                      );

                      mutateUpdateNotes.mutate({
                        id: mission.id,
                        notes: obsValue,
                      });

                      setEditingObsId(null);
                    }

                    if (e.key === "Escape") {
                      setObsValue(mission.observacoes);
                      setEditingObsId(null);
                    }
                  }}
                />
              ) : (
                <Typography
                  variant="body1"
                  fontWeight={500}
                  sx={{
                    cursor: "pointer",
                    borderBottom: "1px dashed",
                    borderColor: "divider",
                    display: "inline-block",
                    maxWidth: "100%",
                  }}
                  noWrap
                  title="Duplo clique para editar"
                  onDoubleClick={() => {
                    setEditingObsId(mission.id);
                    setObsValue(mission.observacoes);
                  }}
                >
                  {mission.observacoes?.trim()
                    ? mission.observacoes
                    : "Nenhuma observação — dê duplo clique para incluir"}
                </Typography>
              )}
            </Box>
          </Stack>
          <Chip
            size="small"
            label={chipLabel}
            sx={{ fontWeight: 600, alignSelf: { sm: "center" } }}
            color={
              chipTotalLinhas === 0
                ? "default"
                : chipPendente > 0
                  ? "warning"
                  : "success"
            }
            variant="outlined"
          />
          {canSendDirectOrderEmail && modoPedidoDireto ? (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant="contained"
                size="small"
                sx={{ bgcolor: BRAND, alignSelf: { sm: "center" } }}
                disabled={nPendenteDireto === 0 || !fornecedorPedidoDireto}
                onClick={() => {
                  setConcluirDialogOpen(true);
                  setConcluirError(null);
                }}
              >
                Concluir e enviar por e-mail
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                sx={{ alignSelf: { sm: "center" } }}
                onClick={() => {
                  setCancelarError(null);
                  setCancelarDialogOpen(true);
                }}
              >
                Cancelar compra direta
              </Button>
            </Stack>
          ) : null}
          {canSendDirectOrderEmail && !modoPedidoDireto ? (
            <Button
              variant="contained"
              size="small"
              sx={{ bgcolor: BRAND, alignSelf: { sm: "center" } }}
              disabled={nPendente === 0}
              onClick={() => {
                setEmailDialogOpen(true);
                setEmailError(null);
              }}
            >
              Enviar pedido por e-mail
            </Button>
          ) : null}
        </Stack>

        <Box sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Incluir produto na lista
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {modoPedidoDireto
              ? "Após escolher o fornecedor, busque o produto, informe quantidade e unidade. Cada linha fica vinculada a esse fornecedor e forma de pagamento."
              : "Digite pelo menos 3 letras do nome, escolha o produto e informe quantidade e unidade."}
          </Typography>
          <Box ref={searchFieldWrapperRef}>
            <TextField
              fullWidth
              label="Buscar produto"
              placeholder="Ex.: mamão, alface…"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleProductSearchKeyDown}
              disabled={bloquearInclusaoProduto}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" />
                  </InputAdornment>
                ),
              }}
              helperText={
                bloquearInclusaoProduto
                  ? "Selecione o fornecedor (com forma de pagamento padrão) para habilitar a busca."
                  : "Mínimo de 3 caracteres. Os resultados aparecem ao digitar."
              }
              size="small"
            />
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => handleCloseMenu(setAnchorEl)}
          >
            {loadingProducts && (
              <MenuItem>
                <CircularProgress size={20} />
              </MenuItem>
            )}

            {!loadingProducts && results.length === 0 && (
              <MenuItem>Nenhum resultado</MenuItem>
            )}

            {results.map((item) => (
              <MenuItem
                key={item.codigo}
                onClick={() => {
                  setSearchValue("");
                  handleCloseMenu(setAnchorEl);
                  setModal(
                    <DailyMissionItemModal
                      onClose={() => setModal(undefined)}
                      itemDesc={item.descricao}
                      itemId={item.codigo}
                      dailyId={mission.id}
                      fornecedorId={
                        modoPedidoDireto && fornecedorPedidoDireto
                          ? fornecedorPedidoDireto.id
                          : undefined
                      }
                      formaPagamentoRefId={
                        modoPedidoDireto && fornecedorPedidoDireto?.forma_pagamento_padrao?.id
                          ? fornecedorPedidoDireto.forma_pagamento_padrao.id
                          : undefined
                      }
                    />,
                  );
                }}
              >
                {item.descricao}
              </MenuItem>
            ))}
          </Menu>
        </Box>

        <Box
          sx={{
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "action.hover",
            px: { xs: 1, sm: 2 },
            py: 1,
          }}
        >
          <Grid container sx={{ display: { xs: "none", md: "flex" } }} columnSpacing={1}>
            <Grid size={4}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                Produto
              </Typography>
            </Grid>
            <Grid size={2}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                Quantidade
              </Typography>
            </Grid>
            <Grid size={1.5}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                Unidade
              </Typography>
            </Grid>
            <Grid size={2}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                Situação
              </Typography>
            </Grid>
            <Grid size={2.5} textAlign="right">
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                Ações
              </Typography>
            </Grid>
          </Grid>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: { xs: "block", md: "none" }, px: 1, py: 0.5 }}
          >
            Dica: duplo clique em quantidade ou unidade para editar. Itens comprados não podem ser excluídos.
          </Typography>
        </Box>

        <Box>
          {dailyMissionItens.map((item: IShowDailyMissionItem) => (
            <DailyMissionItem
              id={item.id}
              produto={item.produto}
              key={item.id}
              quantidade={item.quantidade}
              unidade={item.unidade}
              produto_codigo={item.produto_codigo}
              comprado={item.comprado}
              solicitacao_id={item.solicitacao_id}
              valor_maximo_aceitavel={item.valor_maximo_aceitavel}
              valor_liberado={item.valor_liberado}
              observacoes={item.observacoes}
              peso_total_calculado={item.peso_total_calculado}
              missionData={mission.data}
              missionCompradorId={mission.comprador_id}
            />
          ))}
        </Box>
      </Paper>

      <Dialog
        open={cancelarDialogOpen}
        onClose={() => setCancelarDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Cancelar compra direta</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Alert severity="warning">
              Esta ação exclui a solicitação inteira (cabeçalho e itens pendentes) e não pode ser
              desfeita.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Use este cancelamento quando a compra foi iniciada e você desistiu antes do envio ao
              fornecedor.
            </Typography>
            {cancelarError ? <Alert severity="error">{cancelarError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelarDialogOpen(false)}>Voltar</Button>
          <Button
            variant="contained"
            color="error"
            disabled={excluirSolicitacaoMutation.isPending}
            onClick={() => excluirSolicitacaoMutation.mutate()}
          >
            {excluirSolicitacaoMutation.isPending ? "Excluindo..." : "Excluir compra inteira"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={concluirDialogOpen}
        onClose={() => setConcluirDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Concluir pedido ao fornecedor</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Será enviado o e-mail para <strong>{fornecedorPedidoDireto?.fantasia}</strong> com{" "}
              <strong>{nPendenteDireto}</strong> item(ns) pendente(s) e, em seguida, registrada a
              compra para conferência / integração.
            </Typography>
            <TextField
              label="Observação adicional (opcional)"
              value={concluirObs}
              onChange={(e) => setConcluirObs(e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
            {concluirError ? <Alert severity="error">{concluirError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConcluirDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: BRAND }}
            disabled={concluirPedidoDiretoMutation.isPending}
            onClick={() => concluirPedidoDiretoMutation.mutate()}
          >
            {concluirPedidoDiretoMutation.isPending ? "Processando..." : "Concluir"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={emailDialogOpen && !modoPedidoDireto}
        onClose={() => setEmailDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Pedido direto ao fornecedor (e-mail)</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Envia os itens pendentes desta solicitacao para o fornecedor
              selecionado. Total pendente: {nPendente}.
            </Typography>
            <Autocomplete
              options={suppliers}
              loading={loadingSuppliers}
              value={selectedSupplier}
              inputValue={supplierInput}
              onInputChange={(_, value) => setSupplierInput(value)}
              onChange={(_, supplier) => setSelectedSupplier(supplier)}
              getOptionLabel={(option) => option.fantasia}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} label="Fornecedor" placeholder="Digite 2+ letras" />
              )}
            />
            <TextField
              label="Observacao adicional (opcional)"
              value={emailObs}
              onChange={(e) => setEmailObs(e.target.value)}
              multiline
              minRows={2}
            />
            {emailError ? <Alert severity="error">{emailError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: BRAND }}
            disabled={!selectedSupplier || sendSupplierEmailMutation.isPending || nPendente === 0}
            onClick={() => sendSupplierEmailMutation.mutate()}
          >
            {sendSupplierEmailMutation.isPending ? "Enviando..." : "Enviar agora"}
          </Button>
        </DialogActions>
      </Dialog>
      {emailFeedback ? (
        <Alert
          sx={{ mt: 1.5 }}
          severity="success"
          onClose={() => setEmailFeedback(null)}
        >
          {emailFeedback}
        </Alert>
      ) : null}
      {concluirFeedback ? (
        <Alert
          sx={{ mt: 1.5 }}
          severity="success"
          onClose={() => setConcluirFeedback(null)}
        >
          {concluirFeedback}
        </Alert>
      ) : null}
      {cancelarFeedback ? (
        <Alert
          sx={{ mt: 1.5 }}
          severity="success"
          onClose={() => setCancelarFeedback(null)}
        >
          {cancelarFeedback}
        </Alert>
      ) : null}
    </>
  );
};

export default DailyMissionHeaderCard;
