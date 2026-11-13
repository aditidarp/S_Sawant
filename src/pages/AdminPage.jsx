import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  CheckCircle2,
  ImagePlus,
  Layers,
  Loader2,
  Lock,
  LogOut,
  Megaphone,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Store,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CATEGORIES, ORDER_STATUSES, SUIT_COLOURS } from "../data/products.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useStore } from "../context/StoreContext.jsx";
import { apiUrl } from "../lib/api.js";
import { createId, formatPrice } from "../lib/format.js";
import { repository, localImageToDataUrl } from "../services/repository.js";
import { ImagePlaceholder } from "../components/ProductMedia.jsx";

const TABS = ["Overview", "Products", "Images", "Fabrics", "Pricing & Coupons", "Orders", "Appointments", "Customers", "Homepage & Content"];
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

function ProductEditor({ product, onSave, onDelete, onNew, fabricBrands, isSaving }) {
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
      <button className="button button-gold" type="submit" disabled={isSaving} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {isSaving ? <Loader2 size={14} className="spin-icon" /> : <Save size={14} />}
        {isSaving ? "Saving to Database..." : "Save Product to Database"}
      </button>
    </form>
  );
}

function ImageManager({ products, onUpdate }) {
  const [productId, setProductId] = useState(products[0]?.id || "");
  const product = products.find((item) => item.id === productId) || products[0];
  const [colour, setColour] = useState(product?.defaultColour || "");
  const [view, setView] = useState("front");
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!product) return;
    if (!product.colours.includes(colour)) setColour(product.defaultColour);
  }, [product, colour]);

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file || !product) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose a valid image file (JPEG, PNG or WebP).");
      return;
    }
    setUploading(true);
    setError("");
    setStatusMessage("Uploading image to server...");

    try {
      // 1. Upload to dedicated server upload endpoint
      const uploadResult = await repository.uploadImage(file, {
        productId: product.id,
        colour,
        view,
      });

      const serverImageUrl = uploadResult.url;
      setStatusMessage("Saving to database & synchronizing across devices...");

      // 2. Update product model with persistent server image URL
      const updated = {
        ...product,
        images: {
          ...product.images,
          [colour]: { ...(product.images?.[colour] || {}), [view]: serverImageUrl },
        },
      };

      // 3. Save updated product catalog to store database
      await onUpdate(updated);

      setStatusMessage(`✓ ${colour} ${view} photo uploaded and synchronized across all devices!`);
      setError("");
      event.target.value = "";
    } catch (problem) {
      setError(`Image upload failed: ${problem.message}`);
      setStatusMessage("");
    } finally {
      setUploading(false);
    }
  }

  if (!product) return <p className="empty-note">Add a product before uploading images.</p>;
  const existing = product.images?.[colour]?.[view];

  return (
    <section className="admin-panel">
      <span className="eyebrow">Verified product photography</span>
      <h2>Colour image library</h2>
      <p className="admin-subcopy">Each colour and angle is independent. Upload photographs for each garment variant. Images are automatically saved to the central database and synchronized across all devices.</p>
      <div className="admin-fields-grid">
        <label className="field-control"><span>Product</span><select value={product.id} onChange={(event) => setProductId(event.target.value)}>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="field-control"><span>Colour variant</span><select value={colour} onChange={(event) => setColour(event.target.value)}>{product.colours.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="field-control"><span>View</span><select value={view} onChange={(event) => setView(event.target.value)}>{VIEWS.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
      </div>
      <div className="admin-photo-preview">{existing ? <img src={existing} alt={`${product.name} ${colour} ${view}`} /> : <ImagePlaceholder colour={colour} view={view} />}</div>
      <label className="button button-gold upload-control" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
        {uploading ? <Loader2 size={15} className="spin-icon" /> : <ImagePlus size={15} />}
        <span>{uploading ? (statusMessage || "Uploading...") : `Upload ${colour} ${view} Photo`}</span>
        <input type="file" accept="image/*" onChange={upload} disabled={uploading} style={{ display: "none" }} />
      </label>
      {existing && <button type="button" className="text-button delete-image" style={{ marginLeft: 12 }} onClick={async () => { const images = { ...product.images, [colour]: { ...product.images[colour] } }; delete images[colour][view]; if (!Object.keys(images[colour]).length) delete images[colour]; await onUpdate({ ...product, images }); }}>Remove this image</button>}
      {statusMessage && !error && !uploading && <p style={{ color: "#4ade80", marginTop: 8, fontSize: "0.9rem" }}>{statusMessage}</p>}
      {error && <p className="form-error">{error}</p>}
    </section>
  );
}

function FabricManager({ fabricBrands, setFabricBrands, fabricCatalog, setFabricCatalog, setProducts, notify, saveToDatabase, isSaving }) {
  const [brandsText, setBrandsText] = useState(fabricBrands.join(", "));
  const [newSwatch, setNewSwatch] = useState({ brand: fabricBrands[0] || "Raymond", name: "", type: "Wool", colour: "Navy Blue", hex: "#1e2d4a", price: 1500, description: "" });

  async function addSwatch(e) {
    e.preventDefault();
    if (!newSwatch.name.trim()) return;
    const nextCatalog = [{ ...newSwatch, id: createId("fab"), available: true, price: Number(newSwatch.price) || 0, categories: CATEGORIES.map((c) => c.id) }, ...fabricCatalog];
    setFabricCatalog(nextCatalog);
    setNewSwatch({ ...newSwatch, name: "", description: "" });
    try {
      await saveToDatabase("fabricCatalog", nextCatalog);
      notify("Fabric swatch added & saved to database.");
    } catch {
      // notification handled
    }
  }

  async function saveBrands() {
    const brands = [...new Set(brandsText.split(",").map((b) => b.trim()).filter(Boolean))];
    if (!brands.length) return notify("At least one fabric house is required.");
    setFabricBrands(brands);
    const nextProducts = (products) => products.map((item) => ({ ...item, fabrics: brands }));
    try {
      await saveToDatabase("fabricBrands", brands);
      notify("Fabric houses saved to database.");
    } catch {
      // notification handled
    }
  }

  return (
    <div className="admin-pricing-layout">
      <section className="admin-panel">
        <span className="eyebrow">Supplier catalogue</span>
        <h2>Fabric Houses</h2>
        <label className="field-control"><span>Fabric brands · comma separated</span><textarea value={brandsText} onChange={(e) => setBrandsText(e.target.value)} /></label>
        <button className="button button-gold" style={{ marginTop: 12 }} onClick={saveBrands} disabled={isSaving}>
          <Save size={14} /> Save Fabric Houses to Database
        </button>

        <h3 style={{ marginTop: 28 }}>Add Fabric Swatch</h3>
        <form className="admin-rule-form" onSubmit={addSwatch}>
          <label className="field-control"><span>Brand</span><select value={newSwatch.brand} onChange={(e) => setNewSwatch({ ...newSwatch, brand: e.target.value })}>{fabricBrands.map((b) => <option key={b}>{b}</option>)}</select></label>
          <label className="field-control"><span>Swatch name</span><input required value={newSwatch.name} onChange={(e) => setNewSwatch({ ...newSwatch, name: e.target.value })} placeholder="e.g. Super 120s Charcoal" /></label>
          <label className="field-control"><span>Type</span><select value={newSwatch.type} onChange={(e) => setNewSwatch({ ...newSwatch, type: e.target.value })}><option>Wool</option><option>Cotton</option><option>Linen</option><option>Poly-viscose</option><option>Cotton blends</option><option>Tweed</option></select></label>
          <label className="field-control"><span>Colour</span><input required value={newSwatch.colour} onChange={(e) => setNewSwatch({ ...newSwatch, colour: e.target.value })} /></label>
          <label className="field-control"><span>Swatch Hex</span><input type="color" value={newSwatch.hex} onChange={(e) => setNewSwatch({ ...newSwatch, hex: e.target.value })} /></label>
          <label className="field-control"><span>Additional Charge (INR)</span><input type="number" min="0" step="100" value={newSwatch.price} onChange={(e) => setNewSwatch({ ...newSwatch, price: e.target.value })} /></label>
          <button className="button button-gold" type="submit" disabled={isSaving}><Plus size={14} /> Add Swatch to Database</button>
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
                <button type="button" className="text-button" onClick={async () => {
                  const nextCatalog = fabricCatalog.map((f) => f.id === fab.id ? { ...f, available: !f.available } : f);
                  setFabricCatalog(nextCatalog);
                  await saveToDatabase("fabricCatalog", nextCatalog);
                }}>
                  {fab.available ? "In Stock" : "Paused"}
                </button>
                <button type="button" className="icon-control admin-delete" onClick={async () => {
                  const nextCatalog = fabricCatalog.filter((f) => f.id !== fab.id);
                  setFabricCatalog(nextCatalog);
                  await saveToDatabase("fabricCatalog", nextCatalog);
                  notify("Swatch removed from database.");
                }} aria-label="Remove swatch"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PricingManager({ products, fabricBrands, pricing, onProducts, onPricing, notify, saveToDatabase, isSaving }) {
  const [ruleType, setRuleType] = useState("fabric");
  const [ruleName, setRuleName] = useState("");
  const [ruleValue, setRuleValue] = useState("");
  const [ruleAmount, setRuleAmount] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [couponPct, setCouponPct] = useState(10);
  const [error, setError] = useState("");

  async function addRule(event) {
    event.preventDefault();
    if ((!ruleName.trim() && ruleType === "option") || !ruleValue.trim() || Number(ruleAmount) < 0) {
      setError("Choose a rule name and non-negative amount.");
      return;
    }
    const key = ruleType === "fabric" ? `fabric:${ruleValue}` : `option:${ruleName}:${ruleValue}`;
    const next = (pricing.priceRules || []).filter((rule) => rule.key !== key);
    next.push({ key, label: ruleType === "fabric" ? `Fabric: ${ruleValue}` : `${ruleName}: ${ruleValue}`, amount: Number(ruleAmount) });
    const updatedPricing = { ...pricing, priceRules: next };
    onPricing(updatedPricing);
    setRuleName("");
    setRuleAmount(0);
    setError("");
    try {
      await saveToDatabase("pricing", updatedPricing);
      notify("Price rule saved to database.");
    } catch {
      // handled
    }
  }

  async function addCoupon(e) {
    e.preventDefault();
    if (!couponCode.trim()) return;
    const code = couponCode.trim().toUpperCase();
    const next = (pricing.coupons || []).filter((c) => c.code !== code);
    next.push({ code, discountPercent: Number(couponPct) || 10, active: true, description: `${couponPct}% discount code` });
    const updatedPricing = { ...pricing, coupons: next };
    onPricing(updatedPricing);
    setCouponCode("");
    try {
      await saveToDatabase("pricing", updatedPricing);
      notify(`Coupon ${code} saved to database.`);
    } catch {
      // handled
    }
  }

  async function handleSavePricing() {
    try {
      await Promise.all([
        saveToDatabase("pricing", pricing),
        saveToDatabase("products", products),
      ]);
      notify("All base prices and pricing rules saved to database.");
    } catch {
      // handled
    }
  }

  return (
    <div className="admin-pricing-layout">
      <section className="admin-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div><span className="eyebrow">Price book</span><h2>Base Prices</h2></div>
          <button className="button button-gold" onClick={handleSavePricing} disabled={isSaving} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Save size={14} /> Save Prices to Database
          </button>
        </div>
        {products.map((product) => (
          <label className="price-edit-row" key={product.id}>
            <span>{product.name}<small>{product.category}</small></span>
            <span className="price-edit-input">₹<input type="number" min="0" step="100" value={product.price} onChange={(event) => onProducts(products.map((item) => item.id === product.id ? { ...item, price: Number(event.target.value) } : item))} /></span>
          </label>
        ))}

        <h3 style={{ marginTop: 28 }}>Discount Coupons &amp; Offers</h3>
        <form className="admin-rule-form" onSubmit={addCoupon}>
          <label className="field-control"><span>Coupon Code</span><input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="e.g. FESTIVE15" /></label>
          <label className="field-control"><span>Discount %</span><input type="number" min="1" max="90" value={couponPct} onChange={(e) => setCouponPct(e.target.value)} /></label>
          <button className="button button-outline" type="submit" disabled={isSaving}><Plus size={14} /> Add Coupon</button>
        </form>
        <div className="price-rules-list">
          {(pricing.coupons || []).map((c) => (
            <div className="price-edit-row" key={c.code}>
              <span>{c.code}<small>{c.discountPercent}% off {c.active ? "· Active" : "· Inactive"}</small></span>
              <button type="button" className="icon-control admin-delete" onClick={async () => {
                const nextCoupons = pricing.coupons.filter((x) => x.code !== c.code);
                const nextPricing = { ...pricing, coupons: nextCoupons };
                onPricing(nextPricing);
                await saveToDatabase("pricing", nextPricing);
                notify(`Coupon ${c.code} deleted.`);
              }}><Trash2 size={15} /></button>
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
          <button className="button button-gold" type="submit" disabled={isSaving}><Plus size={14} /> Save Price Rule to Database</button>
          {error && <p className="form-error">{error}</p>}
        </form>
        <div className="price-rules-list">
          {(pricing.priceRules || []).length ? pricing.priceRules.map((rule) => (
            <div className="price-edit-row" key={rule.key}>
              <span>{rule.label}<small>{rule.key}</small></span>
              <strong>+ {formatPrice(rule.amount)}</strong>
              <button className="icon-control admin-delete" onClick={async () => {
                const nextRules = pricing.priceRules.filter((r) => r.key !== rule.key);
                const nextPricing = { ...pricing, priceRules: nextRules };
                onPricing(nextPricing);
                await saveToDatabase("pricing", nextPricing);
              }} aria-label={`Remove ${rule.label}`}><Trash2 size={15} /></button>
            </div>
          )) : <p className="empty-note">No price rules added yet.</p>}
        </div>
      </section>
    </div>
  );
}

export default function AdminPage() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const {
    products, setProducts,
    fabricBrands, setFabricBrands,
    fabricCatalog, setFabricCatalog,
    pricing, setPricing,
    siteConfig, setSiteConfig,
    orders, setOrders,
    appointments, setAppointments,
    customers,
    notify,
    syncStatus,
    isSaving,
    lastSyncedAt,
    dbVersion,
    saveToDatabase,
    publishAll,
    refreshFromDatabase,
  } = useStore();
  const navigate = useNavigate();

  const [tab, setTab] = useState("Overview");
  const [selectedId, setSelectedId] = useState(products[0]?.id || "");
  const selectedProduct = products.find((item) => item.id === selectedId) || products[0];

  const [orderSearch, setOrderSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterPayStatus, setFilterPayStatus] = useState("");
  const [filterOrderStatus, setFilterOrderStatus] = useState("");
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [codSettings, setCodSettings] = useState({ codEnabled: true, codCharge: 0, upiId: "omawant170604@okicici" });
  const [serverOrders, setServerOrders] = useState([]);

  useEffect(() => {
    let active = true;
    async function fetchBackendState() {
      try {
        const res = await fetch(apiUrl("/api/health"));
        const data = await res.json();
        if (active && data.ok) {
          setCodSettings({
            codEnabled: data.codEnabled ?? true,
            codCharge: data.codCharge ?? 0,
            upiId: data.upiId || "omawant170604@okicici",
          });
        }
      } catch { /* ignore */ }

      try {
        const res = await fetch(apiUrl("/api/admin/orders"), {
          headers: {
            "X-Admin-Role": "admin",
            "X-Admin-Email": user?.email || "admin",
          },
        });
        const data = await res.json();
        if (active && data.orders && Array.isArray(data.orders)) {
          setServerOrders(data.orders);
        }
      } catch { /* ignore */ }
    }
    fetchBackendState();
    return () => { active = false; };
  }, [user]);

  const allOrders = useMemo(() => {
    const map = new Map();
    for (const o of orders) map.set(o.id, o);
    for (const o of serverOrders) map.set(o.id, { ...(map.get(o.id) || {}), ...o });
    return Array.from(map.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [orders, serverOrders]);

  const filteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      const q = orderSearch.toLowerCase();
      const matchesSearch = !q ||
        order.id?.toLowerCase().includes(q) ||
        order.customer?.name?.toLowerCase().includes(q) ||
        order.customer?.phone?.includes(q) ||
        order.customer?.email?.toLowerCase().includes(q);
      const matchesMethod = !filterMethod || (order.paymentMethod || order.customer?.payment) === filterMethod;
      const matchesPay = !filterPayStatus || order.paymentStatus === filterPayStatus;
      const matchesOrder = !filterOrderStatus || order.status === filterOrderStatus;
      return matchesSearch && matchesMethod && matchesPay && matchesOrder;
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

  async function saveProduct(product) {
    const exists = products.some((item) => item.id === product.id);
    const next = exists ? products.map((item) => item.id === product.id ? product : item) : [...products, product];
    setProducts(next);
    setSelectedId(product.id);
    try {
      await saveToDatabase("products", next);
    } catch {
      // notification handled in saveToDatabase
    }
  }

  async function updateProduct(product) {
    const next = products.map((item) => item.id === product.id ? product : item);
    setProducts(next);
    try {
      await saveToDatabase("products", next);
      notify("Product updated in database.");
    } catch (err) {
      notify(`Database save warning: ${err.message}`);
      throw err;
    }
  }

  async function removeProduct(id) {
    if (!window.confirm("Remove this product permanently from the database?")) return;
    const next = products.filter((item) => item.id !== id);
    setProducts(next);
    setSelectedId(next[0]?.id || "");
    try {
      await saveToDatabase("products", next);
      notify("Product removed from database.");
    } catch {
      // notification handled
    }
  }

  async function patchOrder(orderId, updates, successMsg) {
    try {
      const res = await fetch(apiUrl(`/api/admin/orders/${encodeURIComponent(orderId)}`), {
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
      }
    } catch { /* fallback to local */ }

    const nextOrders = orders.map((o) => o.id === orderId ? { ...o, ...updates } : o);
    setOrders(nextOrders);
    try {
      await saveToDatabase("orders", nextOrders);
    } catch { /* ignore */ }
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
      const res = await fetch(apiUrl("/api/admin/settings"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Role": "admin",
          "X-Admin-Email": user?.email || "admin",
        },
        body: JSON.stringify(codSettings),
      });
      if (res.ok) notify("COD settings saved to backend.");
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

  async function handleCategoryImageUpload(categoryId, file) {
    if (!file) return;
    try {
      const dataUrl = await localImageToDataUrl(file);
      const nextCategoryImages = {
        ...(siteConfig.categoryImages || {}),
        [categoryId]: dataUrl,
      };
      const updatedConfig = { ...siteConfig, categoryImages: nextCategoryImages };
      setSiteConfig(updatedConfig);
      await saveToDatabase("siteConfig", updatedConfig);
      notify(`Category image for ${categoryId} updated in database.`);
    } catch (err) {
      notify(`Image upload failed: ${err.message}`);
    }
  }

  async function handleHeroImageUpload(file) {
    if (!file) return;
    try {
      const dataUrl = await localImageToDataUrl(file);
      const updatedConfig = { ...siteConfig, heroImage: dataUrl };
      setSiteConfig(updatedConfig);
      await saveToDatabase("siteConfig", updatedConfig);
      notify("Homepage hero image updated in database.");
    } catch (err) {
      notify(`Hero image upload failed: ${err.message}`);
    }
  }

  return (
    <main className="page-shell admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">S. SAWANT · Atelier Central Control</span>
          <h1>Admin Dashboard</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span className="local-admin-badge">Signed in: {user?.email}</span>
          <button type="button" className="button button-outline" onClick={handleAdminLogout}>
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </div>

      {/* Centralized Backend Database Synchronization & Publish Bar */}
      <div className="admin-sync-bar" style={{
        background: "rgba(11, 20, 35, 0.95)",
        border: "1px solid var(--border-gold)",
        borderRadius: "8px",
        padding: "14px 20px",
        marginBottom: "24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: 11,
            height: 11,
            borderRadius: "50%",
            background: syncStatus === "saving" ? "#f59e0b" : syncStatus === "error" ? "#ef4444" : "#10b981",
            boxShadow: syncStatus === "saving" ? "0 0 10px #f59e0b" : syncStatus === "error" ? "0 0 10px #ef4444" : "0 0 10px #10b981",
          }} />
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--champagne)" }}>
              {syncStatus === "saving" ? "Saving to Central Database..." : syncStatus === "error" ? "Database Sync Notice" : "Central Database Synchronized"}
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)" }}>
              {lastSyncedAt ? `Active across all devices · Last confirmed: ${lastSyncedAt}` : "Permanent cloud storage active · Changes auto-reflect on customer devices"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className="button button-outline"
            style={{ padding: "8px 14px", fontSize: "12px" }}
            onClick={refreshFromDatabase}
            disabled={isSaving}
          >
            <RefreshCw size={13} className={isSaving ? "spin-icon" : ""} /> Sync from Database
          </button>
          <button
            type="button"
            className="button button-gold"
            style={{ padding: "8px 18px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
            onClick={publishAll}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={14} className="spin-icon" /> : <UploadCloud size={14} />}
            {isSaving ? "Saving to Database..." : "Save & Publish All Changes"}
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
              isSaving={isSaving}
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
          saveToDatabase={saveToDatabase}
          isSaving={isSaving}
        />
      )}

      {tab === "Pricing & Coupons" && (
        <PricingManager
          products={products}
          fabricBrands={fabricBrands}
          pricing={pricing}
          onProducts={setProducts}
          onPricing={setPricing}
          notify={notify}
          saveToDatabase={saveToDatabase}
          isSaving={isSaving}
        />
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
                        <input type="date" value={apt.date} onChange={async (e) => {
                          const nextApts = appointments.map((a) => a.id === apt.id ? { ...a, date: e.target.value, status: "Rescheduled" } : a);
                          setAppointments(nextApts);
                          await saveToDatabase("appointments", nextApts);
                        }} />
                        <small>{apt.time}</small>
                      </td>
                      <td><span className="status-pill">{apt.status}</span></td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="button" className="text-button" onClick={async () => {
                            const nextApts = appointments.map((a) => a.id === apt.id ? { ...a, status: "Approved" } : a);
                            setAppointments(nextApts);
                            await saveToDatabase("appointments", nextApts);
                            notify("Appointment approved in database.");
                          }}>
                            <CheckCircle2 size={14} /> Approve
                          </button>
                          <button type="button" className="text-button delete-image" onClick={async () => {
                            const nextApts = appointments.map((a) => a.id === apt.id ? { ...a, status: "Rejected" } : a);
                            setAppointments(nextApts);
                            await saveToDatabase("appointments", nextApts);
                            notify("Appointment rejected.");
                          }}>
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

      {tab === "Homepage & Content" && (
        <section className="admin-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <span className="eyebrow">Site &amp; Shop Configuration</span>
              <h2>Homepage, Banners &amp; Content Management</h2>
            </div>
            <button
              className="button button-gold"
              onClick={async () => {
                await saveToDatabase("siteConfig", siteConfig);
              }}
              disabled={isSaving}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {isSaving ? <Loader2 size={14} className="spin-icon" /> : <Save size={14} />}
              {isSaving ? "Publishing to Database..." : "Save & Publish Content"}
            </button>
          </div>

          <h3 style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 8, marginTop: 16 }}>
            Top Website Announcement Bar
          </h3>
          <p className="admin-subcopy">The announcement displayed at the very top of all pages across desktop and mobile.</p>
          <div className="admin-fields-grid" style={{ marginBottom: 24 }}>
            <label className="field-control">
              <span>Announcement Status</span>
              <select
                value={siteConfig.announcementEnabled !== false ? "enabled" : "disabled"}
                onChange={(e) => setSiteConfig({ ...siteConfig, announcementEnabled: e.target.value === "enabled" })}
              >
                <option value="enabled">Active (Shown on all devices)</option>
                <option value="disabled">Hidden</option>
              </select>
            </label>
            <label className="field-control">
              <span>Target Link</span>
              <input
                value={siteConfig.announcementLink || "/shop"}
                onChange={(e) => setSiteConfig({ ...siteConfig, announcementLink: e.target.value })}
                placeholder="/shop or https://..."
              />
            </label>
            <label className="field-control field-control-full">
              <span>Announcement Text</span>
              <input
                value={siteConfig.announcementText || ""}
                onChange={(e) => setSiteConfig({ ...siteConfig, announcementText: e.target.value })}
                placeholder="e.g. Complimentary delivery over ₹10,000 ✦ Bespoke Indian Menswear"
              />
            </label>
          </div>

          <h3 style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 8, marginTop: 24 }}>
            Homepage Promotional Banner
          </h3>
          <p className="admin-subcopy">Highlight seasonal offers, wedding booking periods, or trunk shows.</p>
          <div className="admin-fields-grid" style={{ marginBottom: 24 }}>
            <label className="field-control">
              <span>Banner Active</span>
              <select
                value={siteConfig.promotionalBannerActive ? "active" : "inactive"}
                onChange={(e) => setSiteConfig({ ...siteConfig, promotionalBannerActive: e.target.value === "active" })}
              >
                <option value="active">Active (Shown on Homepage)</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="field-control field-control-full">
              <span>Promotional Text</span>
              <input
                value={siteConfig.promotionalBannerText || ""}
                onChange={(e) => setSiteConfig({ ...siteConfig, promotionalBannerText: e.target.value })}
                placeholder="e.g. Wedding & Festive Season Atelier Booking Open"
              />
            </label>
          </div>

          <h3 style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 8, marginTop: 24 }}>
            Hero Presentation &amp; Headline
          </h3>
          <div className="admin-fields-grid" style={{ marginBottom: 24 }}>
            <label className="field-control">
              <span>Hero Eyebrow</span>
              <input value={siteConfig.heroEyebrow || ""} onChange={(e) => setSiteConfig({ ...siteConfig, heroEyebrow: e.target.value })} />
            </label>
            <label className="field-control">
              <span>Hero Title</span>
              <input value={siteConfig.heroTitle || ""} onChange={(e) => setSiteConfig({ ...siteConfig, heroTitle: e.target.value })} />
            </label>
            <label className="field-control">
              <span>Hero Title Accent (Italicised)</span>
              <input value={siteConfig.heroTitleAccent || ""} onChange={(e) => setSiteConfig({ ...siteConfig, heroTitleAccent: e.target.value })} />
            </label>
            <label className="field-control">
              <span>Hero Image URL</span>
              <input value={siteConfig.heroImage || ""} onChange={(e) => setSiteConfig({ ...siteConfig, heroImage: e.target.value })} />
            </label>
            <div className="field-control">
              <span>Upload New Hero Image</span>
              <label className="button button-outline" style={{ marginTop: 4, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <ImagePlus size={14} /> Upload Hero Photograph
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleHeroImageUpload(e.target.files?.[0])} />
              </label>
            </div>
            <label className="field-control field-control-full">
              <span>Hero Subtitle Copy</span>
              <textarea value={siteConfig.heroSubtitle || ""} onChange={(e) => setSiteConfig({ ...siteConfig, heroSubtitle: e.target.value })} rows={3} />
            </label>
          </div>

          <h3 style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 8, marginTop: 24 }}>
            Category &amp; Collection Photography
          </h3>
          <p className="admin-subcopy">Customize the images displayed on the homepage category tiles for each collection.</p>
          <div className="admin-fields-grid" style={{ marginBottom: 24 }}>
            {CATEGORIES.map((cat) => {
              const currentImg = siteConfig.categoryImages?.[cat.id] || "";
              return (
                <div key={cat.id} className="field-control" style={{ border: "1px solid rgba(255,255,255,0.08)", padding: 12, borderRadius: 6 }}>
                  <span style={{ fontWeight: 600, color: "var(--champagne)" }}>{cat.name}</span>
                  <input
                    value={currentImg}
                    placeholder="/images/... or URL"
                    onChange={(e) => {
                      const next = { ...(siteConfig.categoryImages || {}), [cat.id]: e.target.value };
                      setSiteConfig({ ...siteConfig, categoryImages: next });
                    }}
                    style={{ marginTop: 6, fontSize: 12 }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                    <label className="text-button" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <ImagePlus size={12} /> Upload Photo
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleCategoryImageUpload(cat.id, e.target.files?.[0])} />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <h3 style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 8, marginTop: 24 }}>
            Atelier &amp; Shop Details
          </h3>
          <div className="admin-fields-grid" style={{ marginBottom: 24 }}>
            <label className="field-control"><span>Opening Hours</span><input value={siteConfig.openingHours || ""} onChange={(e) => setSiteConfig({ ...siteConfig, openingHours: e.target.value })} /></label>
            <label className="field-control"><span>Merchant UPI ID</span><input value={siteConfig.upiId || ""} onChange={(e) => setSiteConfig({ ...siteConfig, upiId: e.target.value })} /></label>
            <label className="field-control"><span>Contact Phone</span><input value={siteConfig.contactPhone || ""} onChange={(e) => setSiteConfig({ ...siteConfig, contactPhone: e.target.value })} /></label>
            <label className="field-control"><span>Contact Email</span><input value={siteConfig.contactEmail || ""} onChange={(e) => setSiteConfig({ ...siteConfig, contactEmail: e.target.value })} /></label>
            <label className="field-control field-control-full"><span>Atelier Address</span><input value={siteConfig.contactAddress || ""} onChange={(e) => setSiteConfig({ ...siteConfig, contactAddress: e.target.value })} /></label>
          </div>

          <button
            className="button button-gold"
            style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={async () => {
              await saveToDatabase("siteConfig", siteConfig);
            }}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={14} className="spin-icon" /> : <Save size={14} />}
            {isSaving ? "Saving to Database..." : "Save & Publish All Content to Database"}
          </button>
        </section>
      )}
    </main>
  );
}
