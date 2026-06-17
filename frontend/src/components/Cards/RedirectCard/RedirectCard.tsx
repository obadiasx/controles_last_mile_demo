import { Card, CardContent, Typography } from "@mui/material";
import { Link } from "react-router";
import type { IRedirect } from "../../../interfaces/IRedirect";

const RedirectCard = ({link, name}: IRedirect) => {
  return (
    <>
      <Link to={link} style={{ textDecoration: "none" }}>
        <Card
          sx={{
            borderRadius: "15px",
            width: "100%",
            minWidth: { xs: 280, sm: 320 },
            maxWidth: 400,
            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.1)",
            borderColor: "#8542F960",
            borderWidth: "0.1px",
            borderStyle: "solid",
          }}
        >
          <CardContent sx={{ textAlign: "center" }}>
            <Typography
              sx={{ fontFamily: "Rhodium Libre", mt: 2 }}
              variant="h5"
              component="div"
              gutterBottom
            >
              {name}
            </Typography>
          </CardContent>
        </Card>
      </Link>
    </>
  );
};

export default RedirectCard;
