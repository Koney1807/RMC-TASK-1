import { FormEvent, useState } from "react";
import { forgotPassword } from "../api/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const msg = await forgotPassword(email.trim());
      setMessage(msg);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process that request.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page">
      <h1>Forgot Password</h1>
      <p className="subtitle">
        Enter the email you signed up with and we'll send you a link to reset your password.
      </p>

      <div className="card">
        {message && <div className="banner-success" role="status">{message}</div>}
        {error && <div className="banner-error" role="alert">{error}</div>}
        {!message && (
          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>
            <button className="btn-primary" type="submit" disabled={sending}>
              {sending ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
      </div>

      <a className="footer-link" href="/login">
        ← Back to log in
      </a>
    </div>
  );
}
