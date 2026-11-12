import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthGateModal, LoginPage, SignupPage } from "./components/AuthComponents.jsx";
import { CartDrawer, Footer, Header, Toast } from "./components/SiteChrome.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { StoreProvider, useStore } from "./context/StoreContext.jsx";
import AdminLoginPage from "./pages/AdminLoginPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import ContactPage from "./pages/ContactPage.jsx";
import CustomerDashboard from "./pages/CustomerDashboard.jsx";
import CustomTailoringPage from "./pages/CustomTailoringPage.jsx";
import FabricsPage from "./pages/FabricsPage.jsx";
import TrackOrderPage from "./pages/TrackOrderPage.jsx";
import {
  AboutPage,
  AppointmentPage,
  CheckoutPage,
  HomePage,
  NotFoundPage,
  ProductPage,
  ShopPage,
} from "./pages/StorePages.jsx";

const PAGE_TITLES = {
  "/": "S. SAWANT — The Art of Fine Tailoring | Bespoke Indian Menswear",
  "/shop": "Shop Collection — S. SAWANT Menswear",
  "/custom-tailoring": "Custom Tailoring — S. SAWANT Menswear",
  "/fabrics": "Premium Fabrics — Raymond, Siyaram's, Arvind, Linen Club | S. SAWANT",
  "/about": "Our Story — S. SAWANT Menswear",
  "/contact": "Contact Us — S. SAWANT Mens Wear, Chhatrapati Sambhajinagar",
  "/appointment": "Book a Fitting — S. SAWANT Menswear",
  "/account": "My Account — S. SAWANT Menswear",
  "/login": "Log In — S. SAWANT Menswear",
  "/signup": "Create Account — S. SAWANT Menswear",
  "/checkout": "Checkout — S. SAWANT Menswear",
  "/track-order": "Track Your Order — S. SAWANT Menswear",
  "/admin": "Admin Dashboard — S. SAWANT Menswear",
  "/admin/login": "Administrator Sign In — S. SAWANT Menswear",
};

function ProtectedAdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) {
    return (
      <main className="page-shell not-found">
        <span className="eyebrow">S. SAWANT</span>
        <p>Verifying administrator session...</p>
      </main>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  if (!isAdmin) {
    return (
      <main className="page-shell not-found">
        <span className="eyebrow">403 · Access Denied</span>
        <h1>Administrator privileges required.</h1>
        <p>Customer accounts cannot access the S. SAWANT admin dashboard.</p>
      </main>
    );
  }
  return children;
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    document.title = PAGE_TITLES[pathname] || "S. SAWANT — The Art of Fine Tailoring";
    if (hash) {
      requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [pathname, hash]);
  return null;
}

function StoreApplication() {
  const { notice, setNotice, authGateOpen, setAuthGateOpen } = useStore();
  const [cartOpen, setCartOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function showError(event) {
      setError(event.detail?.message || "The product image could not be loaded.");
      window.setTimeout(() => setError(""), 5000);
    }
    window.addEventListener("ssawant:image-error", showError);
    return () => window.removeEventListener("ssawant:image-error", showError);
  }, []);

  return (
    <>
      <ScrollToTop />
      <Header onCart={() => setCartOpen(true)} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/custom-tailoring" element={<CustomTailoringPage />} />
        <Route path="/fabrics" element={<FabricsPage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/appointment" element={<AppointmentPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/account" element={<CustomerDashboard />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/track-order" element={<TrackOrderPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/*" element={<ProtectedAdminRoute><AdminPage /></ProtectedAdminRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <AuthGateModal open={authGateOpen} onClose={() => setAuthGateOpen(false)} />
      <Toast message={error || notice} />
      {notice && <button className="toast-dismiss" onClick={() => setNotice("")} aria-label="Dismiss notification">×</button>}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <StoreApplication />
      </StoreProvider>
    </AuthProvider>
  );
}
