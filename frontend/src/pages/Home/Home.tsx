import { useEffect } from "react";
import { useNavigate } from "react-router";

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/login");
  }, [navigate]);

  return <div>Home Page</div>;
};

export default Home;
