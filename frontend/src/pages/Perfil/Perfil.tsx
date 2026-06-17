import { Box, Card, CardContent, Typography } from "@mui/material";
import { Person } from "@mui/icons-material";
import { usePermissions } from "../../hooks/auth/usePermissions";

const Perfil = () => {
  const { user } = usePermissions();

  return (
    <Box sx={{ maxWidth: 500, mx: "auto" }}>
      <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
        Meu Perfil
      </Typography>
      <Card
        sx={{
          borderRadius: 2,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          borderLeft: "4px solid #8542F9",
        }}
      >
        <CardContent sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
          <Person sx={{ fontSize: 48, color: "#8542F9" }} />
          <Box>
            <Typography variant="h6" fontWeight={600}>
              {user?.name_full || user?.name || user?.username || "—"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Usuário: {user?.username || "—"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              E-mail: {user?.email || "—"}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Perfil;
