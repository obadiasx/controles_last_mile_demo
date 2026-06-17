import {
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  TextField,
  DialogActions,
  Button,
  Menu,
  MenuItem,
  CircularProgress,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { IDailyMissionModalProps } from "../../../interfaces/IDailyMission";
import { useCreateDailyRequestItem } from "../../../hooks/create/useCreateDailyRequestItem";
import ErrorMessage from "../../Error/ErrorMessage";
import { useFetchUnits } from "../../../hooks/fetch/products/useFetchUnits";
import type { IUnity } from "../../../interfaces/IUnity";
import { useSincronizeUnits } from "../../../hooks/sincronize/useSincronizeUnits";
import { AuthStore } from "../../../stores/AuthStore";
import { handleCloseMenu } from "../../../utils/handleCloseMenu";
import { fetchTetoEfetivoFn } from "../../../services/fetch/products/FetchTetoEfetivo";

const fmtBrl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const DailyMissionItemModal = ({
  onClose,
  itemId,
  itemDesc,
  dailyId,
  fornecedorId,
  formaPagamentoRefId,
}: IDailyMissionModalProps) => {
  const { token } = AuthStore((state) => state);
  const { mutateSincronizeUnits, sincronizeError } = useSincronizeUnits();
  const [quantity, setQuantity] = useState<number>(0);
  const [unity, setUnity] = useState<string>("");
  const { mutateCreateDailyRequestItem, errorMessage } =
    useCreateDailyRequestItem();
  const {
    units = [],
    isLoading: isLoadingUnits,
    error: errorOnUnits,
  } = useFetchUnits(itemId);
  const [anchorElUnits, setAnchorElUnits] = useState<null | HTMLElement>(null);
  const [precoStr, setPrecoStr] = useState("");
  const hasSyncedRef = useRef(false);

  const precoNum = useMemo(() => {
    const s = precoStr.trim().replace(",", ".");
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
  }, [precoStr]);

  const { data: tetoEfetivo, isFetching: fetchingTeto } = useQuery({
    queryKey: ["tetoEfetivo", itemId, unity],
    queryFn: () => fetchTetoEfetivoFn(token!, itemId, unity),
    enabled: Boolean(token && itemId && unity.length > 0),
  });

  const limiteExibicao =
    unity.length > 0 && tetoEfetivo
      ? Number(tetoEfetivo.valor_maximo_aceitavel)
      : 0;
  const temTeto = limiteExibicao > 0;

  const precoOk =
    fornecedorId == null ||
    (Number.isFinite(precoNum) && precoNum > 0);

  const disabledButton = !(quantity > 0 && unity.length > 0 && precoOk);

  const fatorKgUnidade = useMemo(() => {
    const u = units.find((x: IUnity) => x.unidade === unity);
    const q = u?.qtde_kg;
    return q != null && Number(q) > 0 ? Number(q) : null;
  }, [units, unity]);

  const pesoEstimadoKg = useMemo(() => {
    if (!fatorKgUnidade || quantity <= 0) return null;
    return quantity * fatorKgUnidade;
  }, [quantity, fatorKgUnidade]);

  useEffect(() => {
    if (!token || hasSyncedRef.current) return;

    hasSyncedRef.current = true;
    mutateSincronizeUnits.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleInsertItem = () => {
    mutateCreateDailyRequestItem.mutate(
      {
        produto_codigo: itemId,
        quantidade: quantity,
        unidade: unity,
        solicitacao_id: dailyId,
        ...(fornecedorId != null ? { fornecedor_id: fornecedorId } : {}),
        ...(formaPagamentoRefId != null
          ? { forma_pagamento_ref_id: formaPagamentoRefId }
          : {}),
        ...(fornecedorId != null && Number.isFinite(precoNum)
          ? { valor_unitario: precoNum }
          : {}),
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: () => {},
      }
    );
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUnits(event.currentTarget);
  };

  if (errorMessage) {
    return <ErrorMessage message="Erro ao inserir item!" />;
  }

  if (errorOnUnits) {
    return <ErrorMessage message="Erro ao buscar unidades!" />;
  }

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: { component: "div" },
      }}
    >
      <DialogTitle sx={{ textAlign: "center" }}>
        {fornecedorId != null ? "Incluir item (preço estimado)" : "Inserir item"}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            {fornecedorId != null ? (
              <Typography variant="body2" component="span" display="block" gutterBottom>
                <strong>Pedido direto:</strong> informe o preço unitário estimado nesta unidade; esse
                valor será usado ao concluir o pedido (baixa e integração).
              </Typography>
            ) : null}
            <Typography variant="body2" component="span" display="block" gutterBottom>
              <strong>Teto de referência (por unidade escolhida):</strong>{" "}
              {unity.length > 0 && fetchingTeto ? (
                <>calculando…</>
              ) : temTeto ? (
                <>
                  o limite de referência nesta unidade é{" "}
                  <strong>{fmtBrl(limiteExibicao)}</strong> por {unity || "unidade"}; o
                  financeiro pode registrar valores acima quando necessário. Sem teto
                  nesta unidade: outras regras de conversão podem aplicar.
                </>
              ) : (
                <>
                  não há teto aplicável para{" "}
                  {unity ? `a unidade «${unity}»` : "esta combinação"} (escolha a
                  unidade ou cadastre tetos no financeiro).
                </>
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              O valor efetivo é copiado para a linha ao salvar; alterações futuras no
              cadastro não mudam pedidos já criados.
            </Typography>
          </Alert>

          <TextField
            variant="outlined"
            type="text"
            disabled
            value={itemDesc}
            label="Descrição do Item"
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <TextField
            variant="outlined"
            type="number"
            inputProps={{ min: 0, step: "any" }}
            value={quantity || ""}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setQuantity(Number.isFinite(v) ? v : 0);
            }}
            label="Quantidade pedida"
            required
            fullWidth
            helperText="Quantidade neste pedido, na unidade que você escolher abaixo (ex.: caixas, kg, unidades)."
          />

          <TextField
            variant="outlined"
            label="Unidade de medida"
            required
            value={unity}
            onClick={handleOpenMenu}
            fullWidth
            helperText="Só aparecem unidades já cadastradas para este produto. A quantidade × fator kg da unidade define o peso de referência na compra (ex.: margem de 10%)."
          />

          {pesoEstimadoKg != null ? (
            <Typography variant="body2" color="text.secondary">
              Peso total aproximado desta linha:{" "}
              <strong>
                {pesoEstimadoKg.toLocaleString("pt-BR", {
                  minimumFractionDigits: 3,
                  maximumFractionDigits: 3,
                })}{" "}
                kg
              </strong>{" "}
              (quantidade × {fatorKgUnidade} kg por {unity}).
            </Typography>
          ) : unity ? (
            <Typography variant="caption" color="text.secondary">
              Peso em kg não calculado: cadastro da unidade sem fator kg ou unidade
              ainda não escolhida.
            </Typography>
          ) : null}

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
              units.map((u: IUnity) => (
                <MenuItem
                  key={`${u.codigo}-${u.unidade}`}
                  onClick={() => {
                    setUnity(u.unidade);
                    handleCloseMenu(setAnchorElUnits);
                  }}
                >
                  {u.unidade}
                </MenuItem>
              ))}
          </Menu>

          {fornecedorId != null ? (
            <>
              <TextField
                variant="outlined"
                type="text"
                inputMode="decimal"
                label="Preço unitário estimado (R$)"
                required
                value={precoStr}
                onChange={(e) => setPrecoStr(e.target.value)}
                fullWidth
                helperText={
                  unity.length === 0
                    ? "Primeiro escolha a unidade de medida acima."
                    : temTeto
                      ? `Referência de teto: ${fmtBrl(limiteExibicao)} por ${unity}. Informe o valor estimado negociado.`
                      : "Informe o valor estimado negociado ou previsto para esta unidade."
                }
                disabled={unity.length === 0}
              />
              {temTeto && unity.length > 0 ? (
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ alignSelf: "flex-start" }}
                  onClick={() =>
                    setPrecoStr(
                      limiteExibicao.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }),
                    )
                  }
                >
                  Usar teto máximo ({fmtBrl(limiteExibicao)})
                </Button>
              ) : null}
            </>
          ) : null}

          {sincronizeError && (
            <ErrorMessage message="Erro ao sincronizar unidades de medida" />
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button
          variant="contained"
          sx={{ bgcolor: disabledButton ? "#E0E0E0" : "#8542F9" }}
          onClick={handleInsertItem}
          disabled={disabledButton}
        >
          Concluir
        </Button>

        <Button sx={{ color: "#8542F9" }} onClick={onClose}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DailyMissionItemModal;
