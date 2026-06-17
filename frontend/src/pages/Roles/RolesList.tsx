import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
} from "@mui/material";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useFetchRoles } from "../../hooks/fetch/roles/useFetchRoles";
import { usePermissions } from "../../hooks/auth/usePermissions";
import { hasPermission } from "../../utils/permissions";
import LoadingScreen from "../../components/Loading/LoadingScreen";
import ErrorMessage from "../../components/Error/ErrorMessage";

const RolesList = () => {
  const navigate = useNavigate();
  const { user, isLoading: loadingPerms, error: errorPerms } = usePermissions();
  const { roles, isLoading, isError, error } = useFetchRoles();

  useEffect(() => {
    if (loadingPerms) return;
    if (!user) return;
    if (!hasPermission(user, "usuarios:listarRoles")) {
      navigate("/login");
    }
  }, [user, loadingPerms, navigate]);

  if (loadingPerms || isLoading) return <LoadingScreen />;
  if (errorPerms) return <ErrorMessage message="Usuário não autenticado" />;
  if (isError) return <ErrorMessage message={error?.message || "Erro ao carregar permissões"} />;

  return (
    <Box sx={{ maxWidth: 900, mx: "auto" }}>
      <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
        Roles e Permissões
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Lista de permissões disponíveis no sistema (somente leitura).
      </Typography>
      <Grid container spacing={2}>
        {roles.map((role) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={role.id}>
            <Card
              sx={{
                borderLeft: "4px solid #8542F9",
                borderRadius: 2,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <CardContent>
                <Chip
                  label={role.name}
                  size="small"
                  sx={{
                    bgcolor: "#8542F920",
                    color: "#8542F9",
                    fontWeight: 600,
                    mb: 1,
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  ID: {role.id}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {roles.length === 0 && (
        <Typography color="text.secondary">Nenhuma permissão encontrada.</Typography>
      )}
    </Box>
  );
};

export default RolesList;
