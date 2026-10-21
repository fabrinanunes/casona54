import { useState } from "react";
import { ApiError } from "../../services/api";
import { login } from "../../services/authService";

import "./Login.css";

type LoginProps = {
  onLogin: () => void;
};

function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      await login({
        email,
        password,
      });

      onLogin();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setError("Usuário ou senha incorretos.");
      } else if (error instanceof ApiError) {
        setError(error.message);
      } else {
        setError(
          "Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login">
      <section className="login__container">
        <div className="login__brand">
          <div className="login__icon">⌂</div>

          <h1>Nosso Lar</h1>

          <p>Controle financeiro da nossa construção</p>
        </div>

        <form className="login__form" onSubmit={handleLogin}>
          <div className="login__field">
            <label htmlFor="email">Usuário</label>

            <input
              id="email"
              type="text"
              placeholder="admin"
              value={email}
              disabled={isSubmitting}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="login__field">
            <label htmlFor="password">Senha</label>

            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              disabled={isSubmitting}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error && <p className="login__error">{error}</p>}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="login__footer">
          Área privada • use as credenciais combinadas
        </p>
      </section>
    </main>
  );
}

export default Login;
