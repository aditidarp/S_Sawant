import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useStore } from "../context/StoreContext.jsx";

export function AuthModal({ open, onClose, onSuccess }) {
  const [mode, setMode] = useState("login");
  if (!open) return null;

  return (
    <div className="auth-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="auth-modal" role="dialog" aria-modal="true">
        <button className="auth-modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <div className="auth-modal-brand">
          <span className="eyebrow">S. SAWANT · The Art of Fine Tailoring</span>
          <h2>{mode === "login" ? "Welcome Back" : "Create Your Account"}</h2>
          <p>{mode === "login"
            ? "Sign in to continue your bespoke experience."
            : "Join S. SAWANT for a personalised tailoring journey."}</p>
        </div>
        {mode === "login"
          ? <LoginForm onSwitch={() => setMode("signup")} onSuccess={onSuccess} />
          : <SignupForm onSwitch={() => setMode("login")} onSuccess={onSuccess} />}
      </div>
    </div>
  );
}

export function AuthGateModal({ open, onClose }) {
  const navigate = useNavigate();
  const { pendingAction } = useStore();
  if (!open) return null;

  const redirectPath = pendingAction?.redirectTo || window.location.pathname + window.location.search;

  return (
    <div className="auth-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="auth-modal auth-gate-modal" role="dialog" aria-modal="true" aria-labelledby="auth-gate-title">
        <button className="auth-modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <div className="auth-gate-content">
          <span className="auth-gate-icon"><Lock size={28} strokeWidth={1.4} /></span>
          <h2 id="auth-gate-title">CREATE YOUR ACCOUNT FIRST!</h2>
          <p>Please sign up or log in to continue shopping and place your order.</p>
          <div className="auth-gate-actions">
            <button className="button button-gold" onClick={() => { onClose(); navigate(`/signup?redirect=${encodeURIComponent(redirectPath)}`); }}>
              SIGN UP <ArrowRight size={14} />
            </button>
            <button className="button button-outline" onClick={() => { onClose(); navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`); }}>
              LOG IN <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginForm({ onSwitch, onSuccess, standalone = false }) {
  const { login, resetPassword, authError, setAuthError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (resetMode) {
      setLoading(true);
      try {
        await resetPassword(email);
        setResetSent(true);
      } catch { /* error set in context */ }
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      if (onSuccess) onSuccess();
    } catch { /* error set in context */ }
    setLoading(false);
  }

  if (resetMode) {
    return (
      <form className="auth-form" onSubmit={handleSubmit}>
        <h3>Reset Password</h3>
        {resetSent
          ? <p className="auth-success">Password reset email sent! Check your inbox.</p>
          : <>
              <label className="field-control"><span>Email address</span>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="your@email.com" />
              </label>
              {authError && <p className="form-error">{authError}</p>}
              <button className="button button-gold" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"} <ArrowRight size={14} />
              </button>
            </>}
        <button type="button" className="text-button auth-switch" onClick={() => { setResetMode(false); setAuthError(""); }}>
          Back to login
        </button>
      </form>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="field-control"><span>Email address or mobile number</span>
        <input type="text" required value={email} onChange={(e) => { setEmail(e.target.value); setAuthError(""); }} autoComplete="username" placeholder="your@email.com or +91..." />
      </label>
      <label className="field-control"><span>Password</span>
        <div className="password-field">
          <input type={showPw ? "text" : "password"} required value={password} onChange={(e) => { setPassword(e.target.value); setAuthError(""); }} autoComplete="current-password" placeholder="Enter your password" />
          <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide password" : "Show password"}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </label>
      {authError && <p className="form-error">{authError}</p>}
      <button className="button button-gold" type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign In"} <ArrowRight size={14} />
      </button>
      <button type="button" className="text-button auth-forgot" onClick={() => { setResetMode(true); setAuthError(""); }}>
        Forgot your password?
      </button>
      <div className="auth-divider"><span>or</span></div>
      <p className="auth-switch-text">
        Don't have an account? <button type="button" className="text-button" onClick={onSwitch}>Create one</button>
      </p>
    </form>
  );
}

export function SignupForm({ onSwitch, onSuccess, standalone = false }) {
  const { signup, authError, setAuthError } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setLocalError("");
    setAuthError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setLocalError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }
    if (!/^[+]?[0-9]{10,15}$/.test(form.phone.replace(/\s/g, ""))) {
      setLocalError("Enter a valid mobile number (10–15 digits).");
      return;
    }
    setLoading(true);
    try {
      await signup({ name: form.name, email: form.email, phone: form.phone.replace(/\s/g, ""), password: form.password });
      if (onSuccess) onSuccess();
    } catch { /* error set in context */ }
    setLoading(false);
  }

  const error = localError || authError;

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="field-control"><span>Full name</span>
        <input required value={form.name} onChange={(e) => update("name", e.target.value)} autoComplete="name" placeholder="Your full name" />
      </label>
      <label className="field-control"><span>Email address</span>
        <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" placeholder="your@email.com" />
      </label>
      <label className="field-control"><span>Mobile number</span>
        <input type="tel" required value={form.phone} onChange={(e) => update("phone", e.target.value)} autoComplete="tel" placeholder="+91 XXXXX XXXXX" />
      </label>
      <label className="field-control"><span>Password</span>
        <div className="password-field">
          <input type={showPw ? "text" : "password"} required minLength={6} value={form.password} onChange={(e) => update("password", e.target.value)} autoComplete="new-password" placeholder="At least 6 characters" />
          <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide" : "Show"}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </label>
      <label className="field-control"><span>Confirm password</span>
        <input type={showPw ? "text" : "password"} required value={form.confirm} onChange={(e) => update("confirm", e.target.value)} autoComplete="new-password" placeholder="Re-enter password" />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="button button-gold" type="submit" disabled={loading}>
        {loading ? "Creating account..." : "Create Account"} <ArrowRight size={14} />
      </button>
      <div className="auth-divider"><span>or</span></div>
      <p className="auth-switch-text">
        Already have an account? <button type="button" className="text-button" onClick={onSwitch}>Sign in</button>
      </p>
    </form>
  );
}

function useCompletePendingAuth(navigate, redirect) {
  const { pendingAction, setPendingAction, addToCart, notify } = useStore();
  return (isSignup = false) => {
    if (pendingAction?.item) {
      addToCart(pendingAction.item);
      const target = pendingAction.type === "buy-now" ? "/checkout" : (pendingAction.redirectTo || redirect);
      setPendingAction(null);
      notify(isSignup ? "Account created! Your selection has been added to your bag." : "Welcome back! Your selection has been added to your bag.");
      navigate(target);
      return;
    }
    if (isSignup) notify("Account created successfully! Welcome to S. SAWANT.");
    else notify("Welcome back to S. SAWANT.");
    setPendingAction(null);
    navigate(redirect);
  };
}

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const completeAuth = useCompletePendingAuth(navigate, redirect);

  return (
    <main className="page-shell auth-page">
      <div className="auth-page-layout">
        <div className="auth-page-aside">
          <span className="eyebrow">S. SAWANT</span>
          <h1>Welcome back.</h1>
          <p>Sign in to access your bespoke orders, saved measurements, and personalised recommendations.</p>
        </div>
        <div className="auth-page-form-wrap">
          <LoginForm
            standalone
            onSwitch={() => navigate(`/signup?redirect=${encodeURIComponent(redirect)}`)}
            onSuccess={() => completeAuth(false)}
          />
        </div>
      </div>
    </main>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const completeAuth = useCompletePendingAuth(navigate, redirect);

  return (
    <main className="page-shell auth-page">
      <div className="auth-page-layout">
        <div className="auth-page-aside">
          <span className="eyebrow">S. SAWANT</span>
          <h1>Begin your journey.</h1>
          <p>Create an account to explore custom tailoring, save your measurements, and place orders.</p>
        </div>
        <div className="auth-page-form-wrap">
          <SignupForm
            standalone
            onSwitch={() => navigate(`/login?redirect=${encodeURIComponent(redirect)}`)}
            onSuccess={() => completeAuth(true)}
          />
        </div>
      </div>
    </main>
  );
}
