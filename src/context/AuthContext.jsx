import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase.js";

const AuthContext = createContext(null);

const IS_FIREBASE_CONFIGURED = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_API_KEY !== "PLACEHOLDER_API_KEY"
);
const LOCAL_USERS_KEY = "ssawant-v2:local-users";
const LOCAL_SESSION_KEY = "ssawant-v2:local-session";

function getLocalUsers() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalUsers(users) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [hasAdminClaim, setHasAdminClaim] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!IS_FIREBASE_CONFIGURED) {
      try {
        const session = JSON.parse(localStorage.getItem(LOCAL_SESSION_KEY) || "null");
        if (session) {
          setUser(session);
          setProfile(session);
          setHasAdminClaim(session.role === "admin");
        }
      } catch {
        // ignore
      }
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const [tokenResult, snap] = await Promise.all([
            firebaseUser.getIdTokenResult(),
            getDoc(doc(db, "users", firebaseUser.uid)),
          ]);
          setHasAdminClaim(Boolean(tokenResult?.claims?.admin));
          if (snap.exists()) {
            setProfile(snap.data());
          } else {
            setProfile({ name: firebaseUser.displayName || "", email: firebaseUser.email, role: "customer" });
          }
        } catch {
          setHasAdminClaim(false);
        }
      } else {
        setProfile(null);
        setHasAdminClaim(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signup = useCallback(async ({ name, email, phone, password }) => {
    setAuthError("");
    const normalizedEmail = email.trim().toLowerCase();

    if (!IS_FIREBASE_CONFIGURED) {
      const users = getLocalUsers();
      if (users.some((u) => u.email === normalizedEmail)) {
        const msg = "An account with this email already exists. Please log in.";
        setAuthError(msg);
        throw new Error(msg);
      }
      const newUser = {
        uid: `local-${Date.now()}`,
        displayName: name.trim(),
        name: name.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        password,
        role: "customer",
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
        addresses: [],
        measurements: {},
      };
      saveLocalUsers([...users, newUser]);
      const sessionUser = { ...newUser };
      delete sessionUser.password;
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(sessionUser));
      setUser(sessionUser);
      setProfile(sessionUser);
      setHasAdminClaim(false);
      return sessionUser;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      const userDoc = {
        name,
        email: normalizedEmail,
        phone,
        role: "customer",
        createdAt: serverTimestamp(),
        addresses: [],
        measurements: {},
      };
      try {
        await setDoc(doc(db, "users", cred.user.uid), userDoc);
        const snap = await getDoc(doc(db, "users", cred.user.uid));
        if (snap.exists()) setProfile(snap.data());
      } catch {
        setProfile(userDoc);
      }
      setHasAdminClaim(false);
      return cred.user;
    } catch (err) {
      const msg = mapAuthError(err.code);
      setAuthError(msg);
      throw new Error(msg);
    }
  }, []);

  const login = useCallback(async (emailOrPhone, password) => {
    setAuthError("");
    const identifier = emailOrPhone.trim().toLowerCase();

    if (!IS_FIREBASE_CONFIGURED) {
      const users = getLocalUsers();
      const found = users.find((u) => u.email === identifier || u.phone === emailOrPhone.trim());
      if (!found) {
        const msg = "You don't have an account yet. Please sign up first.";
        setAuthError(msg);
        throw new Error(msg);
      }
      if (found.password !== password) {
        const msg = "Incorrect password. Please try again.";
        setAuthError(msg);
        throw new Error(msg);
      }
      const sessionUser = { ...found };
      delete sessionUser.password;
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(sessionUser));
      setUser(sessionUser);
      setProfile(sessionUser);
      setHasAdminClaim(sessionUser.role === "admin");
      return sessionUser;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, emailOrPhone, password);
      const [tokenResult, snap] = await Promise.all([
        cred.user.getIdTokenResult(),
        getDoc(doc(db, "users", cred.user.uid)).catch(() => null),
      ]);
      setHasAdminClaim(Boolean(tokenResult?.claims?.admin));
      if (snap?.exists()) {
        setProfile(snap.data());
      } else {
        setProfile({ name: cred.user.displayName || "", email: emailOrPhone, role: "customer" });
      }
      return cred.user;
    } catch (err) {
      const msg = mapAuthError(err.code);
      setAuthError(msg);
      throw new Error(msg);
    }
  }, []);

  const adminLogin = useCallback(async (email, password) => {
    setAuthError("");
    const normalizedEmail = email.trim().toLowerCase();

    if (!IS_FIREBASE_CONFIGURED) {
      const users = getLocalUsers();
      const found = users.find((u) => u.email === normalizedEmail);
      if (!found) {
        const msg = "Administrator account not found. Provision an admin account using the backend setup script.";
        setAuthError(msg);
        throw new Error(msg);
      }
      if (found.password !== password) {
        const msg = "Incorrect administrator credentials.";
        setAuthError(msg);
        throw new Error(msg);
      }
      if (found.role !== "admin") {
        const msg = "Access denied: This account does not have administrator privileges.";
        setAuthError(msg);
        throw new Error(msg);
      }
      const sessionUser = { ...found };
      delete sessionUser.password;
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(sessionUser));
      setUser(sessionUser);
      setProfile(sessionUser);
      setHasAdminClaim(true);
      return sessionUser;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      const [tokenResult, snap] = await Promise.all([
        cred.user.getIdTokenResult(true),
        getDoc(doc(db, "users", cred.user.uid)).catch(() => null),
      ]);
      const claimAdmin = Boolean(tokenResult?.claims?.admin);
      const docAdmin = snap?.exists() && snap.data()?.role === "admin";
      if (!claimAdmin && !docAdmin) {
        await signOut(auth);
        setUser(null);
        setProfile(null);
        setHasAdminClaim(false);
        const msg = "Access denied: This account does not have administrator privileges.";
        setAuthError(msg);
        throw new Error(msg);
      }
      setHasAdminClaim(claimAdmin);
      setProfile(snap?.exists() ? snap.data() : { name: cred.user.displayName || "Admin", email: normalizedEmail, role: "admin" });
      return cred.user;
    } catch (err) {
      const msg = err.code ? mapAuthError(err.code) : err.message;
      setAuthError(msg);
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(async () => {
    if (!IS_FIREBASE_CONFIGURED) {
      localStorage.removeItem(LOCAL_SESSION_KEY);
      setUser(null);
      setProfile(null);
      setHasAdminClaim(false);
      return;
    }
    await signOut(auth);
    setProfile(null);
    setHasAdminClaim(false);
  }, []);

  const resetPassword = useCallback(async (email) => {
    setAuthError("");
    if (!IS_FIREBASE_CONFIGURED) {
      const users = getLocalUsers();
      const found = users.find((u) => u.email === email.trim().toLowerCase());
      if (!found) {
        const msg = "You don't have an account yet. Please sign up first.";
        setAuthError(msg);
        throw new Error(msg);
      }
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      const msg = mapAuthError(err.code);
      setAuthError(msg);
      throw new Error(msg);
    }
  }, []);

  const updateUserProfile = useCallback(async (data) => {
    if (!user) return;
    // Prevent clients from elevating their own role
    const safeData = { ...data };
    delete safeData.role;

    if (!IS_FIREBASE_CONFIGURED) {
      const updated = { ...profile, ...safeData };
      setProfile(updated);
      setUser(updated);
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(updated));
      const users = getLocalUsers().map((u) => u.uid === user.uid ? { ...u, ...safeData } : u);
      saveLocalUsers(users);
      return;
    }
    try {
      await updateDoc(doc(db, "users", user.uid), safeData);
      setProfile((prev) => ({ ...prev, ...safeData }));
    } catch {
      setProfile((prev) => ({ ...prev, ...safeData }));
    }
  }, [user, profile]);

  const isAdmin = useMemo(() => {
    return Boolean(hasAdminClaim || profile?.role === "admin");
  }, [hasAdminClaim, profile]);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    authError,
    setAuthError,
    isAdmin,
    isFirebaseConfigured: IS_FIREBASE_CONFIGURED,
    signup,
    login,
    adminLogin,
    logout,
    resetPassword,
    updateUserProfile,
    isAuthenticated: !!user,
  }), [user, profile, loading, authError, isAdmin, signup, login, adminLogin, logout, resetPassword, updateUserProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider.");
  return ctx;
}

function mapAuthError(code) {
  switch (code) {
    case "auth/email-already-in-use": return "An account with this email already exists. Please log in.";
    case "auth/invalid-email": return "Please enter a valid email address.";
    case "auth/weak-password": return "Password must be at least 6 characters.";
    case "auth/user-not-found": return "You don't have an account yet. Please sign up first.";
    case "auth/wrong-password": return "Incorrect password. Please try again.";
    case "auth/invalid-credential": return "Invalid credentials. Please check your email and password.";
    case "auth/too-many-requests": return "Too many attempts. Please try again later.";
    case "auth/user-disabled": return "This account has been disabled. Contact support.";
    case "auth/network-request-failed": return "Network error. Please check your connection.";
    default: return "Authentication failed. Please try again.";
  }
}
