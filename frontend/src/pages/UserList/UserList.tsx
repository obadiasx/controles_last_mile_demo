import { Box, TextField, Typography } from "@mui/material";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import UserCard from "../../components/Cards/UserCard/UserCard";
import { usePermissions } from "../../hooks/auth/usePermissions";
import { hasPermission } from "../../utils/permissions";

const UserList = () => {
  const navigate = useNavigate();
  const { user, isLoading } = usePermissions();

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    if (!hasPermission(user, "usuarios:listarTodos")) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          mt: 4,
        }}
      >
        <Typography variant="h4">Lista de Usuários</Typography>

        <TextField
          variant="outlined"
          size="medium"
          placeholder="Busque por um usuário"
          sx={{ width: "300px", backgroundColor: "white" }}
        />

        <UserCard />
      </Box>
    </>
  );
};

export default UserList;
