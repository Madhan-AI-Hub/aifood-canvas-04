// This page is now replaced by the Dashboard component - see App.tsx routing

import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to dashboard since this is now handled by routing
    navigate("/", { replace: true });
  }, [navigate]);

  return null;
};

export default Index;
