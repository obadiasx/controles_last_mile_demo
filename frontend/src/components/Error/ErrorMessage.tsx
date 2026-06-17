import { Box, Typography } from "@mui/material";
import { ErrorOutline } from "@mui/icons-material";

const ErrorMessage = ({ message }: { message: string }) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        backgroundColor: "rgba(255, 235, 238, 0.8)",
        border: "1px solid #f44336",
        borderRadius: "8px",
        padding: "8px 12px",
        mt: 1,
        boxShadow: "0 2px 6px rgba(244, 67, 54, 0.2)",
      }}
    >
      <ErrorOutline sx={{ color: "#f44336" }} />
      <Typography
        variant="body2"
        sx={{
          color: "#d32f2f",
          fontWeight: 500,  
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};

export default ErrorMessage;
