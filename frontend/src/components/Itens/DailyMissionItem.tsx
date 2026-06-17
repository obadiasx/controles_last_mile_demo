import { Delete } from "@mui/icons-material";
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  TextField,
  Typography,
  Popper,
  Paper,
  MenuItem,
  Divider,
  Grid,
} from "@mui/material";
import { useRef, useState } from "react";
import type { IShowDailyMissionItem } from "../../interfaces/IDailyMission";
import type { IUnity } from "../../interfaces/IUnity";
import { useFetchUnits } from "../../hooks/fetch/products/useFetchUnits";
import { useUpdateDailyItem } from "../../hooks/update/useUpdateDailyItem";
import ErrorMessage from "../Error/ErrorMessage";
import { useDeleteDailyMissionItem } from "../../hooks/delete/useDeleteDailyMissionItem";
import CancelarCompraButton from "./CancelarCompraButton";

const fmtBrl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const DailyMissionItem = ({
  id,
  quantidade,
  unidade,
  produto_codigo,
  produto: { descricao },
  comprado,
  valor_unitario,
  missionData,
  missionCompradorId,
}: IShowDailyMissionItem & {
  missionData: string;
  missionCompradorId: string;
}) => {
  const [editingQtd, setEditingQtd] = useState(false);
  const [qtdValue, setQtdValue] = useState<number>(quantidade);

  const [editingUnity, setEditingUnity] = useState(false);

  const anchorRef = useRef<HTMLDivElement | null>(null);

  const {
    units = [],
    isLoading: isLoadingUnits,
    error: errorOnUnits,
  } = useFetchUnits(produto_codigo ?? 0, editingUnity);

  const { mutateUpdateDailyItem, errorMessage: errorOnUpdateItem } =
    useUpdateDailyItem();
  const {
    mutateDeleteDailyMissionItem,
    errorMessage: errorOnDeleteItem,
    clearDeleteError,
  } = useDeleteDailyMissionItem();

  if (errorOnUpdateItem)
    return <ErrorMessage message="Erro ao atualizar item" />;
  if (errorOnUnits)
    return <ErrorMessage message="Erro ao buscar unidades de medida" />;

  return (
    <>
      <Grid
        container
        spacing={1}
        sx={{
          px: 2,
          py: 1,
          bgcolor: "white",
        }}
      >
        {/* PRODUTO */}
        <Grid
          size={12}
          sx={{
            "@media (min-width:850px)": { width: "32.6%" },
            mt: 1.5,
          }}
        >
          <Typography color="#000">{descricao}</Typography>
          {valor_unitario != null && valor_unitario > 0 && !comprado ? (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
              Preço estimado: {fmtBrl(Number(valor_unitario))} / {unidade}
            </Typography>
          ) : null}
        </Grid>

        {/* QUANTIDADE */}
        <Grid
          size={6}
          sx={{
            "@media (min-width:850px)": { width: "14.3%" },
            mt: 1.5,
          }}
        >
          {editingQtd ? (
            <TextField
              size="small"
              autoFocus
              value={qtdValue}
              onChange={(e) => setQtdValue(Number(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  mutateUpdateDailyItem.mutate({
                    id,
                    quantity: qtdValue,
                    unity: unidade,
                  });
                  setEditingQtd(false);
                }
                if (e.key === "Escape") {
                  setQtdValue(quantidade);
                  setEditingQtd(false);
                }
              }}
              fullWidth
            />
          ) : (
            <Typography
              sx={{
                cursor: comprado ? "default" : "pointer",
                color: "#000",
              }}
              onDoubleClick={() => {
                if (comprado) return;
                setQtdValue(quantidade);
                setEditingQtd(true);
              }}
            >
              <Box
                component="span"
                sx={{
                  display: { xs: "inline", md: "inline" },
                  "@media (min-width:850px)": { display: "none" },
                  fontWeight: 600,
                  mr: 0.5,
                }}
              >
                Qtd:
              </Box>
              {quantidade}
            </Typography>
          )}
        </Grid>

        {/* UNIDADE */}
        <Grid
          size={6}
          sx={{
            "@media (min-width:850px)": { width: "11%" },
            mt: 1.5,
          }}
        >
          <Box ref={anchorRef}>
            <Typography
              sx={{
                cursor: comprado ? "default" : "pointer",
                color: "#000",
              }}
              onDoubleClick={() => {
                if (comprado) return;
                setEditingUnity(true);
              }}
            >
              <Box
                component="span"
                sx={{
                  display: { xs: "inline", md: "inline" },
                  "@media (min-width:850px)": { display: "none" },
                  fontWeight: 600,
                  mr: 0.5,
                }}
              >
                UM:
              </Box>
              {unidade}
            </Typography>

            <Popper
              open={editingUnity}
              anchorEl={anchorRef.current}
              placement="bottom-start"
              disablePortal
              sx={{ zIndex: 1300 }}
            >
              <Paper sx={{ width: 120 }}>
                {isLoadingUnits && (
                  <Box p={1} textAlign="center">
                    <CircularProgress size={18} />
                  </Box>
                )}

                {units.map((u: IUnity) => (
                  <MenuItem
                    key={u.codigo}
                    onClick={() => {
                      mutateUpdateDailyItem.mutate({
                        id,
                        quantity: quantidade,
                        unity: u.unidade,
                      });
                      setEditingUnity(false);
                    }}
                  >
                    {u.unidade}
                  </MenuItem>
                ))}
              </Paper>
            </Popper>
          </Box>
        </Grid>

        {/* SITUAÇÃO */}
        <Grid
          size={12}
          sx={{
            "@media (min-width:850px)": { width: "13%" },
          }}
        >
          <Typography
            sx={{
              bgcolor: comprado ? "#E8F5E9" : "#FDECEA",
              color: comprado ? "#2E7D32" : "#B71C1C",
              px: 1,
              py: 0.5,
              borderRadius: 1,
              fontWeight: 600,
              textAlign: "center",
              mt: 1,
            }}
          >
            {comprado ? "Comprado" : "Não Comprado"}
          </Typography>
        </Grid>

        {/* DELETE — itens já comprados não podem ser excluídos (regra também no backend) */}
        <Grid
          size={12}
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
            "@media (min-width:850px)": { width: "25%" },
          }}
        >
          <CancelarCompraButton
            itemId={id}
            comprado={comprado}
            missionDate={missionData}
            missionCompradorId={missionCompradorId}
            variant="row"
          />
          {!comprado ? (
            <IconButton
              onClick={() => mutateDeleteDailyMissionItem.mutate(id)}
              size="small"
              aria-label="Excluir item"
            >
              <Delete />
            </IconButton>
          ) : null}
        </Grid>
      </Grid>

      {errorOnDeleteItem ? (
        <Alert
          severity="error"
          onClose={clearDeleteError}
          sx={{ mx: 2, mb: 0.5 }}
        >
          {errorOnDeleteItem}
        </Alert>
      ) : null}

      <Divider sx={{ opacity: 0.08 }} />
    </>
  );
};

export default DailyMissionItem;
