import { useState, useMemo } from "react";
import { ArrowRight, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext.jsx";
import { FABRIC_BRANDS } from "../data/products.js";

const FABRIC_TYPES = [
  { type: "Wool", description: "Rich drape and natural resilience, ideal for suits and blazers." },
  { type: "Cotton", description: "Breathable and versatile, perfect for shirts and summer wear." },
  { type: "Linen", description: "Cool, textured cloth with effortless elegance for warm days." },
  { type: "Poly-Viscose", description: "Smooth, crease-resistant blends for daily tailoring." },
  { type: "Cotton Blend", description: "The best of cotton with added durability and comfort." },
  { type: "Tweed", description: "Textured, substantial cloth for distinguished jackets." },
];

const BRAND_INFO = {
  Raymond: {
    tagline: "India's finest suiting since 1925",
    description: "Raymond is synonymous with Indian menswear. Known for premium wool-blended suiting fabrics, their cloths deliver exceptional drape and longevity.",
    types: ["Wool", "Poly-Viscose", "Cotton Blend"],
    swatches: [
      { name: "Charcoal Pinstripe", colour: "#3a3a3a", type: "Wool", price: 2500 },
      { name: "Navy Solid", colour: "#1e2d4a", type: "Wool", price: 2200 },
      { name: "Slate Grey", colour: "#6e7078", type: "Poly-Viscose", price: 1800 },
      { name: "Midnight Blue", colour: "#1a2235", type: "Wool", price: 2800 },
      { name: "Deep Brown", colour: "#5a3e2b", type: "Wool", price: 2400 },
      { name: "Light Fawn", colour: "#c4b193", type: "Cotton Blend", price: 1600 },
    ],
  },
  "Siyaram's": {
    tagline: "Affordable quality for the modern Indian man",
    description: "Siyaram's offers trusted poly-viscose and cotton blends that combine comfort with sharp presentation for everyday formal wear.",
    types: ["Poly-Viscose", "Cotton Blend", "Cotton"],
    swatches: [
      { name: "Classic Black", colour: "#222222", type: "Poly-Viscose", price: 1200 },
      { name: "Steel Grey", colour: "#8a8d92", type: "Poly-Viscose", price: 1100 },
      { name: "Camel Beige", colour: "#b89b6e", type: "Cotton Blend", price: 1300 },
      { name: "Royal Blue", colour: "#2a4070", type: "Poly-Viscose", price: 1200 },
      { name: "Stone", colour: "#a39882", type: "Cotton", price: 1000 },
    ],
  },
  Arvind: {
    tagline: "Innovation meets tradition",
    description: "Arvind Mills brings cutting-edge textile technology to classic Indian tailoring. Their cotton and linen fabrics are renowned for comfort.",
    types: ["Cotton", "Linen", "Cotton Blend"],
    swatches: [
      { name: "White Poplin", colour: "#f5f2e9", type: "Cotton", price: 900 },
      { name: "Sky Blue Oxford", colour: "#a7bdc8", type: "Cotton", price: 1000 },
      { name: "Ivory Linen", colour: "#e8e0d0", type: "Linen", price: 1800 },
      { name: "Sage Green", colour: "#8a9a7e", type: "Cotton", price: 1100 },
      { name: "French Blue", colour: "#5b7a9d", type: "Cotton Blend", price: 1200 },
    ],
  },
  "Linen Club": {
    tagline: "Pure linen, pure comfort",
    description: "Linen Club specialises in authentic linen fabrics sourced from the finest European and Indian flax. Perfect for kurtas, summer suits and shirts.",
    types: ["Linen", "Cotton Blend"],
    swatches: [
      { name: "Pure White Linen", colour: "#f8f5ee", type: "Linen", price: 2200 },
      { name: "Natural Flax", colour: "#d4c9b0", type: "Linen", price: 2000 },
      { name: "Sand", colour: "#c8b896", type: "Linen", price: 1900 },
      { name: "Ocean Blue", colour: "#6b8da5", type: "Linen", price: 2100 },
      { name: "Blush", colour: "#d8b8b8", type: "Linen", price: 2000 },
    ],
  },
  "Minister White": {
    tagline: "The white shirt specialists",
    description: "Minister White is dedicated to the art of the perfect white shirt. Their cotton and blended fabrics are engineered for immaculate shirting.",
    types: ["Cotton", "Cotton Blend"],
    swatches: [
      { name: "Brilliant White", colour: "#ffffff", type: "Cotton", price: 1400 },
      { name: "Cream White", colour: "#f5f0e1", type: "Cotton", price: 1300 },
      { name: "Pearl", colour: "#eae5d9", type: "Cotton Blend", price: 1200 },
      { name: "Ice Blue", colour: "#d4e1ea", type: "Cotton", price: 1400 },
    ],
  },
};

export default function FabricsPage() {
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedType, setSelectedType] = useState("");

  const brands = FABRIC_BRANDS;
  const visibleBrands = selectedBrand ? [selectedBrand] : brands;

  return (
    <main className="page-shell fabrics-page">
      <div className="page-intro">
        <span className="eyebrow">The cloth makes the garment</span>
        <h1>Our Fabric Collection</h1>
        <p>We source from India's most trusted fabric houses. Each cloth is chosen for its hand, drape and lasting character — because fine tailoring begins with fine fabric.</p>
      </div>

      <div className="fabric-filters">
        <div className="filter-group">
          <label htmlFor="brandFilter">Fabric House</label>
          <select id="brandFilter" value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
            <option value="">All Houses</option>
            {brands.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="typeFilter">Fabric Type</label>
          <select id="typeFilter" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
            <option value="">All Types</option>
            {FABRIC_TYPES.map((t) => <option key={t.type}>{t.type}</option>)}
          </select>
        </div>
      </div>

      <section className="fabric-types-section">
        <div className="section-heading centered">
          <span className="eyebrow">Fabric types we work with</span>
          <h2>Chosen for quality and purpose</h2>
        </div>
        <div className="fabric-types-grid">
          {FABRIC_TYPES.map((ft) => (
            <div className={`fabric-type-card ${selectedType === ft.type ? "fabric-type-active" : ""}`} key={ft.type} onClick={() => setSelectedType(selectedType === ft.type ? "" : ft.type)}>
              <h3>{ft.type}</h3>
              <p>{ft.description}</p>
            </div>
          ))}
        </div>
      </section>

      {visibleBrands.map((brand) => {
        const info = BRAND_INFO[brand];
        if (!info) return null;
        const swatches = selectedType ? info.swatches.filter((s) => s.type === selectedType) : info.swatches;

        return (
          <section className="fabric-brand-section" key={brand}>
            <div className="fabric-brand-header">
              <div>
                <h2 className="fabric-brand-name">{brand}</h2>
                <span className="eyebrow">{info.tagline}</span>
                <p>{info.description}</p>
                <div className="fabric-brand-types">
                  {info.types.map((t) => <span key={t} className="fabric-tag">{t}</span>)}
                </div>
              </div>
            </div>
            {swatches.length > 0 ? (
              <div className="swatch-grid">
                {swatches.map((swatch) => (
                  <div className="swatch-card" key={swatch.name}>
                    <div className="swatch-preview" style={{ backgroundColor: swatch.colour }}>
                      <span className="swatch-overlay">{swatch.type}</span>
                    </div>
                    <div className="swatch-info">
                      <h4>{swatch.name}</h4>
                      <span>{brand}</span>
                      <strong>₹{swatch.price.toLocaleString("en-IN")}/metre</strong>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-note">No {selectedType} fabrics from {brand} in this collection.</p>
            )}
          </section>
        );
      })}

      <section className="fabric-cta">
        <div className="section-heading centered">
          <span className="eyebrow">Can't find what you're looking for?</span>
          <h2>Visit our atelier</h2>
          <p>Experience the full fabric collection in person. Our master tailor will guide you through the options best suited to your garment and occasion.</p>
          <Link className="button button-gold" to="/appointment">Book a Consultation <ArrowRight size={14} /></Link>
        </div>
      </section>
    </main>
  );
}
