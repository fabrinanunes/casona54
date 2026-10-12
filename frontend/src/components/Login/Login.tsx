import { useState } from "react";
import "./Login.css";
import { login } from "../../services/authService";

type LoginProps = {
  onLogin: () => void;
};

function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    setError("");

    try {
      await login({
        email,
        password,
      });

      onLogin();
    } catch (error) {
      console.error("Erro ao realizar login:", error);
      setError("Usuário ou senha incorretos.");
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
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error && <p className="login__error">{error}</p>}
          <button type="submit">Entrar</button>
        </form>

        <p className="login__footer">
          Área privada • use as credenciais combinadas
        </p>
      </section>
    </main>
  );
}

export default Login;
