import { CircularProgress, Box } from "@mui/material";

const LoadingScreen = () => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#f9f9f9"}}
    >
      <CircularProgress
        size={80}
        thickness={4}
        sx={{ color: "#8542F9" }}
      />
    </Box>
  );
};

export default LoadingScreen;
