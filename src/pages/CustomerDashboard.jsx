import { useEffect, useState } from "react";
import { ArrowRight, Check, Heart, Key, LogOut, MapPin, Package, Ruler, ShoppingBag, User, Clock3 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useStore } from "../context/StoreContext.jsx";
import { ORDER_STATUSES } from "../data/products.js";
import { formatPrice } from "../lib/format.js";
import ProductCard from "../components/ProductCard.jsx";

const TABS = [
  { key: "profile", label: "My Profile", icon: User },
  { key: "orders", label: "My Orders", icon: Package },
  { key: "wishlist", label: "My Wishlist", icon: Heart },
  { key: "measurements", label: "Saved Measurements", icon: Ruler },
  { key: "addresses", label: "Saved Addresses", icon: MapPin },
  { key: "appointments", label: "Appointments", icon: Clock3 },
  { key: "password", label: "Change Password", icon: Key },
];

const MEASUREMENT_PROFILES = {
  shirt: {
    label: "Shirt Measurements",
    fields: [["Neck", "neck"], ["Chest", "chest"], ["Waist", "waist"], ["Shoulder", "shoulder"], ["Sleeve Length", "sleeveLength"], ["Shirt Length", "shirtLength"], ["Bicep", "bicep"], ["Wrist", "wrist"]],
  },
  trouser: {
    label: "Trouser Measurements",
    fields: [["Trouser Waist", "trouserWaist"], ["Hip", "hip"], ["Inseam", "inseam"], ["Outseam", "outseam"], ["Thigh", "thigh"], ["Knee", "knee"], ["Bottom Opening", "bottomOpening"]],
  },
  jacket: {
    label: "Jacket / Blazer / Suit",
    fields: [["Chest", "jacketChest"], ["Waist", "jacketWaist"], ["Shoulder", "jacketShoulder"], ["Sleeve Length", "jacketSleeve"], ["Jacket Length", "jacketLength"], ["Bicep", "jacketBicep"]],
  },
  kurta: {
    label: "Kurta Measurements",
    fields: [["Chest", "kurtaChest"], ["Waist", "kurtaWaist"], ["Shoulder", "kurtaShoulder"], ["Sleeve Length", "kurtaSleeve"], ["Kurta Length", "kurtaLength"]],
  },
  waistcoat: {
    label: "Waistcoat Measurements",
    fields: [["Chest", "wcChest"], ["Waist", "wcWaist"], ["Shoulder", "wcShoulder"], ["Length", "wcLength"]],
  },
};

export default function CustomerDashboard() {
  const { user, profile, logout, updateUserProfile, isAuthenticated } = useAuth();
  const { products, wishlist, toggleWishlist, orders, measurements, setMeasurements, appointments } = useStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "profile";
  const [unit, setUnit] = useState("inches");
  const [measureProfile, setMeasureProfile] = useState("shirt");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login?redirect=/account");
    }
  }, [isAuthenticated, navigate]);

  function switchTab(key) { setParams({ tab: key }); }

  if (!isAuthenticated) return null;

  const savedProducts = products.filter((p) => wishlist.includes(p.id));
  const myOrders = orders || [];

  return (
    <main className="page-shell account-page customer-dashboard">
      <div className="page-intro">
        <span className="eyebrow">Welcome back, {user?.displayName || profile?.name || "Guest"}</span>
        <h1>My Account</h1>
      </div>

      <div className="account-layout">
        <aside className="account-sidebar">
          <div className="account-avatar">
            <span>{(user?.displayName || profile?.name || "S")[0].toUpperCase()}</span>
          </div>
          <span className="account-user-name">{user?.displayName || profile?.name}</span>
          <span className="account-user-email">{user?.email}</span>
          <nav className="account-nav">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} className={tab === key ? "account-tab-active" : ""} onClick={() => switchTab(key)}>
                <Icon size={16} /> {label} <ArrowRight size={14} />
              </button>
            ))}
            <button className="account-logout-btn" onClick={() => { logout(); navigate("/"); }}>
              <LogOut size={16} /> Logout <ArrowRight size={14} />
            </button>
          </nav>
        </aside>

        <section className="account-content">
          {tab === "profile" && <ProfileTab profile={profile} user={user} onUpdate={updateUserProfile} />}
          {tab === "orders" && <OrdersTab orders={myOrders} user={user} />}
          {tab === "wishlist" && <WishlistTab products={savedProducts} toggleWishlist={toggleWishlist} />}
          {tab === "measurements" && (
            <MeasurementsTab
              measurements={measurements}
              setMeasurements={setMeasurements}
              unit={unit}
              setUnit={setUnit}
              profile={measureProfile}
              setProfile={setMeasureProfile}
            />
          )}
          {tab === "addresses" && <AddressesTab profile={profile} onUpdate={updateUserProfile} />}
          {tab === "appointments" && <AppointmentsTab appointments={appointments} />}
          {tab === "password" && <PasswordTab />}
        </section>
      </div>
    </main>
  );
}

function ProfileTab({ profile, user, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: profile?.name || user?.displayName || "", phone: profile?.phone || "", email: user?.email || "" });

  function save(e) {
    e.preventDefault();
    onUpdate({ name: form.name, phone: form.phone });
    setEditing(false);
  }

  return (
    <div>
      <div className="account-heading"><h2>My Profile</h2></div>
      {editing ? (
        <form className="editorial-form" onSubmit={save}>
          <div className="form-grid">
            <label className="field-control"><span>Full name</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="field-control"><span>Phone</span><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label className="field-control field-control-full"><span>Email (cannot change)</span><input disabled value={form.email} /></label>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="button button-gold" type="submit">Save Changes <Check size={14} /></button>
            <button className="button button-outline" type="button" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="profile-details">
          <div className="profile-row"><span>Name</span><strong>{profile?.name || user?.displayName || "—"}</strong></div>
          <div className="profile-row"><span>Email</span><strong>{user?.email || "—"}</strong></div>
          <div className="profile-row"><span>Phone</span><strong>{profile?.phone || "—"}</strong></div>
          <div className="profile-row"><span>Member since</span><strong>{profile?.createdAt ? new Date(profile.createdAt.seconds * 1000).toLocaleDateString("en-IN") : "—"}</strong></div>
          <button className="button button-outline" onClick={() => setEditing(true)}>Edit Profile</button>
        </div>
      )}
    </div>
  );
}

function OrdersTab({ orders: localOrders, user }) {
  const [tracking, setTracking] = useState("");
  const [serverOrders, setServerOrders] = useState([]);

  useEffect(() => {
    if (!user?.uid && !user?.email) return;
    const qs = new URLSearchParams();
    if (user?.uid) qs.set("userId", user.uid);
    if (user?.email) qs.set("email", user.email);
    fetch(`/api/orders/my?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.orders)) setServerOrders(d.orders); })
      .catch(() => {});

    const source = new EventSource("/api/orders/stream");
    source.addEventListener("order-update", (event) => {
      try {
        const update = JSON.parse(event.data);
        setServerOrders((prev) => prev.map((o) => o.id === update.id ? { ...o, ...update } : o));
      } catch { /* ignore */ }
    });
    return () => source.close();
  }, [user?.uid, user?.email]);

  const orders = serverOrders.length ? serverOrders : localOrders;
  const foundOrder = orders.find((o) => o.id?.toLowerCase() === tracking.trim().toLowerCase());

  return (
    <div>
      <div className="account-heading">
        <h2>My Orders</h2>
        <p>Track the live progress of your bespoke pieces. <Link to="/track-order" className="underlined-link">Open full tracking page</Link></p>
      </div>
      <form className="track-form" onSubmit={(e) => e.preventDefault()}>
        <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Enter Order ID e.g. SSW-2026-00001" aria-label="Order reference" />
        <button className="button button-outline" type="submit">Track Order</button>
      </form>

      {tracking && foundOrder && (
        <div className="order-track-card">
          <div><span className="eyebrow">S. SAWANT order</span><h3>{foundOrder.id}</h3></div>
          <div className="order-status-timeline">
            {ORDER_STATUSES.map((status, i) => {
              const currentIndex = ORDER_STATUSES.indexOf(foundOrder.status);
              const isPast = i <= currentIndex;
              const isCurrent = i === currentIndex;
              return (
                <div key={status} className={`timeline-step ${isPast ? "timeline-done" : ""} ${isCurrent ? "timeline-current" : ""}`}>
                  <span className="timeline-dot">{isPast ? <Check size={10} /> : (i + 1)}</span>
                  <span className="timeline-label">{status}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {orders.length > 0 ? (
        <div className="orders-list">
          {orders.map((order) => (
            <div className="order-row-card" key={order.id}>
              <div className="order-row-header">
                <div>
                  <strong>{order.id}</strong>
                  <span>{new Date(order.createdAt).toLocaleDateString("en-IN")} · {order.items?.length || 0} piece(s)</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span className="status-pill">{order.paymentStatus}</span>
                  <span className="status-pill">{order.status}</span>
                </div>
              </div>
              <div className="order-row-items">
                {(order.items || []).map((item) => (
                  <div key={item.key}>
                    <span>{item.name} × {item.quantity || 1} — {item.colour}</span>
                    {item.configuration?.fabricBrand && <span className="order-detail-sub">{item.configuration.fabricBrand}</span>}
                  </div>
                ))}
              </div>
              <div className="order-row-footer">
                <span>Payment: {order.paymentMethod || order.customer?.payment || "—"} · <Link to={`/track-order?orderId=${encodeURIComponent(order.id)}`} className="underlined-link">Live Track</Link></span>
                <strong>{formatPrice(order.total)}</strong>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-note">
          Your first made-to-measure order will appear here.
          <br /><Link className="underlined-link" to="/shop">Explore the collection <ArrowRight size={14} /></Link>
        </div>
      )}
    </div>
  );
}

function WishlistTab({ products, toggleWishlist }) {
  return (
    <div>
      <div className="account-heading"><h2>My Wishlist</h2><p>Your saved pieces for later.</p></div>
      {products.length ? (
        <div className="catalog-grid">{products.map((p) => <ProductCard key={p.id} product={p} wished onWishlist={toggleWishlist} />)}</div>
      ) : (
        <div className="empty-note">Your wishlist is empty.<br /><Link className="underlined-link" to="/shop">Explore the collection <ArrowRight size={14} /></Link></div>
      )}
    </div>
  );
}

function MeasurementsTab({ measurements, setMeasurements, unit, setUnit, profile, setProfile }) {
  const profileData = MEASUREMENT_PROFILES[profile];
  const [values, setValues] = useState(() => measurements || {});

  function updateVal(key, val) { setValues((prev) => ({ ...prev, [key]: val })); }

  function save(e) {
    e.preventDefault();
    setMeasurements({ ...values, unit, profileType: profile });
  }

  const multiplier = unit === "cm" ? 2.54 : 1;
  const unitLabel = unit === "inches" ? "in" : "cm";

  return (
    <div>
      <div className="account-heading">
        <h2>Saved Measurements</h2>
        <p>Store separate measurement profiles for different garment types. Choose inches or centimetres.</p>
      </div>

      <div className="measurement-controls">
        <div className="filter-group">
          <label>Garment type</label>
          <select value={profile} onChange={(e) => setProfile(e.target.value)}>
            {Object.entries(MEASUREMENT_PROFILES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Unit</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="inches">Inches</option>
            <option value="cm">Centimetres</option>
          </select>
        </div>
      </div>

      <form className="measurement-account-form" onSubmit={save}>
        <h3>{profileData.label}</h3>
        <div className="form-grid">
          {profileData.fields.map(([label, key]) => (
            <label className="field-control" key={key}>
              <span>{label} ({unitLabel})</span>
              <input type="number" step="0.25" min="5" max="200" name={key} value={values[key] || ""} onChange={(e) => updateVal(key, e.target.value)} placeholder="—" />
            </label>
          ))}
        </div>
        <label className="field-control">
          <span>Fit notes</span>
          <textarea name="notes" value={values.notes || ""} onChange={(e) => updateVal("notes", e.target.value)} placeholder="Posture, preferred ease, or any fitting notes" />
        </label>
        <button className="button button-gold" type="submit">Save Measurements <Check size={14} /></button>
      </form>

      <div className="measurement-appointment-link">
        <Ruler size={16} />
        <div>
          <strong>Prefer an in-person fitting?</strong>
          <p>Our master tailor will take precise measurements at our atelier.</p>
        </div>
        <Link className="button button-outline" to="/appointment">Book Appointment</Link>
      </div>
    </div>
  );
}

function AddressesTab({ profile, onUpdate }) {
  const [addresses, setAddresses] = useState(profile?.addresses || []);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ label: "Home", address: "", city: "", state: "Maharashtra", pin: "" });

  function addAddress(e) {
    e.preventDefault();
    const updated = [...addresses, { ...form, id: Date.now().toString() }];
    setAddresses(updated);
    onUpdate({ addresses: updated });
    setForm({ label: "Home", address: "", city: "", state: "Maharashtra", pin: "" });
    setEditing(false);
  }

  function removeAddress(id) {
    const updated = addresses.filter((a) => a.id !== id);
    setAddresses(updated);
    onUpdate({ addresses: updated });
  }

  return (
    <div>
      <div className="account-heading"><h2>Saved Addresses</h2></div>
      {addresses.map((addr) => (
        <div className="address-card" key={addr.id}>
          <span className="address-label-badge">{addr.label}</span>
          <p>{addr.address}, {addr.city}, {addr.state} — {addr.pin}</p>
          <button className="text-button subdued" onClick={() => removeAddress(addr.id)}>Remove</button>
        </div>
      ))}
      {editing ? (
        <form className="editorial-form" onSubmit={addAddress}>
          <div className="form-grid">
            <label className="field-control"><span>Label</span>
              <select value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}><option>Home</option><option>Office</option><option>Other</option></select>
            </label>
            <label className="field-control"><span>City</span><input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
            <label className="field-control field-control-full"><span>Full address</span><textarea required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
            <label className="field-control"><span>State</span><input required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></label>
            <label className="field-control"><span>PIN code</span><input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} /></label>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="button button-gold" type="submit">Save Address <Check size={14} /></button>
            <button className="button button-outline" type="button" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="button button-outline" onClick={() => setEditing(true)}>+ Add New Address</button>
      )}
    </div>
  );
}

function AppointmentsTab({ appointments }) {
  return (
    <div>
      <div className="account-heading"><h2>Appointment History</h2></div>
      {appointments.length > 0 ? appointments.map((apt) => (
        <div className="appointment-card" key={apt.id}>
          <div><strong>{apt.interest}</strong><span>{apt.date} · {apt.time}</span></div>
          <span className="status-pill">{apt.status}</span>
        </div>
      )) : (
        <div className="empty-note">No appointments yet.<br /><Link className="underlined-link" to="/appointment">Book a fitting <ArrowRight size={14} /></Link></div>
      )}
    </div>
  );
}

function PasswordTab() {
  const [sent, setSent] = useState(false);
  const { resetPassword, user } = useAuth();

  async function handleReset() {
    if (user?.email) {
      try {
        await resetPassword(user.email);
        setSent(true);
      } catch { /* handled in context */ }
    }
  }

  return (
    <div>
      <div className="account-heading"><h2>Change Password</h2><p>We'll send a password reset link to your registered email.</p></div>
      {sent ? (
        <p className="auth-success">Password reset email sent to {user?.email}. Check your inbox.</p>
      ) : (
        <button className="button button-gold" onClick={handleReset}>Send Reset Link <ArrowRight size={14} /></button>
      )}
    </div>
  );
}
