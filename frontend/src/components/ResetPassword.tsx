import { FormEvent, useState } from "react";
import { resetPassword } from "../api/client";

export default function ResetPassword() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is missing its token. Please request a new one.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      const msg = await resetPassword(token, password);
      setMessage(msg);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset your password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>Reset Password</h1>
      <p className="subtitle">Choose a new password for your account.</p>

      <div className="card">
        {message && <div className="banner-success" role="status">{message}</div>}
        {error && <div className="banner-error" role="alert">{error}</div>}
        {!message && (
          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="password">New password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
                minLength={8}
              />
            </div>
            <div className="field">
              <label htmlFor="confirmPassword">Confirm new password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Resetting…" : "Reset password"}
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
