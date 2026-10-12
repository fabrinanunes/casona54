import { useState, useEffect } from "react";

import Login from "./components/Login/Login";
import Dashboard from "./components/Dashboard/Dashboard";
import { getCurrentUser, logout } from "./services/authService";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        await getCurrentUser();

        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  if (isLoading) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Erro ao realizar logout:", error);
    }
  };

  if (isAuthenticated) {
    return <Dashboard onLogout={handleLogout} />;
  }

  return <Login onLogin={() => setIsAuthenticated(true)} />;
}

export default App;
