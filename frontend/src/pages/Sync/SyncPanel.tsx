import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
} from "@mui/material";
import { Sync, Inventory2, Straighten, Store } from "@mui/icons-material";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { AuthStore } from "../../stores/AuthStore";
import { usePermissions } from "../../hooks/auth/usePermissions";
import { isAdmin } from "../../utils/permissions";
import { useSincronizeProducts } from "../../hooks/sincronize/useSincronizeProducts";
import { useSincronizeUnits } from "../../hooks/sincronize/useSincronizeUnits";
import { useSincronizeSuppliers } from "../../hooks/sincronize/useSincronizeSuppliers";
import LoadingScreen from "../../components/Loading/LoadingScreen";
import ErrorMessage from "../../components/Error/ErrorMessage";

const SyncPanel = () => {
  const navigate = useNavigate();
  const { token } = AuthStore((state) => state);
  const { user, isLoading: loadingPerms, error: errorPerms } = usePermissions();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { mutateSincronizeProducts, sincronizeError: errProducts } = useSincronizeProducts();
  const { mutateSincronizeUnits, sincronizeError: errUnits } = useSincronizeUnits();
  const { mutateSincronizeSuppliers, sincronizeError: errSuppliers } = useSincronizeSuppliers();
  const syncingProducts = mutateSincronizeProducts.isPending;
  const syncingUnits = mutateSincronizeUnits.isPending;
  const syncingSuppliers = mutateSincronizeSuppliers.isPending;

  useEffect(() => {
    if (loadingPerms) return;
    if (!user) return;
    if (!isAdmin(user)) {
      navigate("/login");
    }
  }, [user, loadingPerms, navigate]);

  const handleSyncProducts = () => {
    setSuccessMsg(null);
    mutateSincronizeProducts.mutate(token!, {
      onSuccess: () => setSuccessMsg("Produtos sincronizados com sucesso!"),
      onError: () => setSuccessMsg(null),
    });
  };
  const handleSyncUnits = () => {
    setSuccessMsg(null);
    mutateSincronizeUnits.mutate(undefined, {
      onSuccess: () => setSuccessMsg("Unidades sincronizadas com sucesso!"),
      onError: () => setSuccessMsg(null),
    });
  };
  const handleSyncSuppliers = () => {
    setSuccessMsg(null);
    mutateSincronizeSuppliers.mutate(undefined, {
      onSuccess: () => setSuccessMsg("Fornecedores sincronizados com sucesso!"),
      onError: () => setSuccessMsg(null),
    });
  };

  if (loadingPerms) return <LoadingScreen />;
  if (errorPerms) return <ErrorMessage message="Usuário não autenticado" />;

  const syncError = errProducts || errUnits || errSuppliers;

  const syncCards = [
    {
      title: "Produtos",
      description: "Sincroniza o catálogo de produtos com o sistema de origem",
      icon: <Inventory2 sx={{ fontSize: 40, color: "#8542F9" }} />,
      onSync: handleSyncProducts,
      loading: syncingProducts,
    },
    {
      title: "Unidades",
      description: "Sincroniza unidades de medida",
      icon: <Straighten sx={{ fontSize: 40, color: "#8542F9" }} />,
      onSync: handleSyncUnits,
      loading: syncingUnits,
    },
    {
      title: "Fornecedores",
      description: "Sincroniza o cadastro de fornecedores",
      icon: <Store sx={{ fontSize: 40, color: "#8542F9" }} />,
      onSync: handleSyncSuppliers,
      loading: syncingSuppliers,
    },
  ];

  return (
    <Box sx={{ maxWidth: 800, mx: "auto" }}>
      <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 1 }}>
        Sincronização de Dados
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Sincronize dados do sistema de origem para o ERP. Execute conforme necessário.
      </Typography>

      {successMsg && (
        <Typography
          variant="body2"
          color="success.main"
          sx={{ mb: 2, fontWeight: 500 }}
        >
          {successMsg}
        </Typography>
      )}
      {syncError && (
        <ErrorMessage message={syncError} />
      )}

      <Grid container spacing={3}>
        {syncCards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={card.title}>
            <Card
              sx={{
                height: "100%",
                borderRadius: 2,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>{card.icon}</Box>
                <Typography variant="h6" fontWeight={600}>
                  {card.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {card.description}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Sync />}
                  onClick={card.onSync}
                  disabled={card.loading}
                  sx={{
                    mt: "auto",
                    bgcolor: "#8542F9",
                    "&:hover": { bgcolor: "#6B35D9" },
                  }}
                >
                  {card.loading ? "Sincronizando..." : "Sincronizar"}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default SyncPanel;
