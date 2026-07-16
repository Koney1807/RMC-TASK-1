import { FormEvent, useState } from "react";
import { signup } from "../api/client";

interface Props {
  onSignedUp: (username: string) => void;
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,30}$/;

export default function Signup({ onSignedUp }: Props) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    if (!USERNAME_PATTERN.test(trimmedUsername)) {
      setError("Username must be 3-30 characters: letters, numbers, and _ . - only.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setChecking(true);
    try {
      const { username: newUsername } = await signup(trimmedUsername, email.trim(), password);
      onSignedUp(newUsername);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
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
      <h1>Create an Account</h1>
      <p className="subtitle">Sign up to get access to the registrations dashboard.</p>

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
              minLength={3}
              maxLength={30}
              aria-describedby="username-hint"
            />
            <p className="hint" id="username-hint">
              3-30 characters: letters, numbers, and _ . - only.
            </p>
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              aria-describedby="password-hint"
            />
            <p className="hint" id="password-hint">At least 8 characters.</p>
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn-primary" type="submit" disabled={checking}>
            {checking ? "Creating account…" : "Sign Up"}
          </button>
        </form>
      </div>

      <a className="footer-link" href="/login">
        Already have an account? Log in →
      </a>
    </div>
  );
}
