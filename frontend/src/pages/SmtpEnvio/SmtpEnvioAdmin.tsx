import { Box, Container, Paper, Typography } from "@mui/material";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import SmtpSidiAdminPanel from "../../components/Admin/SmtpSidiAdminPanel";
import { usePermissions } from "../../hooks/auth/usePermissions";
import { isAdmin } from "../../utils/permissions";
import LoadingScreen from "../../components/Loading/LoadingScreen";
import { AuthStore } from "../../stores/AuthStore";

const BRAND = "#8542F9";

/**
 * Configuração de SMTP acessível ao administrador (envio SIDI e pedido ao fornecedor).
 */
export default function SmtpEnvioAdmin() {
  const navigate = useNavigate();
  const { token } = AuthStore((state) => state);
  const { user, isLoading } = usePermissions();

  useEffect(() => {
    if (isLoading || !user) return;
    if (!isAdmin(user)) {
      navigate("/menuredirect", { replace: true });
    }
  }, [user, isLoading, navigate]);

  if (isLoading || !user) {
    return <LoadingScreen />;
  }

  if (!isAdmin(user)) {
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 }, mt: { xs: 6, md: 8 } }}>
      <Paper
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
          mb: 2,
        }}
      >
        <Box
          sx={{
            background: `linear-gradient(135deg, ${BRAND} 0%, #6b35cc 100%)`,
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 2.5 },
          }}
        >
          <Typography
            variant="h5"
            component="h1"
            sx={{ color: "white", fontWeight: 700, letterSpacing: 0.2 }}
          >
            SMTP de envio (administração)
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "rgba(255,255,255,0.88)", mt: 0.5, maxWidth: 640 }}
          >
            Credenciais usadas nos envios automáticos do sistema: contingência SIDI e pedidos ao
            fornecedor por e-mail.
          </Typography>
        </Box>
        <Box sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
          <SmtpSidiAdminPanel
            token={token}
            active
            intro="Somente administradores alteram esta configuração. Após salvar, teste um envio na conferência ou em Pedido ao fornecedor."
          />
        </Box>
      </Paper>
    </Container>
  );
}
