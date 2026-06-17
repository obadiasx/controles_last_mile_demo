import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import LogoSaborDaTerra from "../../assets/sabordaterralogo.png";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { ILoginForm } from "../../interfaces/ILogin";
import { useLogin } from "../../hooks/auth/useLogin";
import ErrorMessage from "../../components/Error/ErrorMessage";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const {mutateLogin, errorMessage} = useLogin();

  const { control, handleSubmit } = useForm<ILoginForm>({
    defaultValues: {
      username: "",
      password: "",
    },
  });


  const onSubmit = (data: ILoginForm) => {
    mutateLogin.mutate(data);
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "96vh",
          width: "100%",
          px: 2,
        }}
      >
        <Card
          sx={{
            padding: { xs: 1.5, sm: 2 },
            borderRadius: "15px",
            width: "100%",
            maxWidth: 420,
            minWidth: 280,
            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.1)",
            borderColor: "#8542F960",
            borderWidth: "0.1px",
            borderStyle: "solid",
          }}
        >
          <CardContent sx={{ textAlign: "center" }}>
            <img
              src={LogoSaborDaTerra}
              alt="Logo Sabor da Terra"
              style={{ width: "60%", marginBottom: "5%" }}
            />
            <Box
              sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}
            >
              <Typography
                sx={{ fontFamily: "Rhodium Libre" }}
                variant="h5"
                component="div"
                gutterBottom
              >
                ERP SABOR DA TERRA
              </Typography>

              <form onSubmit={handleSubmit(onSubmit)}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Controller
                    name="username"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        variant="outlined"
                        size="medium"
                        label="Digite seu usuario"
                        fullWidth
                        onFocus={(e) =>
                          (e.target.style.borderColor = "#000000")
                        }
                        {...field}
                      />
                    )}
                  />

                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        variant="outlined"
                        size="medium"
                        label="Digite sua senha"
                        fullWidth
                        type={showPassword ? "text" : "password"}
                        {...field}
                        onFocus={(e) =>
                          (e.target.style.borderColor = "#000000")
                        }
                        InputProps={{
                          endAdornment: (
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <VisibilityOff />
                              ) : (
                                <Visibility />
                              )}
                            </IconButton>
                          ),
                        }}
                      />
                    )}
                  />

                  <Button
                    sx={{ backgroundColor: "#8542F9" }}
                    size="large"
                    variant="contained"
                    type="submit"
                  >
                    Entrar
                  </Button>
                  {errorMessage && <ErrorMessage message={errorMessage} />}
                </Box>
              </form>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </>
  );
};

export default Login;
