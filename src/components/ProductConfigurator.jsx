import { useMemo, useState } from "react";
import { ArrowRight, Box, Heart, Image as ImageIcon, Ruler, X, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useStore } from "../context/StoreContext.jsx";
import { STANDARD_SIZES, SUIT_COLOURS } from "../data/products.js";
import { formatPrice } from "../lib/format.js";
import { GarmentViewer3D } from "./GarmentViewer3D.jsx";
import { ColourSelector, ProductMedia } from "./ProductMedia.jsx";

const MEASUREMENT_FIELDS = [
  ["Chest", "chest"], ["Waist", "waist"], ["Shoulder", "shoulder"], ["Sleeve", "sleeve"],
  ["Neck", "neck"], ["Jacket length", "jacketLength"], ["Hip", "hip"], ["Inseam", "inseam"],
];

const SIZE_GUIDE_ROWS = [
  { size: "XS", chest: "36", waist: "30", shoulder: "16.5", sleeve: "23.5" },
  { size: "S", chest: "38", waist: "32", shoulder: "17.25", sleeve: "24" },
  { size: "M", chest: "40", waist: "34", shoulder: "18", sleeve: "24.5" },
  { size: "L", chest: "42", waist: "36", shoulder: "18.75", sleeve: "25" },
  { size: "XL", chest: "44", waist: "38", shoulder: "19.5", sleeve: "25.5" },
  { size: "XXL", chest: "46", waist: "40", shoulder: "20.25", sleeve: "26" },
];

export function measurementValuesFromStore(measurements) {
  return measurements || Object.fromEntries(MEASUREMENT_FIELDS.map(([, key]) => [key, ""]));
}

function ruleAmount(pricing, type, value) {
  if (!value) return 0;
  const key = `${type}:${value}`;
  const rule = pricing.priceRules?.find((item) => item.key === key);
  return Number(rule?.amount) || 0;
}

export function getPriceBreakdown(product, fabricBrand, configuration, pricing) {
  const base = Number(product.price) || 0;
  const fabric = ruleAmount(pricing, "fabric", fabricBrand);
  const adjustments = (product.options || []).reduce((total, option) => {
    const value = configuration[option.key];
    if (!value) return total;
    if (option.key === "monogram") return total + (safeInitials(value) ? ruleAmount(pricing, "option", `${option.key}:added`) : 0);
    return total + ruleAmount(pricing, "option", `${option.key}:${value}`);
  }, 0);
  return { base, fabric, adjustments, total: base + fabric + adjustments };
}

function safeInitials(value) {
  return String(value || "").trim();
}

export function ProductConfigurator({ product, onAdd, onBook, initialColour }) {
  const {
    fabricBrands,
    pricing,
    measurements,
    setMeasurements,
    wishlist,
    toggleWishlist,
    setAuthGateOpen,
    setPendingAction,
    notify,
  } = useStore();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [colour, setColour] = useState(initialColour || product.defaultColour);
  const [view, setView] = useState("front");
  const [mediaMode, setMediaMode] = useState("photos"); // "photos" | "3d"
  const [fabricBrand, setFabricBrand] = useState(product.fabrics?.[0] || fabricBrands[0] || "Raymond");
  const [size, setSize] = useState("Made to measure");
  const [measureUnit, setMeasureUnit] = useState(measurements?.unit || "inches");
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [measureValues, setMeasureValues] = useState(() => measurementValuesFromStore(measurements));
  const [configuration, setConfiguration] = useState(() => Object.fromEntries((product.options || []).map((option) => [
    option.key,
    option.defaultValue ?? (option.type === "text" ? "" : option.values?.[0] || ""),
  ])));

  const breakdown = useMemo(() => getPriceBreakdown(product, fabricBrand, configuration, pricing), [product, fabricBrand, configuration, pricing]);
  const eligibleSuit = ["Two-Piece Suits", "Three-Piece Suits", "Wedding Collection"].includes(product.category);
  const colours = eligibleSuit ? SUIT_COLOURS : product.colours;
  const wished = wishlist.includes(product.id);
  const supports3D = ["Blazers", "Two-Piece Suits", "Three-Piece Suits", "Wedding Collection"].includes(product.category) || Boolean(product.model3d);

  function updateMeasurement(key, value) {
    setMeasureValues((current) => ({ ...current, [key]: value }));
  }

  function saveMeasurements() {
    setMeasurements({ ...measureValues, unit: measureUnit });
    notify("Your measurements have been saved.");
  }

  function buildLineItem() {
    if (size === "Made to measure" && showMeasurements) {
      setMeasurements({ ...measureValues, unit: measureUnit });
    }
    const selectedImage = product.images?.[colour]?.front || null;
    return {
      productId: product.id,
      name: product.name,
      category: product.category,
      colour,
      image: selectedImage,
      configuration: {
        ...configuration,
        fabricBrand,
        size,
        measurements: size === "Made to measure" ? { ...measureValues, unit: measureUnit } : null,
      },
      price: breakdown.total,
    };
  }

  function submit(event) {
    event.preventDefault();
    const item = buildLineItem();
    if (!isAuthenticated) {
      setPendingAction({ type: "add-to-cart", item, redirectTo: `/product/${product.id}` });
      setAuthGateOpen(true);
      return;
    }
    onAdd(item);
  }

  function handleBuyNow() {
    const item = buildLineItem();
    if (!isAuthenticated) {
      setPendingAction({ type: "buy-now", item, redirectTo: "/checkout" });
      setAuthGateOpen(true);
      return;
    }
    onAdd(item);
    navigate("/checkout");
  }

  return (
    <div className="product-detail-layout">
      <div className="product-media-column">
        {supports3D && (
          <div className="media-mode-tabs" role="tablist" aria-label="Product view mode">
            <button
              type="button"
              role="tab"
              aria-selected={mediaMode === "photos"}
              className={`media-mode-tab ${mediaMode === "photos" ? "media-mode-active" : ""}`}
              onClick={() => setMediaMode("photos")}
            >
              <ImageIcon size={14} /> Photographs
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mediaMode === "3d"}
              className={`media-mode-tab ${mediaMode === "3d" ? "media-mode-active" : ""}`}
              onClick={() => setMediaMode("3d")}
            >
              <Box size={14} /> 360° 3D View
            </button>
          </div>
        )}

        {mediaMode === "3d" ? (
          <GarmentViewer3D modelUrl={product.model3d} colour={colour} />
        ) : (
          <ProductMedia
            product={product}
            colour={colour}
            view={view}
            setView={setView}
            openZoom={(src) => window.dispatchEvent(new CustomEvent("ssawant:zoom", { detail: { src, alt: `${product.name} in ${colour}` } }))}
          />
        )}
      </div>

      <div className="product-detail-copy">
        <div className="product-eyebrow-row">
          <span className="eyebrow">{product.category} · Made to measure</span>
          <button
            type="button"
            className={`wishlist-inline-btn ${wished ? "wishlist-active" : ""}`}
            onClick={() => toggleWishlist(product.id)}
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart size={15} fill={wished ? "currentColor" : "none"} />
            <span>{wished ? "Saved" : "Wishlist"}</span>
          </button>
        </div>
        <h1>{product.name}</h1>
        <p className="product-description">{product.description}</p>
        <div className="detail-price">{formatPrice(breakdown.total)} <span>INR · Taxes included</span></div>

        <form className="config-form" onSubmit={submit}>
          <section className="config-field">
            <div className="config-label-row"><label>Colour</label><strong>{colour}</strong></div>
            <ColourSelector colours={colours} selected={colour} onSelect={(next) => { setColour(next); setView("front"); }} images={product.images} />
          </section>

          <div className="config-two-up">
            <label className="field-control">
              <span>Fabric house</span>
              <select value={fabricBrand} onChange={(event) => setFabricBrand(event.target.value)}>
                {(product.fabrics?.length ? product.fabrics : fabricBrands).map((brand) => <option key={brand}>{brand}</option>)}
              </select>
            </label>
            <div className="field-control">
              <div className="size-label-row">
                <span>Size / measurement</span>
                <button type="button" className="text-button size-guide-trigger" onClick={() => setShowSizeGuide(true)}>
                  Size guide
                </button>
              </div>
              <select value={size} onChange={(event) => { setSize(event.target.value); setShowMeasurements(event.target.value === "Made to measure"); }}>
                {STANDARD_SIZES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
          </div>

          <div className="option-grid">
            {(product.options || []).map((option) => (
              <label className={`field-control ${option.type === "text" ? "field-control-full" : ""}`} key={option.key}>
                <span>{option.label}{option.key === "monogram" && <small> Optional</small>}</span>
                {option.type === "text" ? (
                  <input maxLength={3} value={configuration[option.key] || ""} placeholder={option.placeholder || "Optional"} onChange={(event) => setConfiguration((current) => ({ ...current, [option.key]: event.target.value.toUpperCase() }))} />
                ) : option.type === "number" ? (
                  <div className="number-control"><input type="number" min={option.min} max={option.max} step={option.step} value={configuration[option.key]} onChange={(event) => setConfiguration((current) => ({ ...current, [option.key]: event.target.value }))} /><span>{option.suffix}</span></div>
                ) : (
                  <select value={configuration[option.key]} onChange={(event) => setConfiguration((current) => ({ ...current, [option.key]: event.target.value }))}>
                    {(option.values || []).map((value) => <option key={value}>{value}</option>)}
                  </select>
                )}
              </label>
            ))}
          </div>

          <div className="measurement-toggle">
            <div><Ruler size={16} /><span>Make it personal<small>{measurements ? "Saved measurements available" : "Enter measurements or book an in-person fitting"}</small></span></div>
            <button type="button" className="text-button" onClick={() => { setSize("Made to measure"); setShowMeasurements((shown) => !shown); }}>{showMeasurements ? "Hide" : measurements ? "Edit" : "Add measurements"}</button>
          </div>

          {showMeasurements && (
            <div className="measurement-fields">
              <div className="measurement-unit-bar">
                <p>Enter measurements in {measureUnit}. You can update these anytime in your account.</p>
                <div className="unit-toggle">
                  <button type="button" className={measureUnit === "inches" ? "unit-active" : ""} onClick={() => setMeasureUnit("inches")}>Inches</button>
                  <button type="button" className={measureUnit === "cm" ? "unit-active" : ""} onClick={() => setMeasureUnit("cm")}>cm</button>
                </div>
              </div>
              {MEASUREMENT_FIELDS.map(([label, key]) => (
                <label className="field-control" key={key}>
                  <span>{label} ({measureUnit === "inches" ? "in" : "cm"})</span>
                  <input type="number" min="10" max="200" step="0.25" value={measureValues[key] || ""} onChange={(event) => updateMeasurement(key, event.target.value)} placeholder={measureUnit === "inches" ? "e.g. 38" : "e.g. 96"} />
                </label>
              ))}
              <button type="button" className="text-button save-measurements" onClick={saveMeasurements}>Save measurements</button>
            </div>
          )}

          <div className="delivery-note"><span className="delivery-dot" /> Estimated making &amp; delivery: 2–3 weeks, confirmed after fitting</div>
          <div className="price-breakdown">
            <div><span>Made-to-measure piece</span><span>{formatPrice(breakdown.base)}</span></div>
            <div><span>{fabricBrand} fabric selection</span><span>{breakdown.fabric ? `+ ${formatPrice(breakdown.fabric)}` : "Included"}</span></div>
            {breakdown.adjustments > 0 && <div><span>Selected finishing options</span><span>+ {formatPrice(breakdown.adjustments)}</span></div>}
            <div className="price-total"><strong>Current total</strong><strong>{formatPrice(breakdown.total)}</strong></div>
            <small>Any added charges are configured by the atelier. No unlisted fabric or detail premiums are assumed.</small>
          </div>

          <div className="purchase-actions">
            {product.inStock === false ? (
              <button type="button" className="button button-gold" disabled style={{ opacity: 0.65, cursor: "not-allowed", background: "rgba(127, 29, 29, 0.85)", borderColor: "#ef4444" }}>
                Currently Out of Stock
              </button>
            ) : (
              <>
                <button type="submit" className="button button-gold">Add to Cart <ArrowRight size={15} /></button>
                <button type="button" className="button button-outline" onClick={handleBuyNow}><Zap size={14} /> Buy Now</button>
              </>
            )}
            <button type="button" className="button button-outline" onClick={onBook}>Book Appointment</button>
          </div>
        </form>
      </div>

      {showSizeGuide && (
        <div className="auth-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowSizeGuide(false); }}>
          <div className="auth-modal size-guide-modal" role="dialog" aria-modal="true" aria-label="Size Guide">
            <button className="auth-modal-close" onClick={() => setShowSizeGuide(false)} aria-label="Close"><X size={20} /></button>
            <span className="eyebrow">S. SAWANT · Fit Reference</span>
            <h2>Standard Size Guide (Inches)</h2>
            <p className="size-guide-note">For the finest fit, we recommend selecting <strong>Made to measure</strong> or booking an in-person fitting at our Chhatrapati Sambhajinagar atelier.</p>
            <div className="admin-table-wrap">
              <table className="size-guide-table">
                <thead>
                  <tr><th>Size</th><th>Chest</th><th>Waist</th><th>Shoulder</th><th>Sleeve</th></tr>
                </thead>
                <tbody>
                  {SIZE_GUIDE_ROWS.map((row) => (
                    <tr key={row.size}>
                      <td><strong>{row.size}</strong></td>
                      <td>{row.chest}"</td>
                      <td>{row.waist}"</td>
                      <td>{row.shoulder}"</td>
                      <td>{row.sleeve}"</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
