import { FormEvent, useState } from "react";
import { login } from "../api/client";

interface Props {
  onLoggedIn: (username: string) => void;
}

export default function Login({ onLoggedIn }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError(null);
    try {
      const { username: loggedInUsername } = await login(username.trim(), password);
      onLoggedIn(loggedInUsername);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="page">
      <div className="brand-row">
        <span className="brand-mark" />
        <p className="eyebrow">Technical Team · Club Events</p>
      </div>
      <h1>Log In</h1>
      <p className="subtitle">Sign in with your account to view and manage event registrations.</p>

      <div className="card">
        {error && <div className="banner-error" role="alert">{error}</div>}
        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn-primary" type="submit" disabled={checking}>
            {checking ? "Checking…" : "Log In"}
          </button>
        </form>
      </div>

      <a className="footer-link" href="/forgot-password">
        Forgot your password?
      </a>
      <br />
      <a className="footer-link" href="/signup">
        Don't have an account? Sign up →
      </a>
      <br />
      <a className="footer-link" href="/">
        ← Back to registration form
      </a>
    </div>
  );
}
