import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RegistrationForm from "./components/RegistrationForm";
import Login from "./components/Login";
import Signup from "./components/Signup";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import AdminDashboard from "./components/AdminDashboard";
import NotFound from "./components/NotFound";
import { clearSession, getStoredUsername, getToken } from "./api/client";

export default function App() {
  // Real accounts: a signed-up user logs in and gets a JWT, stored in
  // localStorage (see api/client.ts) so a refresh doesn't log them out.
  const [username, setUsername] = useState<string | null>(() =>
    getToken() ? getStoredUsername() : null
  );

  function handleLogout() {
    clearSession();
    setUsername(null);
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RegistrationForm />} />
        <Route
          path="/login"
          element={
            username ? <Navigate to="/admin/dashboard" replace /> : <Login onLoggedIn={setUsername} />
          }
        />
        <Route
          path="/signup"
          element={
            username ? <Navigate to="/admin/dashboard" replace /> : <Signup onSignedUp={setUsername} />
          }
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin" element={<Navigate to={username ? "/admin/dashboard" : "/login"} replace />} />
        <Route
          path="/admin/dashboard"
          element={
            username ? (
              <AdminDashboard username={username} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
