import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { ISupplier } from "../../../interfaces/ISupplier";
import { useFetchFormasPagamento } from "../../../hooks/fetch/formasPagamento/useFetchFormasPagamento";
import { useFetchSuppliers } from "../../../hooks/fetch/suppliers/useFetchSuppliers";
import { handleCloseMenu } from "../../../utils/handleCloseMenu";
import { useWriteOffSuppliers } from "../../../hooks/update/useWriteOffSuppliers";
import ErrorMessage from "../../Error/ErrorMessage";
import { useFetchUnits } from "../../../hooks/fetch/products/useFetchUnits";
import LoadingScreen from "../../Loading/LoadingScreen";
import { useSincronizeUnits } from "../../../hooks/sincronize/useSincronizeUnits";
import { AuthStore } from "../../../stores/AuthStore";
import type { IUnity } from "../../../interfaces/IUnity";
import { fetchTetoEfetivoFn } from "../../../services/fetch/products/FetchTetoEfetivo";

const fmtBrl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Valor inicial no campo sem zeros à esquerda artificiais. */
const valorUnitarioParaExibicao = (n: number): string => {
  if (n === 0 || n == null || Number.isNaN(n)) return "";
  if (Number.isInteger(n)) return String(n);
  return String(n).replace(".", ",");
};

/**
 * Interpreta texto livre (pt-BR: vírgula decimal). Retorna null se vazio ou inválido.
 * Não força número a cada tecla — evita travar edição e "zero fantasma".
 */
const parseValorUnitarioDigitado = (s: string): number | null => {
  const t = s.trim();
  if (t === "") return null;
  const lastComma = t.lastIndexOf(",");
  const lastDot = t.lastIndexOf(".");
  let norm = t;
  if (lastComma > lastDot) {
    norm = t.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    norm = t.replace(/,/g, "");
  } else if (t.includes(",")) {
    norm = t.replace(",", ".");
  }
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
};

/** Dados do lançamento atual para pré-preencher a correção (item já comprado). */
export type DadosCompraParaCorrecao = {
  fornecedorId: number;
  nomeFornecedorFantasia?: string | null;
  quantidadeAdquirida: number;
  unidadeComprada: string;
  valorUnitario: number;
  /** Pode vir vazio se o lançamento antigo não tiver referência; o usuário escolhe no modal. */
  formaPagamentoId: string;
  observacao?: string | null;
};

type CeagespModalProps = {
  onClose: () => void;
  itemId: string;
  itemCode: number;
  productDescription: string;
  requestedQuantity: number;
  requestedUnit: string;
  /** Quando true, substitui o lançamento (nova baixa após remover fila SIDI pendente). */
  modoCorrecao?: boolean;
  dadosCompraExistentes?: DadosCompraParaCorrecao | null;
};

const CeagespModal = ({
  onClose,
  itemId,
  itemCode,
  productDescription,
  requestedQuantity,
  requestedUnit,
  modoCorrecao = false,
  dadosCompraExistentes = null,
}: CeagespModalProps) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { token } = AuthStore((state) => state);
  const hasSyncedRef = useRef(false);
  const supplierDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [supplierInput, setSupplierInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<ISupplier | null>(
    () => {
      if (!modoCorrecao || !dadosCompraExistentes) return null;
      const nome = (dadosCompraExistentes.nomeFornecedorFantasia ?? "").trim();
      return {
        id: dadosCompraExistentes.fornecedorId,
        fantasia:
          nome.length > 0
            ? nome
            : `Fornecedor #${dadosCompraExistentes.fornecedorId}`,
        box_complemento: "",
        contato: "",
        forma_pagamento_padrao: null,
      };
    },
  );
  const {
    suppliers = [],
    isLoading: LoadingSuppliers,
    error: errorOnLoadingSuppliers,
  } = useFetchSuppliers(search);

  const { formas, isLoading: loadingFormas } = useFetchFormasPagamento(Boolean(token));

  const { mutateWriteOffSupplier } = useWriteOffSuppliers();

  const { mutateSincronizeUnits, sincronizeError } = useSincronizeUnits();

  const {
    units = [],
    isLoading: isLoadingUnits,
    error: errorOnUnits,
  } = useFetchUnits(itemCode);

  const [anchorElUnits, setAnchorElUnits] = useState<null | HTMLElement>(null);
  const [notes, setNotes] = useState<string>(
    modoCorrecao && dadosCompraExistentes
      ? dadosCompraExistentes.observacao?.trim() ?? ""
      : "",
  );
  const [quantity, setQuantity] = useState<number>(
    modoCorrecao && dadosCompraExistentes
      ? dadosCompraExistentes.quantidadeAdquirida
      : requestedQuantity,
  );
  const [valorUnitarioStr, setValorUnitarioStr] = useState<string>(() =>
    modoCorrecao && dadosCompraExistentes
      ? valorUnitarioParaExibicao(dadosCompraExistentes.valorUnitario)
      : "",
  );
  const [unity, setUnity] = useState<string>(
    modoCorrecao && dadosCompraExistentes
      ? dadosCompraExistentes.unidadeComprada
      : requestedUnit,
  );
  const [formaPagamentoId, setFormaPagamentoId] = useState<string>(
    modoCorrecao && dadosCompraExistentes?.formaPagamentoId
      ? dadosCompraExistentes.formaPagamentoId
      : "",
  );

  const { data: tetoEfetivo, isLoading: loadingTeto } = useQuery({
    queryKey: ["tetoEfetivo", itemCode, unity],
    queryFn: () => fetchTetoEfetivoFn(token!, itemCode, unity),
    enabled: Boolean(token && itemCode && (unity || "").length > 0),
  });

  const [submitError, setSubmitError] = useState<string>("");
  const [avisoDesdobramento, setAvisoDesdobramento] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!modoCorrecao || !dadosCompraExistentes) return;
    const nome = (dadosCompraExistentes.nomeFornecedorFantasia ?? "").trim();
    if (nome.length >= 2) {
      setSupplierInput(nome);
      setSearch(nome);
    }
  }, [modoCorrecao, dadosCompraExistentes]);

  useEffect(() => {
    if (!modoCorrecao || !dadosCompraExistentes) return;
    const found = suppliers.find((s) => s.id === dadosCompraExistentes.fornecedorId);
    if (found) setSelectedSupplier(found);
  }, [modoCorrecao, dadosCompraExistentes, suppliers]);

  useEffect(() => {
    if (supplierDebounceRef.current) clearTimeout(supplierDebounceRef.current);
    if (selectedSupplier) return;

    supplierDebounceRef.current = setTimeout(() => {
      const q = supplierInput.trim();
      setSearch(q.length >= 2 ? q : "");
    }, 380);

    return () => {
      if (supplierDebounceRef.current) {
        clearTimeout(supplierDebounceRef.current);
      }
    };
  }, [supplierInput, selectedSupplier]);

  useEffect(() => {
    if (!selectedSupplier) {
      if (!modoCorrecao) {
        setFormaPagamentoId("");
      }
      return;
    }
    if (
      modoCorrecao &&
      dadosCompraExistentes &&
      selectedSupplier.id === dadosCompraExistentes.fornecedorId
    ) {
      return;
    }
    const padrao = selectedSupplier.forma_pagamento_padrao;
    if (padrao?.id) {
      setFormaPagamentoId(padrao.id);
    } else {
      setFormaPagamentoId("");
    }
  }, [selectedSupplier, modoCorrecao, dadosCompraExistentes]);

  useEffect(() => {
    if (!token || hasSyncedRef.current) return;

    hasSyncedRef.current = true;
    mutateSincronizeUnits.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const valorUnitarioNumerico = parseValorUnitarioDigitado(valorUnitarioStr);
  const formularioInvalido =
    !selectedSupplier?.id ||
    !quantity ||
    valorUnitarioNumerico == null ||
    valorUnitarioNumerico <= 0 ||
    !formaPagamentoId;

  const fecharAvisoDesdobramento = () => {
    setAvisoDesdobramento(null);
    onClose();
  };

  const handleWriteOffSupplier = () => {
    if (!selectedSupplier?.id || formularioInvalido || valorUnitarioNumerico == null)
      return;
    setSubmitError("");
    mutateWriteOffSupplier.mutate(
      {
        itemId,
        supplierId: selectedSupplier.id,
        quantity,
        unity: unity || requestedUnit || "KG",
        unitaryValue: valorUnitarioNumerico,
        formaPagamentoId,
        observacao: notes,
      },
      {
        onSuccess: (data) => {
          const msg = data.mensagem_desdobramento?.trim();
          if (msg) {
            setAvisoDesdobramento(msg);
          } else {
            onClose();
          }
        },
        onError: (err) => {
          const msg =
            err instanceof Error
              ? err.message
              : "Não foi possível registrar a compra. Tente novamente.";
          setSubmitError(msg);
        },
      },
    );
  };

  const mostrarAvisoDesdobramento = Boolean(avisoDesdobramento);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUnits(event.currentTarget);
  };

  if (isLoadingUnits) {
    return <LoadingScreen />;
  }

  if (sincronizeError) {
    return <ErrorMessage message={sincronizeError} />;
  }

  if (errorOnUnits) {
    return <ErrorMessage message="Erro ao buscar unidades!" />;
  }

  const supplierOptions = errorOnLoadingSuppliers ? [] : suppliers;

  const tituloModal = modoCorrecao ? "Corrigir compra" : "Comprar produto";
  const rotuloBotaoPrincipal = modoCorrecao
    ? mutateWriteOffSupplier.isPending
      ? "Salvando…"
      : "Salvar correção"
    : mutateWriteOffSupplier.isPending
      ? "Registrando…"
      : "Registrar compra";

  return (
    <Dialog
      open
      onClose={() => {
        if (mutateWriteOffSupplier.isPending) return;
        if (mostrarAvisoDesdobramento) {
          fecharAvisoDesdobramento();
          return;
        }
        onClose();
      }}
      fullWidth
      fullScreen={fullScreen}
      maxWidth="sm"
      scroll="paper"
      slotProps={{
        paper: {
          component: "div",
          sx: fullScreen ? { m: 0, maxHeight: "100%" } : undefined,
        },
      }}
    >
      <DialogTitle sx={{ textAlign: "center" }}>
        {mostrarAvisoDesdobramento ? "Compra parcial — saldo em aberto" : tituloModal}
      </DialogTitle>

      <DialogContent>
        {mostrarAvisoDesdobramento ? (
          <Stack spacing={2} mt={1}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">
                O desdobramento do saldo foi concluído. A lista será atualizada ao
                fechar.
              </Typography>
            </Alert>
            <Typography variant="body2" color="text.primary">
              {avisoDesdobramento}
            </Typography>
          </Stack>
        ) : (
        <Stack spacing={2} mt={1}>
          {submitError ? (
            <Alert severity="error" onClose={() => setSubmitError("")}>
              {submitError}
            </Alert>
          ) : null}
          {modoCorrecao ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">
                Você está <strong>substituindo</strong> o lançamento já registrado
                (fornecedor, quantidade, valores ou observação). Se o pedido ainda
                não tiver sido integrado ao SIDI, a fila é atualizada; se já estiver
                integrado, será necessário alinhar com o financeiro.
              </Typography>
            </Alert>
          ) : null}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: "rgba(133, 66, 249, 0.06)",
              border: "1px solid",
              borderColor: "rgba(133, 66, 249, 0.2)",
            }}
          >
            <Typography variant="overline" color="text.secondary">
              Item da compra
            </Typography>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 0.5 }}>
              {productDescription}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Quantidade solicitada:{" "}
              <Typography component="span" fontWeight={600} color="text.primary">
                {requestedQuantity} {requestedUnit}
              </Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Código do produto: {itemCode}
            </Typography>
          </Box>

          <Autocomplete
            options={supplierOptions}
            loading={LoadingSuppliers && search.length >= 2}
            filterOptions={(opts) => opts}
            getOptionLabel={(o) => o.fantasia}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={selectedSupplier}
            onChange={(_, v) => {
              setSelectedSupplier(v);
              if (v) setSupplierInput(v.fantasia);
              else {
                setSupplierInput("");
                setSearch("");
                setFormaPagamentoId("");
              }
            }}
            inputValue={
              selectedSupplier ? selectedSupplier.fantasia : supplierInput
            }
            onInputChange={(_, newInput, reason) => {
              if (reason === "reset") return;
              if (!selectedSupplier) {
                setSupplierInput(newInput);
              }
            }}
            noOptionsText={
              supplierInput.trim().length < 2
                ? "Digite pelo menos 2 caracteres"
                : LoadingSuppliers
                  ? "Buscando…"
                  : "Nenhum fornecedor encontrado"
            }
            slotProps={{
              listbox: {
                sx: {
                  maxHeight: 280,
                  "& .MuiAutocomplete-option": {
                    minHeight: 44,
                    py: 1.25,
                  },
                },
              },
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Fornecedor"
                placeholder="Buscar por nome ou fantasia"
                helperText={
                  selectedSupplier
                    ? "Use limpar para escolher outro fornecedor"
                    : "A lista atualiza enquanto você digita"
                }
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {LoadingSuppliers && search.length >= 2 ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />

          <TextField
            variant="outlined"
            label="Quantidade Adquirida"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            type="number"
            fullWidth
          />

          <TextField
            variant="outlined"
            label="Unidade de Medida"
            required
            value={unity}
            onClick={handleOpenMenu}
            fullWidth
          />

          <Menu
            anchorEl={anchorElUnits}
            open={Boolean(anchorElUnits)}
            onClose={() => handleCloseMenu(setAnchorElUnits)}
            sx={{ maxHeight: 250 }}
          >
            {isLoadingUnits && (
              <MenuItem>
                <CircularProgress size={20} />
              </MenuItem>
            )}

            {!isLoadingUnits && units.length === 0 && (
              <MenuItem>Nenhum resultado encontrado</MenuItem>
            )}

            {!isLoadingUnits &&
              units.map((unity: IUnity) => (
                <MenuItem
                  key={unity.codigo}
                  onClick={() => {
                    setUnity(unity.unidade);
                    handleCloseMenu(setAnchorElUnits);
                  }}
                >
                  {unity.unidade}
                </MenuItem>
              ))}
          </Menu>

          {sincronizeError && (
            <ErrorMessage message="Erro ao sincronizar unidades de medida" />
          )}

          {!loadingTeto && tetoEfetivo && Number(tetoEfetivo.valor_maximo_aceitavel) > 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">
                <strong>Teto para «{unity}»:</strong> valor unitário até{" "}
                <strong>{fmtBrl(Number(tetoEfetivo.valor_maximo_aceitavel))}</strong>{" "}
                por {unity}, salvo liberação do financeiro. Sem teto nesta
                unidade: uma outra regra converte direto; várias usam o maior
                R$/kg.
              </Typography>
            </Alert>
          ) : !loadingTeto && tetoEfetivo && Number(tetoEfetivo.valor_maximo_aceitavel) <= 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">
                Sem teto ativo para a unidade «{unity}» (ou cadastro sem fator kg
                para comparar regras).
              </Typography>
            </Alert>
          ) : null}

          <TextField
            variant="outlined"
            label="Valor Unitário"
            value={valorUnitarioStr}
            onChange={(e) => setValorUnitarioStr(e.target.value)}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="Ex.: 1,45 ou 145"
            helperText="Use vírgula ou ponto para centavos. Você pode apagar o campo e digitar de novo."
            fullWidth
          />

          {selectedSupplier?.forma_pagamento_padrao ? (
            <TextField
              variant="outlined"
              label="Forma de pagamento"
              value={selectedSupplier.forma_pagamento_padrao.descricao}
              fullWidth
              disabled
              helperText="Condição fixa cadastrada pelo financeiro para este fornecedor."
            />
          ) : (
            <Autocomplete
              options={formas}
              loading={loadingFormas}
              getOptionLabel={(o) => o.descricao}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              value={formas.find((f) => f.id === formaPagamentoId) ?? null}
              onChange={(_, v) => setFormaPagamentoId(v?.id ?? "")}
              disabled={!selectedSupplier}
              noOptionsText={
                loadingFormas ? "Carregando…" : "Nenhuma forma disponível"
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Forma de pagamento"
                  placeholder="Selecione"
                  required
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingFormas ? (
                          <CircularProgress color="inherit" size={20} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          )}

          <TextField
            variant="outlined"
            label="Observações"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
        </Stack>
        )}
      </DialogContent>

      <DialogActions>
        {mostrarAvisoDesdobramento ? (
          <Button
            variant="contained"
            onClick={fecharAvisoDesdobramento}
            sx={{ bgcolor: "#8542F9" }}
          >
            Entendi
          </Button>
        ) : (
          <>
            <Button
              variant="contained"
              disabled={formularioInvalido || mutateWriteOffSupplier.isPending}
              sx={{
                bgcolor:
                  formularioInvalido || mutateWriteOffSupplier.isPending
                    ? "#E0E0E0"
                    : "#8542F9",
                "&.Mui-disabled": { color: "rgba(0,0,0,0.45)" },
              }}
              onClick={handleWriteOffSupplier}
              startIcon={
                mutateWriteOffSupplier.isPending ? (
                  <CircularProgress size={18} color="inherit" />
                ) : undefined
              }
            >
              {rotuloBotaoPrincipal}
            </Button>

            <Button
              sx={{ color: "#8542F9" }}
              onClick={onClose}
              disabled={mutateWriteOffSupplier.isPending}
            >
              Fechar
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CeagespModal;
