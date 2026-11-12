import { ArrowRight, Ruler, Scissors, Sparkles, Check, Shirt } from "lucide-react";
import { Link } from "react-router-dom";

const GARMENT_TYPES = [
  {
    name: "Suits & Blazers",
    icon: "🤵",
    description: "Single or double-breasted, choose lapel, buttons, pockets, vents, lining, and every detail of construction.",
    options: ["Fit: Slim, Regular, Relaxed", "Single or Double-breasted", "Lapel: Notch, Peak, Shawl", "Front buttons & material", "Sleeve button details", "Pocket styles: Flap, Jetted, Patch", "Back vents", "Inner lining", "Trouser style & pleats", "Jacket length", "Custom measurements"],
    link: "/product/two-piece-suit",
    colours: ["Black", "Navy Blue", "Brown", "Light Grey"],
  },
  {
    name: "Formal Shirts",
    icon: "👔",
    description: "Choose your collar, cuff, button style, pocket, and have it cut to your exact measurements.",
    options: ["Fabric selection", "Collar: Spread, Cutaway, Point, Band", "Cuff: Single, Double, French", "Button: Pearl, Ivory, Horn, Matte", "Pocket: None or Chest pocket", "Sleeve: Full or Half", "Monogram option", "Custom measurements"],
    link: "/product/formal-shirt",
    colours: ["White", "Sky Blue", "Black", "Light Pink", "Lavender", "Beige"],
  },
  {
    name: "Formal Trousers",
    icon: "👖",
    description: "Flat-front or pleated, choose waistband, pockets, and bottom style to your preference.",
    options: ["Fabric selection", "Pleats: Flat, Single, Double", "Waistband: Classic, Extended tab", "Pockets: Slant or Straight", "Waist finish: Belt loops, Side adjusters", "Bottom opening width", "Custom measurements"],
    link: "/product/tailored-trouser",
    colours: ["Black", "Navy Blue", "Brown", "Light Grey"],
  },
  {
    name: "Kurtas",
    icon: "🪷",
    description: "Traditional craftsmanship with modern tailoring. Choose neck style, collar, embroidery, and length.",
    options: ["Fabric: Cotton, Linen, Silk blend", "Neck: Classic, Band, Split", "Collar: Band, Mandarin, None", "Sleeve length", "Buttons: Fabric-covered, Wood, Ivory", "Embroidery options", "Custom length", "Custom measurements"],
    link: "/product/heritage-kurta",
    colours: ["White", "Ivory", "Beige", "Navy Blue"],
  },
  {
    name: "Waistcoats",
    icon: "🎩",
    description: "A distinguished layer for your suit or a standalone piece. Choose buttons, pockets, and back style.",
    options: ["Fabric selection", "Front buttons: 4, 5, or 6", "Button material", "Pocket: Welt, Flap, None", "Back: Matching fabric or Adjustable lining", "Lining options", "Custom measurements"],
    link: "/product/waistcoat",
    colours: ["Black", "Navy Blue", "Brown", "Light Grey"],
  },
];

const PROCESS_STEPS = [
  { number: "01", title: "Choose Your Style", description: "Browse our collection and select the garment type. Choose from suits, blazers, shirts, trousers, kurtas, or waistcoats.", icon: Shirt },
  { number: "02", title: "Personalise Every Detail", description: "Use our product configurator to customise fabric, colour, fit, collar, cuffs, buttons, pockets, lining, and more.", icon: Sparkles },
  { number: "03", title: "Get Measured", description: "Enter your measurements online, use saved profiles, or book an in-person fitting at our atelier in Chhatrapati Sambhajinagar.", icon: Ruler },
  { number: "04", title: "Expert Tailoring", description: "Our master tailors cut and stitch your garment with precision. Track your order through every stage from cutting to dispatch.", icon: Scissors },
];

export default function CustomTailoringPage() {
  return (
    <main className="page-shell custom-tailoring-page">
      <section className="ct-hero">
        <div className="ct-hero-content">
          <span className="eyebrow">S. SAWANT Custom Tailoring</span>
          <h1>Your Vision,<br /><em>Our Craft.</em></h1>
          <p>Every body is different. Every occasion is unique. Our custom tailoring service lets you design a garment that fits your measurements, your style, and your story — down to the last stitch.</p>
          <div className="hero-actions">
            <Link className="button button-gold" to="/shop">Start Customising <ArrowRight size={14} /></Link>
            <Link className="button button-outline" to="/appointment">Book a Fitting <ArrowRight size={14} /></Link>
          </div>
        </div>
      </section>

      <section className="ct-process section-wrap">
        <div className="section-heading centered">
          <span className="eyebrow">How it works</span>
          <h2>Four steps to your perfect garment</h2>
        </div>
        <div className="ct-process-grid">
          {PROCESS_STEPS.map((step) => (
            <div className="ct-process-card" key={step.number}>
              <span className="ct-step-number">{step.number}</span>
              <step.icon size={28} strokeWidth={1.2} />
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ct-garments section-wrap">
        <div className="section-heading centered">
          <span className="eyebrow">What you can customise</span>
          <h2>Every garment, made your way</h2>
          <p>Each garment type has its own set of customisation options. No generic one-size-fits-all — every detail is specific to the garment you choose.</p>
        </div>
        <div className="ct-garment-list">
          {GARMENT_TYPES.map((g) => (
            <div className="ct-garment-card" key={g.name}>
              <div className="ct-garment-header">
                <span className="ct-garment-icon">{g.icon}</span>
                <div>
                  <h3>{g.name}</h3>
                  <p>{g.description}</p>
                </div>
              </div>
              <div className="ct-options-list">
                {g.options.map((opt) => (
                  <div className="ct-option-item" key={opt}>
                    <Check size={14} /> <span>{opt}</span>
                  </div>
                ))}
              </div>
              <div className="ct-garment-colours">
                <span className="eyebrow">Available colours</span>
                <div className="ct-colour-dots">
                  {g.colours.map((c) => (
                    <span key={c} className="ct-colour-dot" title={c} style={{ backgroundColor: { Black: "#222321", "Navy Blue": "#233650", Brown: "#765b43", "Light Grey": "#b9b9b4", White: "#f5f2e9", "Sky Blue": "#a7bdc8", "Light Pink": "#d8b8b8", Lavender: "#afa4c1", Beige: "#c9b89d", Ivory: "#e6dec9" }[c] || "#999" }} />
                  ))}
                </div>
              </div>
              <Link className="button button-outline" to={g.link}>Customise Now <ArrowRight size={14} /></Link>
            </div>
          ))}
        </div>
      </section>

      <section className="ct-measurement-cta">
        <div className="section-wrap">
          <div className="section-heading centered">
            <span className="eyebrow">Perfect fit guarantee</span>
            <h2>Measurements made easy</h2>
            <p>Enter your measurements online, save profiles for future orders, or visit our atelier for a professional in-person fitting. We support both inches and centimetres.</p>
            <div className="hero-actions" style={{ justifyContent: "center" }}>
              <Link className="button button-gold" to="/account?tab=measurements">My Measurements <Ruler size={14} /></Link>
              <Link className="button button-outline" to="/appointment">Book In-Person Fitting <ArrowRight size={14} /></Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
