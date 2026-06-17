import { Edit } from "@mui/icons-material";
import {
  Box,
  Card,
  CardContent,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";

const UserCard = () => {
  return (
    <>
      <Grid
        container
        sx={{
          justifyContent: "center",
        }}
      >
        <Grid
          size={{ xs: 12, sm: 10, md: 8, lg: 6 }}
          display="flex"
          justifyContent="center"
        >
          <Card
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              minHeight: "20vh",
              width: "100%",
              maxWidth: 600,
              borderLeft: "25px solid #8542F9",
              borderRadius: "8px",
              boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.1)",
              p: 2,
            }}
          >
            <CardContent sx={{ height: "100%" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  height: "100%",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <Typography variant="h5" fontWeight="bold">
                    Obadias
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    Obadias de Deus
                  </Typography>
                </Box>

                <IconButton>
                  <Edit fontSize="large" sx={{ color: "gray" }} />
                </IconButton>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
};

export default UserCard;
