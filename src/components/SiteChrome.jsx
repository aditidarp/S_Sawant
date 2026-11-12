import { useState } from "react";
import { ArrowRight, Heart, Menu, Minus, Plus, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useStore } from "../context/StoreContext.jsx";
import { formatPrice } from "../lib/format.js";
import { ImagePlaceholder } from "./ProductMedia.jsx";

function Logo({ footer = false }) {
  return (
    <Link to="/" className={`brand-lockup ${footer ? "brand-lockup-footer" : ""}`} aria-label="S. SAWANT home">
      <svg className="brand-symbol" viewBox="0 0 46 36" aria-hidden="true"><path d="M23 7c0-3 2-5 5-5 2 0 4 2 4 4 0 3-3 4-6 6L5 27h36L20 12" /></svg>
      <span><strong>S. SAWANT</strong><small>The Art of Fine Tailoring</small></span>
    </Link>
  );
}

export function Header({ onCart }) {
  const { cart, wishlist } = useStore();
  const { isAuthenticated, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const itemCount = cart.reduce((total, item) => total + (item.quantity || 1), 0);

  function submitSearch(event) {
    event.preventDefault();
    navigate(`/shop?q=${encodeURIComponent(query)}`);
    setSearchOpen(false);
    setMenuOpen(false);
  }

  const links = [
    ["HOME", "/"],
    ["SHOP", "/shop"],
    ["CUSTOM TAILORING", "/custom-tailoring"],
    ["FABRICS", "/fabrics"],
    ["OUR STORY", "/about"],
    ["CONTACT", "/contact"],
  ];

  return (
    <header className="site-header">
      <div className="announcement">Complimentary delivery over ₹10,000 <span>✦</span> Bespoke Indian Menswear · Chhatrapati Sambhajinagar</div>
      <div className="nav-shell">
        <button type="button" className="icon-control mobile-menu-trigger" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Close menu" : "Open menu"}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <Logo />
        <nav className={`primary-nav ${menuOpen ? "primary-nav-open" : ""}`} aria-label="Main navigation">
          {links.map(([label, href]) => (
            <NavLink key={label} to={href} end={href === "/"} onClick={() => setMenuOpen(false)}>{label}</NavLink>
          ))}
        </nav>
        <div className="nav-tools">
          <button type="button" className="icon-control" onClick={() => setSearchOpen((open) => !open)} aria-label="Search"><Search size={18} /></button>
          <Link className="icon-control" to="/account?tab=wishlist" aria-label={`Wishlist, ${wishlist.length} saved`}><Heart size={18} /><span className="tool-count">{wishlist.length}</span></Link>
          <Link className="icon-control" to={isAuthenticated ? "/account" : "/login"} aria-label={isAuthenticated ? `Account (${user?.displayName || "Profile"})` : "Log in or Sign up"} title={isAuthenticated ? (user?.displayName || "My Account") : "Log in / Sign up"}>
            <UserRound size={18} />
          </Link>
          <button type="button" className="icon-control" onClick={onCart} aria-label={`Shopping bag, ${itemCount} items`}><ShoppingBag size={18} /><span className="tool-count">{itemCount}</span></button>
        </div>
      </div>
      {searchOpen && (
        <form className="search-bar" onSubmit={submitSearch}>
          <Search size={17} />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search suits, shirts, kurtas, fabrics..." aria-label="Search collection" />
          <button className="text-button" type="submit">Search <ArrowRight size={14} /></button>
          <button className="icon-control" type="button" onClick={() => setSearchOpen(false)} aria-label="Close search"><X size={16} /></button>
        </form>
      )}
    </header>
  );
}

export function Footer() {
  const { siteConfig } = useStore();
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Logo footer />
          <p>The Art of Fine Tailoring. Traditional Indian craftsmanship combined with modern menswear, tailored around you.</p>
          <a className="whatsapp-link" href="https://wa.me/918308878204" target="_blank" rel="noreferrer">
            WhatsApp Atelier <ArrowRight size={14} />
          </a>
        </div>
        <div className="footer-column">
          <span className="footer-label">Navigation</span>
          <Link to="/">Home</Link>
          <Link to="/shop">Shop Collection</Link>
          <Link to="/custom-tailoring">Custom Tailoring</Link>
          <Link to="/fabrics">Fabrics</Link>
          <Link to="/about">Our Story</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div className="footer-column">
          <span className="footer-label">Client Services</span>
          <Link to="/account">My Account</Link>
          <Link to="/account?tab=measurements">Saved Measurements</Link>
          <Link to="/track-order">Track Your Order</Link>
          <Link to="/appointment">Book Fitting Appointment</Link>
        </div>
        <div className="footer-column">
          <span className="footer-label">S. SAWANT MENS WEAR</span>
          <span>Owner: Shivaji Sawant</span>
          <span>Beside Gandhi Saree Center, Aurangpura Parking Area, Chhatrapati Sambhajinagar, Maharashtra, India</span>
          <span>{siteConfig?.openingHours || "Monday – Saturday: 10:00 AM – 8:00 PM"}</span>
          <a href="tel:+918308878204">+91 83088 78204</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} S. SAWANT MENS WEAR · The Art of Fine Tailoring</span>
        <span>Chhatrapati Sambhajinagar, Maharashtra</span>
        <Link to="/admin/login">Admin Login</Link>
      </div>
    </footer>
  );
}

export function CartDrawer({ open, onClose }) {
  const { cart, removeFromCart, updateCartQuantity, setAuthGateOpen, setPendingAction } = useStore();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  if (!open) return null;
  const subtotal = cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

  function handleCheckout() {
    onClose();
    if (!isAuthenticated) {
      setPendingAction({ type: "checkout", redirectTo: "/checkout" });
      setAuthGateOpen(true);
      return;
    }
    navigate("/checkout");
  }

  return (
    <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping bag">
        <div className="drawer-heading">
          <div><span className="eyebrow">S. SAWANT</span><h2>Your bag <span>({cart.reduce((s, i) => s + (i.quantity || 1), 0)})</span></h2></div>
          <button className="icon-control" onClick={onClose} aria-label="Close bag"><X size={19} /></button>
        </div>
        {!cart.length ? (
          <div className="empty-bag">
            <ShoppingBag size={28} strokeWidth={1} />
            <p>Your bag is waiting for something made just for you.</p>
            <Link className="button button-outline" to="/shop" onClick={onClose}>Explore the collection</Link>
          </div>
        ) : (
          <>
            <div className="bag-items">
              {cart.map((item) => (
                <article className="bag-item" key={item.key}>
                  <div className="bag-thumb">
                    {item.image ? <img src={item.image} alt={item.name} /> : <ImagePlaceholder colour={item.colour} compact />}
                  </div>
                  <div className="bag-item-copy">
                    <Link to={`/product/${item.productId}`} onClick={onClose}>{item.name}</Link>
                    <span>{item.colour} · {item.configuration?.fabricBrand}</span>
                    <span>{item.configuration?.size || "Made to measure"} · {item.configuration?.fit || "Regular"} fit</span>
                    <div className="bag-qty-row">
                      <div className="qty-control">
                        <button type="button" onClick={() => updateCartQuantity(item.key, -1)} aria-label="Decrease quantity"><Minus size={12} /></button>
                        <span>{item.quantity || 1}</span>
                        <button type="button" onClick={() => updateCartQuantity(item.key, 1)} aria-label="Increase quantity"><Plus size={12} /></button>
                      </div>
                      <button className="text-button subdued" onClick={() => removeFromCart(item.key)}>Remove</button>
                    </div>
                  </div>
                  <strong>{formatPrice(item.price * (item.quantity || 1))}</strong>
                </article>
              ))}
            </div>
            <div className="bag-summary">
              <div><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
              <p>Delivery and final fitting details are confirmed with our atelier.</p>
              <button className="button button-gold button-block" onClick={handleCheckout}>
                Continue to checkout <ArrowRight size={15} />
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return <div className="toast-message" role="status">{message}</div>;
}
