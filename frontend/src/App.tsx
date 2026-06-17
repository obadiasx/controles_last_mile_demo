import { useEffect } from "react";
import { useNavigate } from "react-router";

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/login");
  }, [navigate]);

  return <h1> App </h1>;
}

export default App;
