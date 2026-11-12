import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, LogOut, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useStore } from "../context/StoreContext.jsx";

export default function AdminLoginPage() {
  const { adminLogin, logout, user, authError, setAuthError, isAuthenticated, isAdmin, loading } = useAuth();
  const { notify } = useStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAuthError("");
  }, [setAuthError]);

  useEffect(() => {
    if (!loading && isAuthenticated && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [loading, isAuthenticated, isAdmin, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminLogin(email, password);
      notify("Signed in to S. SAWANT Admin Dashboard.");
      navigate("/admin", { replace: true });
    } catch {
      // error is set in AuthContext
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-shell auth-page">
      <div className="auth-page-layout">
        <div className="auth-page-aside">
          <span className="eyebrow">S. SAWANT · Restricted Atelier Portal</span>
          <h1>Administrator Sign In</h1>
          <p>Authorised S. SAWANT administrators only. Sign in with your provisioned administrator credentials to manage products, fabrics, orders, and appointments.</p>
          <div className="admin-security-badge" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 16, color: "var(--gold-pale)", fontSize: 11 }}>
            <ShieldCheck size={16} /> Role-based access control active
          </div>
        </div>

        <div className="auth-page-form-wrap">
          {isAuthenticated && !isAdmin && (
            <div className="upi-pending-banner" style={{ marginBottom: 16 }}>
              <strong>Signed in as customer ({user?.email}).</strong>
              <p style={{ margin: "6px 0 10px" }}>Sign out of the customer session or sign in directly with an administrator account below.</p>
              <button type="button" className="button button-outline" onClick={logout}>
                <LogOut size={14} /> Sign Out Customer
              </button>
            </div>
          )}
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field-control">
              <span>Administrator Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setAuthError(""); }}
                autoComplete="username"
                placeholder="admin@ssawant.in"
              />
            </label>

            <label className="field-control">
              <span>Password</span>
              <div className="password-field">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
                  autoComplete="current-password"
                  placeholder="Enter administrator password"
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {authError && <p className="form-error">{authError}</p>}

            <button className="button button-gold" type="submit" disabled={submitting}>
              {submitting ? "Verifying..." : "Sign In to Admin Dashboard"} <ArrowRight size={14} />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
