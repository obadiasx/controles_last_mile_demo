import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { useState } from "react";
import { useAuth } from "../../hooks/auth/useAuth";
import { usePermissions } from "../../hooks/auth/usePermissions";
import { useCancelCompraSolicitacaoItem } from "../../hooks/cancel/useCancelCompraSolicitacaoItem";
import { hasPermission, isAdmin } from "../../utils/permissions";

const todaySpIso = () =>
  new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

type Props = {
  itemId: string;
  comprado: boolean;
  /** Data da missão no formato ISO (yyyy-mm-dd), alinhada ao backend. */
  missionDate: string;
  missionCompradorId: string;
  /** "row" = texto em linha (Solicitações); "table" = botão compacto (CEAGESP). */
  variant?: "row" | "table";
};

const CancelarCompraButton = ({
  itemId,
  comprado,
  missionDate,
  missionCompradorId,
  variant = "row",
}: Props) => {
  const [open, setOpen] = useState(false);
  const { userId } = useAuth();
  const { user } = usePermissions();
  const {
    mutateCancelCompra,
    isPending,
    errorMessage,
    clearCancelError,
  } = useCancelCompraSolicitacaoItem();

  const role = user?.role_name?.toLowerCase();
  const hoje = todaySpIso();
  const dataMissao = missionDate.slice(0, 10);
  const temPermissao =
    isAdmin(user) || hasPermission(user, "compras:cancelar");
  const compradorPodeNesteContexto =
    role === "comprador" &&
    dataMissao === hoje &&
    missionCompradorId !== "" &&
    userId !== null &&
    missionCompradorId === userId;
  const financeiroOuAdmin =
    role === "financeiro" || role === "administrador" || isAdmin(user);

  const visivel =
    comprado &&
    temPermissao &&
    (financeiroOuAdmin || compradorPodeNesteContexto);

  if (!visivel) return null;

  const handleConfirm = () => {
    mutateCancelCompra.mutate(itemId, {
      onSuccess: () => setOpen(false),
    });
  };

  const isTable = variant === "table";

  return (
    <>
      <Button
        size="small"
        color="warning"
        variant={isTable ? "outlined" : "text"}
        sx={
          isTable
            ? { minWidth: 120, fontSize: "0.75rem" }
            : { textTransform: "none", fontWeight: 600 }
        }
        onClick={() => {
          clearCancelError();
          setOpen(true);
        }}
      >
        Cancelar compra
      </Button>

      <Dialog
        open={open}
        onClose={() => {
          clearCancelError();
          setOpen(false);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Cancelar compra?</DialogTitle>
        <DialogContent>
          {errorMessage ? (
            <Alert severity="error" sx={{ mb: 2 }} onClose={clearCancelError}>
              {errorMessage}
            </Alert>
          ) : null}
          O item volta a <strong>não comprado</strong> e os dados do fornecedor
          e valores desta compra são limpos. Se o lote ainda não tiver sido
          integrado ao SIDI, a fila é ajustada; caso já integrado, o cancelamento
          é bloqueado.
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={isPending}>
            Voltar
          </Button>
          <Button
            color="warning"
            variant="contained"
            onClick={handleConfirm}
            disabled={isPending}
          >
            Confirmar cancelamento
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CancelarCompraButton;
