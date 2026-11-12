import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, CheckCircle2, ImagePlus, Lock, LogOut, Plus, Save, Trash2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CATEGORIES, ORDER_STATUSES, SUIT_COLOURS } from "../data/products.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useStore } from "../context/StoreContext.jsx";
import { createId, formatPrice } from "../lib/format.js";
import { localImageToDataUrl } from "../services/repository.js";
import { ImagePlaceholder } from "../components/ProductMedia.jsx";

const TABS = ["Overview", "Products", "Images", "Fabrics", "Pricing & Coupons", "Orders", "Appointments", "Customers", "Homepage"];
const VIEWS = ["front", "back", "detail", "fabric"];

function isSuit(product) {
  return ["Two-Piece Suits", "Three-Piece Suits", "Wedding Collection"].includes(product.category);
}

function startingProduct() {
  return {
    id: createId("style"),
    name: "New made-to-measure style",
    category: CATEGORIES[0].name,
    categoryId: CATEGORIES[0].id,
    price: 0,
    inStock: true,
    bestSeller: false,
    model3d: "",
    description: "",
    fabrics: [],
    colours: ["Navy Blue"],
    defaultColour: "Navy Blue",
    images: {},
    options: [],
  };
}

function ProductEditor({ product, onSave, onDelete, onNew, fabricBrands }) {
  const [form, setForm] = useState(product);
  const [optionsText, setOptionsText] = useState(JSON.stringify(product.options || [], null, 2));
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(product);
    setOptionsText(JSON.stringify(product.options || [], null, 2));
    setError("");
  }, [product]);

  function set(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  function submit(event) {
    event.preventDefault();
    try {
      const options = JSON.parse(optionsText);
      if (!Array.isArray(options)) throw new Error("Customisation fields must be a JSON array.");
      if (!Number.isFinite(Number(form.price)) || Number(form.price) < 0) throw new Error("Base price must be a non-negative number.");
      if (!isSuit(form) && !form.colours.length) throw new Error("Add at least one colour option.");
      const category = form.category;
      const categoryId = CATEGORIES.find((item) => item.name === category)?.id || form.categoryId;
      const updated = {
        ...form,
        category,
        categoryId,
        price: Number(form.price),
        options,
        fabrics: fabricBrands,
        colours: isSuit({ ...form, category }) ? SUIT_COLOURS : form.colours,
        defaultColour: isSuit({ ...form, category }) ? (SUIT_COLOURS.includes(form.defaultColour) ? form.defaultColour : "Navy Blue") : form.defaultColour,
      };
      onSave(updated);
      setError("");
    } catch (problem) {
      setError(`Could not save product: ${problem.message}`);
    }
  }

  return (
    <form className="admin-editor" onSubmit={submit}>
      <div className="admin-editor-heading">
        <div><span className="eyebrow">Catalogue management</span><h2>{product.name}</h2></div>
        <div className="admin-editor-actions">
          <button type="button" className="button button-outline" onClick={onNew}><Plus size={14} /> New product</button>
          <button type="button" className="icon-control admin-delete" onClick={() => onDelete(product.id)} aria-label="Delete product"><Trash2 size={16} /></button>
        </div>
      </div>
      <div className="admin-fields-grid">
        <label className="field-control"><span>Product name</span><input required value={form.name} onChange={(event) => set("name", event.target.value)} /></label>
        <label className="field-control"><span>Category</span><select value={form.category} onChange={(event) => { const selected = CATEGORIES.find((category) => category.name === event.target.value); setForm((current) => ({ ...current, category: selected.name, categoryId: selected.id })); }}>{CATEGORIES.map((item) => <option key={item.id}>{item.name}</option>)}</select></label>
        <label className="field-control"><span>Base price · INR</span><input required type="number" min="0" step="100" value={form.price} onChange={(event) => set("price", event.target.value)} /></label>
        <label className="field-control"><span>Default colour</span><select value={form.defaultColour} onChange={(event) => set("defaultColour", event.target.value)}>{(isSuit(form) ? SUIT_COLOURS : form.colours).map((colour) => <option key={colour}>{colour}</option>)}</select></label>
        <label className="field-control"><span>Stock status</span>
          <select value={form.inStock !== false ? "in" : "out"} onChange={(e) => set("inStock", e.target.value === "in")}>
            <option value="in">In Stock / Available</option>
            <option value="out">Out of Stock</option>
          </select>
        </label>
        <label className="field-control"><span>Best seller</span>
          <select value={form.bestSeller ? "yes" : "no"} onChange={(e) => set("bestSeller", e.target.value === "yes")}>
            <option value="no">Standard</option>
            <option value="yes">Best Seller (Homepage)</option>
          </select>
        </label>
        <label className="field-control field-control-full"><span>3D Garment Model URL (.glb / .gltf)</span><input value={form.model3d || ""} onChange={(e) => set("model3d", e.target.value)} placeholder="/models/suit.glb or https://..." /></label>
        <label className="field-control field-control-full"><span>Description</span><textarea value={form.description} onChange={(event) => set("description", event.target.value)} /></label>
        <label className="field-control field-control-full"><span>Colours · comma separated</span><input disabled={isSuit(form)} value={isSuit(form) ? SUIT_COLOURS.join(", ") : form.colours.join(", ")} onChange={(event) => { const colours = [...new Set(event.target.value.split(",").map((colour) => colour.trim()).filter(Boolean))]; setForm((current) => ({ ...current, colours, defaultColour: colours.includes(current.defaultColour) ? current.defaultColour : colours[0] || "" })); }} />{isSuit(form) && <small className="field-hint">Suit colours are fixed to Black, Navy Blue, Brown and Light Grey.</small>}</label>
        <label className="field-control field-control-full"><span>Customisation fields · JSON</span><textarea className="json-editor" spellCheck="false" value={optionsText} onChange={(event) => setOptionsText(event.target.value)} /></label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <button className="button button-gold" type="submit"><Save size={14} /> Save product</button>
    </form>
  );
}

function ImageManager({ products, onUpdate }) {
  const [productId, setProductId] = useState(products[0]?.id || "");
  const product = products.find((item) => item.id === productId) || products[0];
  const [colour, setColour] = useState(product?.defaultColour || "");
  const [view, setView] = useState("front");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!product) return;
    if (!product.colours.includes(colour)) setColour(product.defaultColour);
  }, [product, colour]);

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file || !product) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file (JPEG, PNG or WebP).");
      return;
    }
    try {
      const dataUrl = await localImageToDataUrl(file);
      const updated = {
        ...product,
        images: {
          ...product.images,
          [colour]: { ...(product.images?.[colour] || {}), [view]: dataUrl },
        },
      };
      onUpdate(updated);
      setError("");
      event.target.value = "";
    } catch (problem) {
      setError(`Image could not be uploaded: ${problem.message}`);
    }
  }

  if (!product) return <p className="empty-note">Add a product before uploading images.</p>;
  const existing = product.images?.[colour]?.[view];

  return (
    <section className="admin-panel">
      <span className="eyebrow">Verified product photography</span>
      <h2>Colour image library</h2>
      <p className="admin-subcopy">Each colour and angle is independent. Upload photographs for each garment variant.</p>
      <div className="admin-fields-grid">
        <label className="field-control"><span>Product</span><select value={product.id} onChange={(event) => setProductId(event.target.value)}>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="field-control"><span>Colour variant</span><select value={colour} onChange={(event) => setColour(event.target.value)}>{product.colours.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="field-control"><span>View</span><select value={view} onChange={(event) => setView(event.target.value)}>{VIEWS.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
      </div>
      <div className="admin-photo-preview">{existing ? <img src={existing} alt={`${product.name} ${colour} ${view}`} /> : <ImagePlaceholder colour={colour} view={view} />}</div>
      <label className="button button-outline upload-control"><ImagePlus size={15} /> Upload {colour} {view} photo<input type="file" accept="image/*" onChange={upload} /></label>
      {existing && <button type="button" className="text-button delete-image" onClick={() => { const images = { ...product.images, [colour]: { ...product.images[colour] } }; delete images[colour][view]; if (!Object.keys(images[colour]).length) delete images[colour]; onUpdate({ ...product, images }); }}>Remove this image</button>}
      {error && <p className="form-error">{error}</p>}
    </section>
  );
}

function FabricManager({ fabricBrands, setFabricBrands, fabricCatalog, setFabricCatalog, setProducts, notify }) {
  const [brandsText, setBrandsText] = useState(fabricBrands.join(", "));
  const [newSwatch, setNewSwatch] = useState({ brand: fabricBrands[0] || "Raymond", name: "", type: "Wool", colour: "Navy Blue", hex: "#1e2d4a", price: 1500, description: "" });

  function addSwatch(e) {
    e.preventDefault();
    if (!newSwatch.name.trim()) return;
    setFabricCatalog((prev) => [{ ...newSwatch, id: createId("fab"), available: true, price: Number(newSwatch.price) || 0, categories: CATEGORIES.map((c) => c.id) }, ...prev]);
    setNewSwatch({ ...newSwatch, name: "", description: "" });
    notify("Fabric swatch added.");
  }

  return (
    <div className="admin-pricing-layout">
      <section className="admin-panel">
        <span className="eyebrow">Supplier catalogue</span>
        <h2>Fabric Houses</h2>
        <label className="field-control"><span>Fabric brands · comma separated</span><textarea value={brandsText} onChange={(e) => setBrandsText(e.target.value)} /></label>
        <button className="button button-outline" style={{ marginTop: 12 }} onClick={() => {
          const brands = [...new Set(brandsText.split(",").map((b) => b.trim()).filter(Boolean))];
          if (!brands.length) return notify("At least one fabric house is required.");
          setFabricBrands(brands);
          setProducts((curr) => curr.map((item) => ({ ...item, fabrics: brands })));
          notify("Fabric houses updated.");
        }}>Save Fabric Houses <Save size={14} /></button>

        <h3 style={{ marginTop: 28 }}>Add Fabric Swatch</h3>
        <form className="admin-rule-form" onSubmit={addSwatch}>
          <label className="field-control"><span>Brand</span><select value={newSwatch.brand} onChange={(e) => setNewSwatch({ ...newSwatch, brand: e.target.value })}>{fabricBrands.map((b) => <option key={b}>{b}</option>)}</select></label>
          <label className="field-control"><span>Swatch name</span><input required value={newSwatch.name} onChange={(e) => setNewSwatch({ ...newSwatch, name: e.target.value })} placeholder="e.g. Super 120s Charcoal" /></label>
          <label className="field-control"><span>Type</span><select value={newSwatch.type} onChange={(e) => setNewSwatch({ ...newSwatch, type: e.target.value })}><option>Wool</option><option>Cotton</option><option>Linen</option><option>Poly-viscose</option><option>Cotton blends</option><option>Tweed</option></select></label>
          <label className="field-control"><span>Colour</span><input required value={newSwatch.colour} onChange={(e) => setNewSwatch({ ...newSwatch, colour: e.target.value })} /></label>
          <label className="field-control"><span>Swatch Hex</span><input type="color" value={newSwatch.hex} onChange={(e) => setNewSwatch({ ...newSwatch, hex: e.target.value })} /></label>
          <label className="field-control"><span>Additional Charge (INR)</span><input type="number" min="0" step="100" value={newSwatch.price} onChange={(e) => setNewSwatch({ ...newSwatch, price: e.target.value })} /></label>
          <button className="button button-gold" type="submit"><Plus size={14} /> Add Swatch</button>
        </form>
      </section>

      <section className="admin-panel">
        <span className="eyebrow">Stocked swatches</span>
        <h2>Fabric Swatch Library ({fabricCatalog.length})</h2>
        <div className="price-rules-list">
          {fabricCatalog.map((fab) => (
            <div className="price-edit-row" key={fab.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: fab.hex, border: "1px solid rgba(255,255,255,0.2)", display: "inline-block" }} />
                <span>{fab.name}<small>{fab.brand} · {fab.type} · {fab.colour}</small></span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <strong>{formatPrice(fab.price)}</strong>
                <button type="button" className="text-button" onClick={() => setFabricCatalog((prev) => prev.map((f) => f.id === fab.id ? { ...f, available: !f.available } : f))}>
                  {fab.available ? "In Stock" : "Paused"}
                </button>
                <button type="button" className="icon-control admin-delete" onClick={() => setFabricCatalog((prev) => prev.filter((f) => f.id !== fab.id))} aria-label="Remove swatch"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PricingManager({ products, fabricBrands, pricing, onProducts, onPricing, notify }) {
  const [ruleType, setRuleType] = useState("fabric");
  const [ruleName, setRuleName] = useState("");
  const [ruleValue, setRuleValue] = useState("");
  const [ruleAmount, setRuleAmount] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [couponPct, setCouponPct] = useState(10);
  const [error, setError] = useState("");

  function addRule(event) {
    event.preventDefault();
    if ((!ruleName.trim() && ruleType === "option") || !ruleValue.trim() || Number(ruleAmount) < 0) {
      setError("Choose a rule name and non-negative amount.");
      return;
    }
    const key = ruleType === "fabric" ? `fabric:${ruleValue}` : `option:${ruleName}:${ruleValue}`;
    const next = (pricing.priceRules || []).filter((rule) => rule.key !== key);
    next.push({ key, label: ruleType === "fabric" ? `Fabric: ${ruleValue}` : `${ruleName}: ${ruleValue}`, amount: Number(ruleAmount) });
    onPricing({ ...pricing, priceRules: next });
    setRuleName("");
    setRuleAmount(0);
    setError("");
    notify("Price rule saved.");
  }

  function addCoupon(e) {
    e.preventDefault();
    if (!couponCode.trim()) return;
    const code = couponCode.trim().toUpperCase();
    const next = (pricing.coupons || []).filter((c) => c.code !== code);
    next.push({ code, discountPercent: Number(couponPct) || 10, active: true });
    onPricing({ ...pricing, coupons: next });
    setCouponCode("");
    notify(`Coupon ${code} saved.`);
  }

  return (
    <div className="admin-pricing-layout">
      <section className="admin-panel">
        <span className="eyebrow">Price book</span>
        <h2>Base Prices</h2>
        {products.map((product) => (
          <label className="price-edit-row" key={product.id}>
            <span>{product.name}<small>{product.category}</small></span>
            <span className="price-edit-input">₹<input type="number" min="0" step="100" value={product.price} onChange={(event) => onProducts(products.map((item) => item.id === product.id ? { ...item, price: Number(event.target.value) } : item))} /></span>
          </label>
        ))}

        <h3 style={{ marginTop: 28 }}>Discount Coupons</h3>
        <form className="admin-rule-form" onSubmit={addCoupon}>
          <label className="field-control"><span>Coupon Code</span><input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="e.g. FESTIVE15" /></label>
          <label className="field-control"><span>Discount %</span><input type="number" min="1" max="90" value={couponPct} onChange={(e) => setCouponPct(e.target.value)} /></label>
          <button className="button button-outline" type="submit"><Plus size={14} /> Add Coupon</button>
        </form>
        <div className="price-rules-list">
          {(pricing.coupons || []).map((c) => (
            <div className="price-edit-row" key={c.code}>
              <span>{c.code}<small>{c.discountPercent}% off</small></span>
              <button type="button" className="icon-control admin-delete" onClick={() => onPricing({ ...pricing, coupons: pricing.coupons.filter((x) => x.code !== c.code) })}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-panel">
        <span className="eyebrow">Atelier-configured extras</span>
        <h2>Customization &amp; Fabric Price Rules</h2>
        <form className="admin-rule-form" onSubmit={addRule}>
          <label className="field-control"><span>Rule type</span><select value={ruleType} onChange={(event) => setRuleType(event.target.value)}><option value="fabric">Fabric house</option><option value="option">Custom option</option></select></label>
          {ruleType === "fabric" ? (
            <label className="field-control"><span>Fabric house</span><select value={ruleValue} onChange={(event) => setRuleValue(event.target.value)}><option value="">Choose fabric</option>{fabricBrands.map((brand) => <option key={brand}>{brand}</option>)}</select></label>
          ) : (
            <>
              <label className="field-control"><span>Option key</span><input value={ruleName} onChange={(event) => setRuleName(event.target.value)} placeholder="e.g. lining, buttons, embroidery" /></label>
              <label className="field-control"><span>Selected value</span><input value={ruleValue} onChange={(event) => setRuleValue(event.target.value)} placeholder="e.g. Fully lined" /></label>
            </>
          )}
          <label className="field-control"><span>Additional amount · INR</span><input type="number" min="0" step="100" value={ruleAmount} onChange={(event) => setRuleAmount(event.target.value)} /></label>
          <button className="button button-gold" type="submit"><Plus size={14} /> Save price rule</button>
          {error && <p className="form-error">{error}</p>}
        </form>
        <div className="price-rules-list">
          {(pricing.priceRules || []).length ? pricing.priceRules.map((rule) => (
            <div className="price-edit-row" key={rule.key}>
              <span>{rule.label}<small>{rule.key}</small></span>
              <strong>+ {formatPrice(rule.amount)}</strong>
              <button className="icon-control admin-delete" onClick={() => onPricing({ ...pricing, priceRules: pricing.priceRules.filter((r) => r.key !== rule.key) })} aria-label={`Remove ${rule.label}`}><Trash2 size={15} /></button>
            </div>
          )) : <p className="empty-note">No premiums configured. Fabric and finish selections currently add ₹0.</p>}
        </div>
      </section>
    </div>
  );
}

export default function AdminPage() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const navigate = useNavigate();
  const {
    products, setProducts,
    fabricBrands, setFabricBrands,
    fabricCatalog, setFabricCatalog,
    pricing, setPricing,
    siteConfig, setSiteConfig,
    orders, setOrders,
    appointments, setAppointments,
    notify,
  } = useStore();

  const [tab, setTab] = useState("Overview");
  const [selectedId, setSelectedId] = useState(products[0]?.id);
  const selectedProduct = products.find((item) => item.id === selectedId) || products[0];

  const [serverOrders, setServerOrders] = useState([]);
  const [codSettings, setCodSettings] = useState({ codEnabled: true, codCharge: 0 });
  const [orderSearch, setOrderSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterPayStatus, setFilterPayStatus] = useState("");
  const [filterOrderStatus, setFilterOrderStatus] = useState("");
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin || !user?.email) return;
    fetch("/api/admin/orders", {
      headers: { "X-Admin-Role": "admin", "X-Admin-Email": user.email },
    })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.orders)) setServerOrders(d.orders);
        if (d.settings) setCodSettings({ codEnabled: d.settings.codEnabled !== false, codCharge: Number(d.settings.codCharge || 0) });
      })
      .catch(() => {});
  }, [isAuthenticated, isAdmin, user?.email, tab]);

  const allOrders = serverOrders.length ? serverOrders : orders;

  const filteredOrders = useMemo(() => {
    return allOrders.filter((o) => {
      const q = orderSearch.trim().toLowerCase();
      const matchQ = !q || o.id?.toLowerCase().includes(q) || o.customer?.name?.toLowerCase().includes(q) || o.customer?.phone?.toLowerCase().includes(q);
      const matchMethod = !filterMethod || (o.paymentMethod || o.customer?.payment || "") === filterMethod;
      const matchPay = !filterPayStatus || (o.paymentStatus || "") === filterPayStatus;
      const matchStatus = !filterOrderStatus || o.status === filterOrderStatus;
      return matchQ && matchMethod && matchPay && matchStatus;
    });
  }, [allOrders, orderSearch, filterMethod, filterPayStatus, filterOrderStatus]);

  const stats = useMemo(() => {
    const totalSales = allOrders.reduce((sum, item) => sum + (item.total || 0), 0);
    const pendingOrders = allOrders.filter((o) => o.status !== "Delivered").length;
    const completedOrders = allOrders.filter((o) => o.status === "Delivered").length;
    const pendingUpi = allOrders.filter((o) => o.paymentStatus === "Pending Verification").length;
    const upcomingApts = appointments.filter((a) => a.status !== "Rejected").length;
    return { totalSales, pendingOrders, completedOrders, pendingUpi, upcomingApts };
  }, [allOrders, appointments]);

  const registeredCustomers = useMemo(() => {
    try {
      const localUsers = JSON.parse(localStorage.getItem("ssawant-v2:local-users") || "[]");
      return localUsers.filter((u) => u.role !== "admin");
    } catch {
      return [];
    }
  }, [tab]);

  async function handleAdminLogout() {
    await logout();
    notify("Signed out of Admin Dashboard.");
    navigate("/admin/login", { replace: true });
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <main className="page-shell not-found">
        <Lock size={32} />
        <span className="eyebrow">403 · Access Denied</span>
        <h1>Administrator privileges required.</h1>
        <p>You are not authorised to view this page.</p>
      </main>
    );
  }

  function saveProduct(product) {
    const exists = products.some((item) => item.id === product.id);
    setProducts(exists ? products.map((item) => item.id === product.id ? product : item) : [...products, product]);
    setSelectedId(product.id);
    notify("Product saved.");
  }

  function updateProduct(product) {
    setProducts((current) => current.map((item) => item.id === product.id ? product : item));
  }

  function removeProduct(id) {
    if (!window.confirm("Remove this product from the catalogue?")) return;
    const next = products.filter((item) => item.id !== id);
    setProducts(next);
    setSelectedId(next[0]?.id);
    notify("Product removed.");
  }

  async function patchOrder(orderId, updates, successMsg) {
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Role": "admin",
          "X-Admin-Email": user?.email || "admin",
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok && data.order) {
        setServerOrders((prev) => prev.map((o) => o.id === orderId ? data.order : o));
        notify(successMsg || `Order ${orderId} updated.`);
        return;
      }
    } catch { /* fallback to local */ }
    setOrders((current) => current.map((o) => o.id === orderId ? { ...o, ...updates } : o));
    notify(successMsg || `Order ${orderId} updated.`);
  }

  function verifyUpiPayment(orderId) {
    patchOrder(orderId, { paymentStatus: "Payment Confirmed", status: "Payment Confirmed / COD Order Confirmed", note: "UPI payment verified by administrator" }, `UPI payment verified for ${orderId}.`);
  }

  function markCodCollected(orderId) {
    patchOrder(orderId, { paymentStatus: "COD Payment Collected", note: "COD cash collected" }, `COD payment marked collected for ${orderId}.`);
  }

  async function saveCodSettings() {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Role": "admin",
          "X-Admin-Email": user?.email || "admin",
        },
        body: JSON.stringify(codSettings),
      });
      if (res.ok) notify("COD settings saved.");
    } catch {
      notify("Could not reach backend to save COD settings.");
    }
  }

  function downloadOrders() {
    const rows = [["Order ID", "Date", "Customer", "Email", "Phone", "Payment", "Payment Status", "Total", "Order Status"], ...orders.map((order) => [order.id, order.createdAt, order.customer.name, order.customer.email, order.customer.phone, order.customer.payment, order.paymentStatus || "—", order.total, order.status])];
    const content = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "s-sawant-orders.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="page-shell admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">S. SAWANT · Atelier Management</span>
          <h1>Admin Dashboard</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span className="local-admin-badge">Signed in: {user?.email}</span>
          <button type="button" className="button button-outline" onClick={handleAdminLogout}>
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </div>

      <div className="admin-stat-row">
        <div><span>Total Sales</span><strong>{formatPrice(stats.totalSales)}</strong></div>
        <div><span>Total Orders</span><strong>{orders.length}</strong></div>
        <div><span>Pending Orders</span><strong>{stats.pendingOrders}</strong></div>
        <div><span>Completed Orders</span><strong>{stats.completedOrders}</strong></div>
        <div><span>Pending UPI Verify</span><strong>{stats.pendingUpi}</strong></div>
        <div><span>Appointments</span><strong>{stats.upcomingApts}</strong></div>
      </div>

      <nav className="admin-tabs" aria-label="Admin sections">
        {TABS.map((item) => (
          <button className={tab === item ? "admin-tab-active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>
        ))}
      </nav>

      {tab === "Overview" && (
        <section className="admin-panel">
          <span className="eyebrow">Business Overview</span>
          <h2>S. SAWANT MENS WEAR — Atelier Summary</h2>
          <div className="admin-overview-grid">
            <div className="overview-card"><span>Products in Catalogue</span><strong>{products.length}</strong></div>
            <div className="overview-card"><span>Fabric Houses</span><strong>{fabricBrands.length}</strong></div>
            <div className="overview-card"><span>Fabric Swatches</span><strong>{fabricCatalog.length}</strong></div>
            <div className="overview-card"><span>Registered Customers</span><strong>{registeredCustomers.length}</strong></div>
          </div>
          {stats.pendingUpi > 0 && (
            <div className="admin-warning" style={{ marginTop: 20 }}>
              <strong>{stats.pendingUpi} UPI payment(s) awaiting verification.</strong> Go to the <em>Orders</em> tab to verify UPI transactions before cutting begins.
            </div>
          )}
        </section>
      )}

      {tab === "Products" && (
        <div className="admin-catalog-layout">
          <aside className="admin-product-list">
            <div className="admin-list-heading">
              <span>Products</span>
              <button className="text-button" onClick={() => { const item = startingProduct(); setProducts([...products, item]); setSelectedId(item.id); }}>+ Add new</button>
            </div>
            {products.map((product) => (
              <button className={selectedId === product.id ? "admin-product-active" : ""} key={product.id} onClick={() => setSelectedId(product.id)}>
                <span>{product.name}<small>{product.category}</small></span>
                <span>{formatPrice(product.price)}</span>
              </button>
            ))}
          </aside>
          {selectedProduct && (
            <ProductEditor
              product={selectedProduct}
              onSave={saveProduct}
              onDelete={removeProduct}
              onNew={() => { const item = startingProduct(); setProducts([...products, item]); setSelectedId(item.id); }}
              fabricBrands={fabricBrands}
            />
          )}
        </div>
      )}

      {tab === "Images" && <ImageManager products={products} onUpdate={updateProduct} />}

      {tab === "Fabrics" && (
        <FabricManager
          fabricBrands={fabricBrands}
          setFabricBrands={setFabricBrands}
          fabricCatalog={fabricCatalog}
          setFabricCatalog={setFabricCatalog}
          setProducts={setProducts}
          notify={notify}
        />
      )}

      {tab === "Pricing & Coupons" && (
        <PricingManager products={products} fabricBrands={fabricBrands} pricing={pricing} onProducts={setProducts} onPricing={setPricing} notify={notify} />
      )}

      {tab === "Orders" && (
        <section className="admin-panel">
          <div className="admin-editor-heading">
            <div><span className="eyebrow">Client orders</span><h2>Order &amp; Payment Management ({filteredOrders.length})</h2></div>
            <button className="button button-outline" onClick={downloadOrders}><ArrowDownToLine size={14} /> Export CSV</button>
          </div>

          <div className="admin-cod-bar">
            <label className="cod-toggle-label">
              <input type="checkbox" checked={codSettings.codEnabled} onChange={(e) => setCodSettings((s) => ({ ...s, codEnabled: e.target.checked }))} />
              <span>Enable Cash on Delivery (COD)</span>
            </label>
            <label className="field-control" style={{ maxWidth: 180 }}>
              <span>COD Charge (INR)</span>
              <input type="number" min="0" step="10" value={codSettings.codCharge} onChange={(e) => setCodSettings((s) => ({ ...s, codCharge: Number(e.target.value) }))} />
            </label>
            <button type="button" className="button button-outline" onClick={saveCodSettings}><Save size={14} /> Save COD Settings</button>
          </div>

          <div className="shop-tools" style={{ marginBottom: 18 }}>
            <div className="filter-group"><label>Search</label><input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="Order ID, name or mobile..." /></div>
            <div className="filter-group"><label>Payment Method</label><select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}><option value="">All Methods</option><option>COD</option><option>UPI QR Code</option><option>UPI</option><option>Google Pay</option><option>PhonePe</option><option>Paytm</option></select></div>
            <div className="filter-group"><label>Payment Status</label><select value={filterPayStatus} onChange={(e) => setFilterPayStatus(e.target.value)}><option value="">All Payment Statuses</option><option>Payment Confirmed</option><option>Pending Verification</option><option>Payment Pending – COD</option><option>COD Payment Collected</option></select></div>
            <div className="filter-group"><label>Order Status</label><select value={filterOrderStatus} onChange={(e) => setFilterOrderStatus(e.target.value)}><option value="">All Stages</option>{ORDER_STATUSES.map((st) => <option key={st}>{st}</option>)}</select></div>
          </div>

          {filteredOrders.length ? (
            <div className="admin-table-wrap">
              <table className="admin-order-table">
                <thead>
                  <tr><th>Order ID</th><th>Customer</th><th>Items &amp; Customisation</th><th>Payment</th><th>Delivery &amp; Notes</th><th>Order Progress</th></tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>{order.id}</strong>
                        <small>{new Date(order.createdAt).toLocaleDateString("en-IN")}</small>
                        <strong>{formatPrice(order.total)}</strong>
                      </td>
                      <td>{order.customer?.name}<small>{order.customer?.phone} · {order.customer?.email}</small><small>{order.customer?.address}, {order.customer?.city} {order.customer?.pin}</small></td>
                      <td>
                        {(order.items || []).map((item) => (
                          <div key={item.key} style={{ marginBottom: 6 }}>
                            <strong>{item.name} × {item.quantity || 1}</strong> ({item.colour})
                            <small>Fabric: {item.configuration?.fabricBrand} · Size: {item.configuration?.size}</small>
                          </div>
                        ))}
                      </td>
                      <td>
                        <strong>{order.paymentMethod || order.customer?.payment}</strong>
                        <small>{order.paymentStatus || "Pending"}</small>
                        {order.paymentId && <small>ID: {order.paymentId}</small>}
                        {order.paymentReference && <small>UTR: {order.paymentReference}</small>}
                        {order.paymentStatus === "Pending Verification" && (
                          <button type="button" className="text-button verify-upi-btn" onClick={() => verifyUpiPayment(order.id)}>
                            <CheckCircle2 size={13} /> Verify UPI
                          </button>
                        )}
                        {order.paymentStatus === "Payment Pending – COD" && (
                          <button type="button" className="text-button verify-upi-btn" onClick={() => markCodCollected(order.id)}>
                            <CheckCircle2 size={13} /> Mark COD Paid
                          </button>
                        )}
                      </td>
                      <td>
                        <input
                          type="date"
                          value={order.expectedDeliveryDate || ""}
                          onChange={(e) => patchOrder(order.id, { expectedDeliveryDate: e.target.value, note: "Expected delivery date updated" }, "Delivery date updated.")}
                          aria-label="Expected delivery date"
                        />
                        <input
                          style={{ marginTop: 6 }}
                          defaultValue={order.internalNotes || ""}
                          placeholder="Internal note..."
                          onBlur={(e) => {
                            if (e.target.value !== (order.internalNotes || "")) {
                              patchOrder(order.id, { internalNotes: e.target.value, note: "Internal note updated" }, "Note saved.");
                            }
                          }}
                        />
                        <button type="button" className="text-button" onClick={() => setExpandedHistoryId(expandedHistoryId === order.id ? null : order.id)}>
                          {expandedHistoryId === order.id ? "Hide history" : `History (${(order.statusHistory || []).length})`}
                        </button>
                        {expandedHistoryId === order.id && (
                          <div className="admin-history-box">
                            {(order.statusHistory || []).map((h, i) => (
                              <small key={i}>{new Date(h.timestamp).toLocaleString("en-IN")} — <strong>{h.status}</strong> ({h.updatedBy})</small>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <select value={order.status} onChange={(event) => patchOrder(order.id, { status: event.target.value }, `Order ${order.id} moved to ${event.target.value}.`)}>
                          {ORDER_STATUSES.map((st) => <option key={st}>{st}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty-note">No matching orders found.</p>}
        </section>
      )}

      {tab === "Appointments" && (
        <section className="admin-panel">
          <span className="eyebrow">Atelier schedule</span>
          <h2>Appointment Management</h2>
          {appointments.length ? (
            <div className="admin-table-wrap">
              <table className="admin-order-table">
                <thead><tr><th>Client</th><th>Purpose &amp; Garment</th><th>Date &amp; Slot</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {appointments.map((apt) => (
                    <tr key={apt.id}>
                      <td><strong>{apt.name}</strong><small>{apt.phone} · {apt.email}</small></td>
                      <td>{apt.purpose || "Fitting"}<small>{apt.interest}</small></td>
                      <td>
                        <input type="date" value={apt.date} onChange={(e) => setAppointments((curr) => curr.map((a) => a.id === apt.id ? { ...a, date: e.target.value, status: "Rescheduled" } : a))} />
                        <small>{apt.time}</small>
                      </td>
                      <td><span className="status-pill">{apt.status}</span></td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="button" className="text-button" onClick={() => { setAppointments((curr) => curr.map((a) => a.id === apt.id ? { ...a, status: "Approved" } : a)); notify("Appointment approved."); }}>
                            <CheckCircle2 size={14} /> Approve
                          </button>
                          <button type="button" className="text-button delete-image" onClick={() => { setAppointments((curr) => curr.map((a) => a.id === apt.id ? { ...a, status: "Rejected" } : a)); notify("Appointment rejected."); }}>
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty-note">No appointments booked yet.</p>}
        </section>
      )}

      {tab === "Customers" && (
        <section className="admin-panel">
          <span className="eyebrow">Client directory</span>
          <h2>Registered Customers ({registeredCustomers.length})</h2>
          {registeredCustomers.length ? (
            <div className="admin-table-wrap">
              <table className="admin-order-table">
                <thead><tr><th>Name</th><th>Email</th><th>Mobile</th><th>Orders</th></tr></thead>
                <tbody>
                  {registeredCustomers.map((c) => {
                    const count = orders.filter((o) => o.customer?.email?.toLowerCase() === c.email?.toLowerCase()).length;
                    return (
                      <tr key={c.uid}>
                        <td><strong>{c.name}</strong></td>
                        <td>{c.email}</td>
                        <td>{c.phone}</td>
                        <td>{count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="empty-note">No registered customer accounts in local directory yet.</p>}
        </section>
      )}

      {tab === "Homepage" && (
        <section className="admin-panel">
          <span className="eyebrow">Site &amp; Shop Configuration</span>
          <h2>Homepage &amp; Business Settings</h2>
          <div className="admin-fields-grid">
            <label className="field-control"><span>Hero Eyebrow</span><input value={siteConfig.heroEyebrow} onChange={(e) => setSiteConfig({ ...siteConfig, heroEyebrow: e.target.value })} /></label>
            <label className="field-control"><span>Hero Title</span><input value={siteConfig.heroTitle} onChange={(e) => setSiteConfig({ ...siteConfig, heroTitle: e.target.value })} /></label>
            <label className="field-control"><span>Hero Title Accent</span><input value={siteConfig.heroTitleAccent} onChange={(e) => setSiteConfig({ ...siteConfig, heroTitleAccent: e.target.value })} /></label>
            <label className="field-control"><span>Hero Image URL</span><input value={siteConfig.heroImage} onChange={(e) => setSiteConfig({ ...siteConfig, heroImage: e.target.value })} /></label>
            <label className="field-control field-control-full"><span>Hero Subtitle</span><textarea value={siteConfig.heroSubtitle} onChange={(e) => setSiteConfig({ ...siteConfig, heroSubtitle: e.target.value })} /></label>
            <label className="field-control"><span>Shop Opening Hours</span><input value={siteConfig.openingHours} onChange={(e) => setSiteConfig({ ...siteConfig, openingHours: e.target.value })} /></label>
            <label className="field-control"><span>Shop UPI ID</span><input value={siteConfig.upiId} onChange={(e) => setSiteConfig({ ...siteConfig, upiId: e.target.value })} /></label>
          </div>
          <button className="button button-gold" style={{ marginTop: 16 }} onClick={() => notify("Homepage & shop settings saved.")}><Save size={14} /> Save Settings</button>
        </section>
      )}
    </main>
  );
}
