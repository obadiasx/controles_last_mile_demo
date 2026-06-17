import {
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  TextField,
  DialogActions,
  Button,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import { useState, useEffect, useMemo } from "react";
import type { IDailyMissionHeaderModal } from "../../../interfaces/IDailyMission";
import { useCreateDailylRequest } from "../../../hooks/create/useCreateDailyRequest";
import { useFetchBuyers } from "../../../hooks/fetch/buyers/useFetchBuyers";
import type { IBuyers } from "../../../interfaces/IBuyers";
import {
  SOLICITACAO_DIRETA_COMPRADOR_USERNAME,
  SOLICITACAO_DIRETA_EXIBICAO,
} from "../../../config/solicitacaoDireta";

const DailyMissionModal = ({
  onClose,
  initialDate,
  modoPedidoDireto = false,
}: IDailyMissionHeaderModal) => {
  const [date, setDate] = useState<string>(initialDate);
  const [buyer, setBuyer] = useState<string>("");
  const [buyerId, setBuyerId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [disabled, setDisabled] = useState<boolean>(true);
  const { mutateCreateDailyRequest } = useCreateDailylRequest();
  const {
    data: buyers,
    isLoading: isLoadingBuyers,
    error: errorOnBuyers,
  } = useFetchBuyers();
  const [results, setResults] = useState<IBuyers[]>([]);

  useEffect(() => {
    if (buyers) {
      setResults(buyers);
    }
  }, [buyers]);

  const compradorTecnico = results.find(
    (b) => b.username === SOLICITACAO_DIRETA_COMPRADOR_USERNAME,
  );

  /** Conta técnica exclusiva do fluxo "Pedido ao fornecedor" — não entra em nova solicitação do dia. */
  const compradoresSolicitacaoDia = useMemo(
    () =>
      results.filter(
        (b) => b.username !== SOLICITACAO_DIRETA_COMPRADOR_USERNAME,
      ),
    [results],
  );

  useEffect(() => {
    if (modoPedidoDireto) return;
    if (buyer === SOLICITACAO_DIRETA_COMPRADOR_USERNAME) {
      setBuyer("");
      setBuyerId("");
    }
  }, [modoPedidoDireto, buyer, results]);

  useEffect(() => {
    if (!modoPedidoDireto || !compradorTecnico) return;
    setBuyer(compradorTecnico.username);
    setBuyerId(compradorTecnico.id);
  }, [modoPedidoDireto, compradorTecnico]);

  useEffect(() => {
    if (modoPedidoDireto) {
      setDisabled(!(date.length > 0 && Boolean(compradorTecnico?.id)));
      return;
    }
    setDisabled(!(date.length > 0 && buyer.length > 0));
  }, [date, buyer, modoPedidoDireto, compradorTecnico]);

  useEffect(() => {
    if (date === "") {
      setDate(initialDate);
    }
  }, [date, initialDate]);

  const handleCreateHeader = () => {
    const cid = modoPedidoDireto ? compradorTecnico?.id ?? buyerId : buyerId;
    if (!cid) return;
    mutateCreateDailyRequest.mutate(
      {
        data: date,
        comprador_id: cid,
        observacoes: notes,
        permitir_multiplas_no_dia: modoPedidoDireto,
      },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  const diretoSemUsuario =
    modoPedidoDireto &&
    !isLoadingBuyers &&
    !errorOnBuyers &&
    !compradorTecnico;

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
        {modoPedidoDireto ? "Nova solicitação direta" : "Criar Cabeçalho"}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          {modoPedidoDireto && errorOnBuyers ? (
            <Alert severity="error">
              Não foi possível carregar a lista de compradores. Tente novamente.
            </Alert>
          ) : null}
          {diretoSemUsuario ? (
            <Alert severity="warning">
              Não foi encontrado o usuário técnico{" "}
              <strong>{SOLICITACAO_DIRETA_COMPRADOR_USERNAME}</strong> entre os compradores ativos.
              Cadastre-o com perfil de comprador ou verifique o nome de usuário.
            </Alert>
          ) : null}

          <TextField
            variant="outlined"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            label="Data"
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          {modoPedidoDireto ? (
            <TextField
              fullWidth
              label="Comprador"
              value={SOLICITACAO_DIRETA_EXIBICAO}
              InputProps={{ readOnly: true }}
              helperText={`Conta técnica fixa: ${SOLICITACAO_DIRETA_COMPRADOR_USERNAME}`}
            />
          ) : (
            <TextField
              select
              fullWidth
              label="Comprador"
              value={buyer}
              onChange={(e) => {
                const selectedUsername = e.target.value;
                setBuyer(selectedUsername);

                const selectedBuyer = compradoresSolicitacaoDia.find(
                  (b) => b.username === selectedUsername,
                );

                setBuyerId(selectedBuyer?.id ?? "");
              }}
            >
              {isLoadingBuyers && (
                <MenuItem disabled>
                  <CircularProgress size={18} />
                </MenuItem>
              )}

              {!isLoadingBuyers && compradoresSolicitacaoDia.length === 0 && (
                <MenuItem disabled>Nenhum comprador</MenuItem>
              )}

              {errorOnBuyers && (
                <MenuItem disabled>Erro ao carregar compradores</MenuItem>
              )}

              {compradoresSolicitacaoDia.map((b) => (
                <MenuItem key={b.id} value={b.username}>
                  {b.username}
                </MenuItem>
              ))}
            </TextField>
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
      </DialogContent>

      <DialogActions>
        <Button
          variant="contained"
          sx={{ bgcolor: disabled ? "#E0E0E0" : "#8542F9" }}
          disabled={disabled || mutateCreateDailyRequest.isPending || diretoSemUsuario}
          onClick={handleCreateHeader}
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

export default DailyMissionModal;
