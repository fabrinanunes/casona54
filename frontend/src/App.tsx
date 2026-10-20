import { useState, useEffect } from "react";

import Login from "./components/Login/Login";
import Dashboard from "./components/Dashboard/Dashboard";
import { getCurrentUser, logout } from "./services/authService";
import { ApiError } from "./services/api";
import "./App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionRetry, setSessionRetry] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      setIsLoading(true);
      setSessionError(null);

      try {
        await getCurrentUser();

        if (isMounted) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        if (!isMounted) return;

        setIsAuthenticated(false);

        if (!(error instanceof ApiError && error.status === 401)) {
          setSessionError(
            "Não foi possível verificar sua sessão. Confira a conexão e tente novamente.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, [sessionRetry]);

  if (isLoading) {
    return (
      <main className="app-state" role="status" aria-live="polite">
        Verificando sua sessão...
      </main>
    );
  }

  if (sessionError) {
    return (
      <main className="app-state" role="alert">
        <p>{sessionError}</p>
        <button onClick={() => setSessionRetry((attempt) => attempt + 1)}>
          Tentar novamente
        </button>
      </main>
    );
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
