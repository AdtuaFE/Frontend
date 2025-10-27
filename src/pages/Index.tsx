import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to signup page
    navigate("/signup");
  }, [navigate]);

  return null;
};

export default Index;
