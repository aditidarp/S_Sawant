import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Clock3, Copy, QrCode, Ruler, ShieldCheck, Sparkles, Tag } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CATEGORIES, FABRIC_BRANDS } from "../data/products.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useStore } from "../context/StoreContext.jsx";
import { apiUrl } from "../lib/api.js";
import { createId, formatPrice } from "../lib/format.js";
import { ImageZoom } from "../components/ProductMedia.jsx";
import ProductCard from "../components/ProductCard.jsx";
import { ProductConfigurator } from "../components/ProductConfigurator.jsx";

const categoryImages = {
  shirts: "/images/products/shirts/black-front.jpeg",
  trousers: "/images/products/trousers/light-grey-front.jpeg",
  blazers: "/images/editorial/hero-bespoke.jpg",
  "two-piece-suits": "/images/products/suits/navy-two-piece-front.jpeg",
  "three-piece-suits": "/images/products/waistcoats/navy-front.jpeg",
  kurtas: "/images/products/kurtas/ivory-front.png",
  waistcoats: "/images/products/waistcoats/navy-front.jpeg",
  "wedding-collection": "/images/editorial/hero-bespoke.jpg",
};

const TIME_SLOTS = [
  "10:00 am – 12:00 pm",
  "12:00 pm – 2:00 pm",
  "2:00 pm – 4:00 pm",
  "4:00 pm – 6:00 pm",
  "6:00 pm – 8:00 pm",
];

function PageIntro({ eyebrow, title, copy }) {
  return <div className="page-intro"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{copy && <p>{copy}</p>}</div>;
}

export function HomePage() {
  const { products, fabricBrands, siteConfig, wishlist, toggleWishlist } = useStore();
  const bestSellers = useMemo(() => {
    const flagged = products.filter((p) => p.bestSeller);
    return (flagged.length ? flagged : products).slice(0, 4);
  }, [products]);

  return (
    <main>
      <section className="home-hero">
        <img className="home-hero-image" src={siteConfig?.heroImage || "/images/editorial/hero-bespoke.jpg"} alt="Indian gentleman wearing a bespoke suit by S. SAWANT" />
        <div className="home-hero-shade" />
        <div className="home-hero-copy">
          <span className="eyebrow">{siteConfig?.heroEyebrow || "The Art of Fine Tailoring"}</span>
          <h1>{siteConfig?.heroTitle || "Timeless elegance."}<br /><em>{siteConfig?.heroTitleAccent || "Tailored for you."}</em></h1>
          <p>{siteConfig?.heroSubtitle || "Experience the art of bespoke Indian menswear with considered fabrics, thoughtful details and a fit that feels unmistakably yours."}</p>
          <div className="hero-actions">
            <Link className="button button-gold" to="/shop">Shop Now <ArrowRight size={15} /></Link>
            <Link className="button button-outline" to="/custom-tailoring">Explore Custom Tailoring</Link>
          </div>
          <div className="hero-proof"><span>Custom Tailoring</span><i /><span>Premium Indian Fabrics</span><i /><span>Made to Measure</span></div>
        </div>
        <span className="hero-caption">S. SAWANT · The Art of Fine Tailoring</span>
      </section>

      {siteConfig?.promotionalBannerActive && siteConfig?.promotionalBannerText && (
        <section className="promo-banner-strip" style={{
          background: "linear-gradient(90deg, #0b1423 0%, #17243c 50%, #0b1423 100%)",
          borderTop: "1px solid rgba(201, 170, 112, 0.25)",
          borderBottom: "1px solid rgba(201, 170, 112, 0.25)",
          padding: "14px 24px",
          textAlign: "center",
          color: "var(--gold-pale)",
          fontSize: "12px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
        }}>
          <Sparkles size={14} style={{ color: "var(--gold)" }} />
          <span>{siteConfig.promotionalBannerText}</span>
          <Sparkles size={14} style={{ color: "var(--gold)" }} />
        </section>
      )}

      <section className="category-section section-wrap">
        <div className="section-heading-row">
          <div><span className="eyebrow">The S. SAWANT collection</span><h2>Featured Collections</h2></div>
          <Link className="underlined-link" to="/shop">View all categories <ArrowUpRight size={14} /></Link>
        </div>
        <div className="category-grid-home">
          {CATEGORIES.map((category, index) => (
            <Link className={`category-tile category-tile-${index + 1}`} to={`/shop?category=${category.id}`} key={category.id}>
              <img src={siteConfig?.categoryImages?.[category.id] || categoryImages[category.id] || "/images/editorial/hero-bespoke.jpg"} alt={`${category.name} — S. SAWANT Indian menswear`} loading="lazy" />
              <span className="category-shade" />
              <div className="category-tile-copy">
                <span>0{index + 1} · MADE TO MEASURE</span>
                <h3>{category.name}</h3>
                <span className="category-explore">Explore <ArrowRight size={14} /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="signature-section section-wrap">
        <div className="section-heading-row">
          <div><span className="eyebrow">Client favourites</span><h2>Best-Selling Pieces</h2></div>
          <Link className="underlined-link" to="/shop">View all pieces <ArrowRight size={14} /></Link>
        </div>
        <div className="product-grid-home">
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} wished={wishlist.includes(product.id)} onWishlist={toggleWishlist} />
          ))}
        </div>
      </section>

      <section className="fabric-home" id="fabrics">
        <div className="section-wrap">
          <div className="section-heading centered">
            <span className="eyebrow">The cloth makes the garment</span>
            <h2>Premium Fabric Houses</h2>
            <p>Trusted Indian fabric houses, selected for their hand, drape and lasting character.</p>
          </div>
          <div className="fabric-logo-row">
            {fabricBrands.map((brand, index) => (
              <Link to="/fabrics" className={`fabric-logo fabric-logo-${index + 1}`} key={brand}>{brand}</Link>
            ))}
          </div>
          <div className="fabric-story">
            <img src="/images/editorial/atelier-fitting.jpeg" alt="S. SAWANT master tailor taking precise measurements" loading="lazy" />
            <div className="fabric-story-copy">
              <span className="eyebrow">Feel the difference</span>
              <h3>A fabric for the way you live.</h3>
              <p>From breathable linen to Super 120s wool suiting, discover cloth that moves with you and belongs to your occasion.</p>
              <Link className="underlined-link" to="/fabrics">Explore all fabrics <ArrowRight size={14} /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="design-feature">
        <div className="design-feature-image">
          <img src="/images/products/suits/navy-two-piece-front.jpeg" alt="Indian gentleman in a navy made-to-measure suit" loading="lazy" />
        </div>
        <div className="design-feature-copy">
          <span className="eyebrow">Custom tailoring, simplified</span>
          <h2>Design your<br />own garment.</h2>
          <p>Choose the cloth, colour, lapel, collar, buttons and finishing touches. We take it from your first idea to a fitting made around you.</p>
          <div className="design-steps-mini"><span><b>01</b> Choose cloth</span><span><b>02</b> Refine details</span><span><b>03</b> Get measured</span></div>
          <Link className="button button-gold" to="/custom-tailoring">Explore Custom Tailoring <ArrowRight size={15} /></Link>
        </div>
      </section>

      <section className="craft-home section-wrap">
        <div className="craft-home-image">
          <img src="/images/editorial/hero-bespoke.jpg" alt="S. SAWANT Wedding Collection tailored three-piece suit" loading="lazy" />
          <span>Celebration, tailored.</span>
        </div>
        <div className="craft-home-copy">
          <span className="eyebrow">The Wedding Collection</span>
          <h2>Dressed for the<br />moments that stay.</h2>
          <p>From the groom's three-piece suit to bespoke kurtas and waistcoats for the celebration, every wedding commission is crafted around your proportions and ceremony.</p>
          <Link className="button button-outline" to="/shop?category=wedding-collection">Explore Wedding Collection <ArrowRight size={14} /></Link>
        </div>
      </section>

      <section className="process-home">
        <div className="section-wrap">
          <div className="section-heading centered">
            <span className="eyebrow">Made for you, from the first stitch</span>
            <h2>Personal, at every step.</h2>
          </div>
          <div className="process-row">
            {[
              ["01", "Choose your style", "Find a silhouette for your day, your work or a once-in-a-lifetime occasion."],
              ["02", "Make it personal", "Select cloth, colour, fit and finishing details with our atelier."],
              ["03", "Get measured", "Save your measurements online or book a private in-person fitting."],
              ["04", "Wear it your way", "Your piece is made with care, then finished with a fitting made for you."],
            ].map(([number, title, copy]) => (
              <article className="process-item" key={number}>
                <span>{number}</span><h3>{title}</h3><p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="testimonial-section">
        <span className="eyebrow">Client reviews</span>
        <div className="testimonial-mark">“</div>
        <blockquote>“S. SAWANT has redefined custom tailoring for me. The fit, the quiet attention to detail, and the personal service from Shivaji ji's atelier feel genuinely exceptional.”</blockquote>
        <div className="testimonial-byline">
          <span className="testimonial-avatar">RM</span>
          <span><strong>Rohan Mehta</strong><small>Chhatrapati Sambhajinagar · S. SAWANT client</small></span>
        </div>
      </section>

      <section className="appointment-banner">
        <div>
          <span className="eyebrow">Visit S. SAWANT MENS WEAR</span>
          <h2>Your fitting, our pleasure.</h2>
          <p>Beside Gandhi Saree Center, Aurangpura Parking Area, Chhatrapati Sambhajinagar · +91 83088 78204</p>
        </div>
        <div className="hero-actions">
          <Link className="button button-gold" to="/appointment">Book Appointment <ArrowRight size={15} /></Link>
          <Link className="button button-outline" to="/contact">Contact Us</Link>
        </div>
      </section>

      <section className="service-strip">
        {[
          [Ruler, "Custom measurements", "A fit that feels like yours"],
          [Sparkles, "Premium fabrics", "From trusted Indian houses"],
          [Check, "Thoughtful alterations", "Care after your fitting"],
          [ShieldCheck, "Personal ordering", "Online or at our atelier"],
        ].map(([Icon, title, sub]) => (
          <div className="service-promise" key={title}><Icon size={20} /><span>{title}<small>{sub}</small></span></div>
        ))}
      </section>
    </main>
  );
}

export function ShopPage() {
  const { products, fabricBrands, wishlist, toggleWishlist } = useStore();
  const [params, setParams] = useSearchParams();
  const [fabric, setFabric] = useState("");
  const [sort, setSort] = useState("featured");
  const queryParam = params.get("q") || "";
  const [search, setSearch] = useState(queryParam);
  const category = params.get("category") || "";
  useEffect(() => setSearch(queryParam), [queryParam]);

  const filtered = useMemo(() => {
    let result = products.filter((item) => (!category || item.categoryId === category)
      && (!fabric || item.fabrics?.includes(fabric))
      && (!search || `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(search.toLowerCase())));
    if (sort === "price-low") result = [...result].sort((a, b) => a.price - b.price);
    if (sort === "price-high") result = [...result].sort((a, b) => b.price - a.price);
    if (sort === "name") result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [products, category, fabric, search, sort]);

  const categoryName = CATEGORIES.find((item) => item.id === category)?.name;

  function chooseCategory(value) {
    const next = new URLSearchParams(params);
    value ? next.set("category", value) : next.delete("category");
    setParams(next);
  }

  return (
    <main className="page-shell shop-page">
      <PageIntro eyebrow="Made to measure, made personal" title={categoryName || "The Collection"} copy="Explore considered essentials and occasionwear, each made around the way you like to wear it." />
      <div className="shop-tools">
        <div className="filter-group">
          <label htmlFor="categoryFilter">Collection</label>
          <select id="categoryFilter" value={category} onChange={(event) => chooseCategory(event.target.value)}>
            <option value="">All pieces</option>
            {CATEGORIES.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="fabricFilter">Fabric house</label>
          <select id="fabricFilter" value={fabric} onChange={(event) => setFabric(event.target.value)}>
            <option value="">All fabric houses</option>
            {fabricBrands.map((name) => <option key={name}>{name}</option>)}
          </select>
        </div>
        <div className="filter-group shop-search">
          <label htmlFor="shopSearch">Search</label>
          <input id="shopSearch" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="A style, a moment..." />
        </div>
        <div className="filter-group sort-filter">
          <label htmlFor="sortFilter">Sort by</label>
          <select id="sortFilter" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="featured">Featured</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>
      <p className="results-count">{filtered.length} considered {filtered.length === 1 ? "piece" : "pieces"}</p>
      {filtered.length ? (
        <div className="catalog-grid">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} wished={wishlist.includes(product.id)} onWishlist={toggleWishlist} />
          ))}
        </div>
      ) : (
        <div className="no-results">
          <span className="eyebrow">No pieces found</span>
          <h2>Try another search.</h2>
          <button className="button button-outline" onClick={() => { setSearch(""); setFabric(""); chooseCategory(""); }}>Clear filters</button>
        </div>
      )}
    </main>
  );
}

export function ProductPage() {
  const { id } = useParams();
  const { products, addToCart } = useStore();
  const navigate = useNavigate();
  const [zoom, setZoom] = useState(null);
  const product = products.find((item) => item.id === id);

  if (!product) return <NotFoundPage />;

  return (
    <main className="page-shell product-page">
      <div className="breadcrumbs">
        <Link to="/">Home</Link><span>/</span><Link to="/shop">Shop</Link><span>/</span><span>{product.category}</span>
      </div>
      <ProductConfigurator product={product} onAdd={addToCart} onBook={() => navigate(`/appointment?product=${encodeURIComponent(product.name)}`)} />
      <section className="product-story">
        <div><span className="eyebrow">The S. SAWANT approach</span><h2>Details, considered.<br />Made around you.</h2></div>
        <div>
          <p>{product.description} Each piece is crafted to order at our Chhatrapati Sambhajinagar atelier. Your chosen colour, fabric and customisation are confirmed before the cloth is cut.</p>
          <Link className="underlined-link" to="/about">Our craftsmanship <ArrowRight size={14} /></Link>
        </div>
      </section>
      <ImageZoom src={zoom?.src} alt={zoom?.alt} onClose={() => setZoom(null)} />
      <ZoomListener onZoom={setZoom} />
    </main>
  );
}

function ZoomListener({ onZoom }) {
  useEffect(() => {
    const handler = (event) => onZoom(event.detail);
    window.addEventListener("ssawant:zoom", handler);
    return () => window.removeEventListener("ssawant:zoom", handler);
  }, [onZoom]);
  return null;
}

export function AppointmentPage() {
  const { appointments, setAppointments, notify, siteConfig } = useStore();
  const { user, profile } = useAuth();
  const [params] = useSearchParams();
  const [sent, setSent] = useState(false);
  const [slotError, setSlotError] = useState("");
  const [form, setForm] = useState({
    name: profile?.name || user?.displayName || "",
    phone: profile?.phone || "",
    email: user?.email || "",
    date: "",
    time: TIME_SLOTS[0],
    purpose: "Measurements & Fitting",
    interest: params.get("product") || "Suit or blazer",
  });

  function update(key, value) {
    setSlotError("");
    setForm((current) => ({ ...current, [key]: value }));
  }

  const bookedSlotsForDate = useMemo(() => {
    if (!form.date) return new Set();
    return new Set(
      appointments
        .filter((apt) => apt.date === form.date && apt.status !== "Rejected")
        .map((apt) => apt.time)
    );
  }, [appointments, form.date]);

  function submit(event) {
    event.preventDefault();
    if (bookedSlotsForDate.has(form.time)) {
      setSlotError("This time slot is already booked on the selected date. Please choose another time.");
      return;
    }
    setAppointments((current) => [
      { ...form, id: createId("fit"), status: "Requested", createdAt: new Date().toISOString() },
      ...current,
    ]);
    setSent(true);
    notify("Your private fitting request has been saved.");
  }

  return (
    <main className="page-shell appointment-page">
      <PageIntro
        eyebrow="The S. SAWANT atelier"
        title={sent ? "We look forward to meeting you." : "Book a Private Fitting"}
        copy={sent ? "Our atelier will confirm your appointment shortly." : "Meet with Shivaji Sawant and our tailoring team for a private consultation, precise measurements and fabric guidance."}
      />
      {!sent && (
        <div className="appointment-layout">
          <div className="appointment-aside">
            <span className="appointment-emblem">S.</span>
            <h2>Good tailoring<br />begins with listening.</h2>
            <p>Bring an idea, an occasion, or simply the wish for a better fit. We will take it from there.</p>
            <div className="appointment-detail"><Clock3 size={16} /><span>Opening Hours<small>{siteConfig?.openingHours || "Monday – Saturday: 10:00 AM – 8:00 PM"}</small></span></div>
            <div className="appointment-detail"><span className="appointment-pin">⌖</span><span>S. Sawant Mens Wear<small>Beside Gandhi Saree Center, Aurangpura Parking Area, Chhatrapati Sambhajinagar</small></span></div>
            <a className="whatsapp-link" href="https://wa.me/918308878204" target="_blank" rel="noreferrer">Prefer WhatsApp? Chat with us <ArrowUpRight size={14} /></a>
          </div>
          <form className="editorial-form" onSubmit={submit}>
            <div className="form-grid">
              <label className="field-control"><span>Your name</span><input required value={form.name} onChange={(event) => update("name", event.target.value)} autoComplete="name" /></label>
              <label className="field-control"><span>Mobile number</span><input required type="tel" pattern="[+]?[0-9]{10,15}" placeholder="+91" value={form.phone} onChange={(event) => update("phone", event.target.value)} autoComplete="tel" /></label>
              <label className="field-control"><span>Email address</span><input required type="email" value={form.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" /></label>
              <label className="field-control"><span>Appointment purpose</span>
                <select value={form.purpose} onChange={(event) => update("purpose", event.target.value)}>
                  <option>Measurements &amp; Fitting</option>
                  <option>Fabric Consultation</option>
                  <option>Wedding Tailoring Consultation</option>
                  <option>Alteration / Final Trial</option>
                </select>
              </label>
              <label className="field-control"><span>Garment of interest</span>
                <select value={form.interest} onChange={(event) => update("interest", event.target.value)}>
                  <option>Suit or blazer</option>
                  <option>Formal shirts and trousers</option>
                  <option>Three-piece suit</option>
                  <option>Wedding Collection</option>
                  <option>Kurta or waistcoat</option>
                </select>
              </label>
              <label className="field-control"><span>Preferred date</span><input required type="date" min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={(event) => update("date", event.target.value)} /></label>
              <label className="field-control field-control-full"><span>Preferred time slot</span>
                <select value={form.time} onChange={(event) => update("time", event.target.value)}>
                  {TIME_SLOTS.map((slot) => {
                    const taken = bookedSlotsForDate.has(slot);
                    return <option key={slot} value={slot} disabled={taken}>{slot}{taken ? " (Booked)" : ""}</option>;
                  })}
                </select>
              </label>
            </div>
            {slotError && <p className="form-error">{slotError}</p>}
            <p className="form-privacy">Your details are used only to arrange your S. SAWANT appointment.</p>
            <button className="button button-gold" type="submit">Confirm Appointment Request <ArrowRight size={15} /></button>
          </form>
        </div>
      )}
      {sent && (
        <div className="appointment-success">
          <Check size={19} /><span>Request received · Our team will confirm your slot shortly.</span>
          <Link to="/shop" className="underlined-link">Continue exploring <ArrowRight size={14} /></Link>
        </div>
      )}
    </main>
  );
}

export function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-hero">
        <img src="/images/editorial/hero-bespoke.jpg" alt="S. SAWANT client in a bespoke navy three-piece suit" />
        <div>
          <span className="eyebrow">The S. SAWANT story</span>
          <h1>The Art of<br /><em>Fine Tailoring.</em></h1>
          <p>Traditional Indian tailoring combined with modern menswear elegance — crafted personally by Shivaji Sawant.</p>
        </div>
      </section>
      <section className="about-copy section-wrap">
        <div>
          <span className="eyebrow">Craftsmanship &amp; Commitment</span>
          <h2>Not simply a garment.<br />A fit shaped around you.</h2>
        </div>
        <div>
          <p>At S. SAWANT MENS WEAR in Chhatrapati Sambhajinagar, we believe that true elegance begins with a perfect fit. Every body carries its own posture and proportions — off-the-rack clothing asks you to adjust to it, while bespoke tailoring is built around you.</p>
          <p>Led by Shivaji Sawant, our atelier brings together time-honoured Indian tailoring discipline and contemporary design. From selecting fine cloth by Raymond, Siyaram's, Arvind, Linen Club, and Minister White to cutting each pattern individually, every detail is considered.</p>
          <p>Whether it is a crisp formal shirt, a sharp business suit, a traditional kurta, or a wedding ensemble for a once-in-a-lifetime celebration, our commitment remains unchanged: honest cloth, precise stitching, and personal service.</p>
          <Link className="button button-outline" to="/appointment">Visit the Atelier <ArrowRight size={14} /></Link>
        </div>
      </section>
      <section className="about-values">
        <article><span>01</span><h3>Quality Fabrics</h3><p>We source from trusted Indian textile houses known for durability, comfort, and refined drape.</p></article>
        <article><span>02</span><h3>Personalised Fitting</h3><p>Every garment is cut to your individual measurements and style preferences.</p></article>
        <article><span>03</span><h3>Indian Craftsmanship</h3><p>Traditional attention to hand-finishing paired with modern tailoring silhouettes.</p></article>
      </section>
    </main>
  );
}

export function CheckoutPage() {
  const { cart, setCart, setOrders, pricing, siteConfig, notify, setAuthGateOpen, setPendingAction } = useStore();
  const { user, profile, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [complete, setComplete] = useState(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [upiCopied, setUpiCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [gatewayInfo, setGatewayInfo] = useState({
    razorpayConfigured: false,
    codEnabled: true,
    codCharge: 0,
    upiId: siteConfig?.upiId || "omawant170604@okicici",
  });

  const [form, setForm] = useState({
    name: profile?.name || user?.displayName || "",
    phone: profile?.phone || "",
    email: user?.email || "",
    address: profile?.addresses?.[0]?.address || "",
    city: profile?.addresses?.[0]?.city || "Chhatrapati Sambhajinagar",
    pin: profile?.addresses?.[0]?.pin || "",
    payment: "UPI QR Code", // "Razorpay UPI" | "UPI QR Code" | "COD"
    upiApp: "Google Pay / PhonePe / Paytm",
    utrNumber: "",
  });

  useEffect(() => {
    fetch(apiUrl("/api/health"))
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setGatewayInfo({
            razorpayConfigured: Boolean(data.razorpayConfigured),
            codEnabled: data.codEnabled !== false,
            codCharge: Number(data.codCharge || 0),
            upiId: data.upiId || siteConfig?.upiId || "omawant170604@okicici",
          });
          if (data.razorpayConfigured) {
            setForm((f) => ({ ...f, payment: "Razorpay UPI" }));
          }
        }
      })
      .catch(() => {});
  }, [siteConfig?.upiId]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
  const discount = appliedCoupon ? Math.round((subtotal * appliedCoupon.discountPercent) / 100) : 0;
  const codCharge = form.payment === "COD" ? gatewayInfo.codCharge : 0;
  const total = Math.max(0, subtotal - discount + codCharge);
  const upiId = gatewayInfo.upiId;

  useEffect(() => {
    if (!isAuthenticated && !complete) {
      setPendingAction({ type: "checkout", redirectTo: "/checkout" });
      setAuthGateOpen(true);
    }
  }, [isAuthenticated, complete, setAuthGateOpen, setPendingAction]);

  function applyCoupon() {
    setCouponError("");
    const code = couponInput.trim().toUpperCase();
    const match = (pricing.coupons || []).find((c) => c.active && c.code.toUpperCase() === code);
    if (!match) {
      setCouponError("Invalid or expired coupon code.");
      return;
    }
    setAppliedCoupon(match);
    notify(`Coupon ${match.code} applied (${match.discountPercent}% off).`);
  }

  function copyUpiId() {
    navigator.clipboard?.writeText(upiId);
    setUpiCopied(true);
    notify("UPI ID copied to clipboard.");
    setTimeout(() => setUpiCopied(false), 2500);
  }

  function loadRazorpayScript() {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function submit(event) {
    event.preventDefault();
    setPaymentError("");
    if (!isAuthenticated) {
      setPendingAction({ type: "checkout", redirectTo: "/checkout" });
      setAuthGateOpen(true);
      return;
    }

    const payload = {
      userId: user?.uid || "local",
      customer: {
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        city: form.city,
        pin: form.pin,
      },
      items: cart,
      discount,
      couponCode: appliedCoupon?.code || null,
      paymentMethod: form.payment === "Razorpay UPI" ? form.upiApp : form.payment,
      utrNumber: form.utrNumber,
    };

    setSubmitting(true);
    try {
      if (form.payment === "COD") {
        const res = await fetch(apiUrl("/api/orders/cod"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to place COD order.");
        setOrders((current) => [data.order, ...current]);
        setCart([]);
        setComplete(data.order);
        notify(`Order ${data.order.id} placed successfully!`);
        return;
      }

      if (form.payment === "UPI QR Code") {
        const res = await fetch(apiUrl("/api/orders/upi-qr"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to record UPI QR order.");
        setOrders((current) => [data.order, ...current]);
        setCart([]);
        setComplete(data.order);
        notify(`Order ${data.order.id} recorded (UPI verification pending).`);
        return;
      }

      // Razorpay Verified Online Payment
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Unable to load Razorpay Checkout SDK. Check your internet connection.");

      const orderRes = await fetch(apiUrl("/api/payments/razorpay/create-order"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Could not initialize payment.");

      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "S. SAWANT MENS WEAR",
        description: "Bespoke Indian Menswear Order",
        order_id: orderData.razorpayOrderId,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        theme: { color: "#c9aa70" },
        handler: async (response) => {
          try {
            const verifyRes = await fetch(apiUrl("/api/payments/razorpay/verify"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.verified) {
              setPaymentError(verifyData.error || "Payment verification failed. No order was confirmed.");
              return;
            }
            setOrders((current) => [verifyData.order, ...current]);
            setCart([]);
            setComplete(verifyData.order);
            notify(`Payment verified! Order ${verifyData.order.id} confirmed.`);
          } catch (err) {
            setPaymentError(err.message || "Payment verification failed.");
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setPaymentError("Payment was cancelled or left incomplete. Your order has NOT been placed — you can retry below.");
          },
        },
      });
      rzp.on("payment.failed", (resp) => {
        setSubmitting(false);
        setPaymentError(`Payment failed: ${resp.error?.description || "Transaction declined"}. You can retry below.`);
      });
      rzp.open();
      return;
    } catch (err) {
      setPaymentError(err.message || "Could not complete checkout.");
    } finally {
      if (form.payment !== "Razorpay UPI") setSubmitting(false);
    }
  }

  if (complete) {
    return (
      <main className="page-shell checkout-page">
        <div className="checkout-success">
          <span className="eyebrow">S. SAWANT · {complete.status}</span>
          <div className="success-seal"><Check size={21} /></div>
          <h1>Thank you, {complete.customer.name.split(" ")[0]}.</h1>
          <p>Order Placed Successfully! Your unique Order ID is <strong>{complete.id}</strong>.</p>
          <p style={{ fontSize: 11, color: "var(--gold-pale)" }}>
            Payment Method: <strong>{complete.paymentMethod}</strong> · Payment Status: <strong>{complete.paymentStatus}</strong>
          </p>
          {complete.paymentStatus === "Pending Verification" && (
            <div className="upi-pending-banner">
              <strong>UPI QR Verification Pending:</strong> Your direct UPI QR payment will be verified against our merchant transaction records by the administrator before tailoring begins.
            </div>
          )}
          <div className="checkout-receipt">
            {complete.items.map((item) => (
              <div key={item.key}>
                <span>{item.name} × {item.quantity || 1} · {item.colour} ({item.configuration?.fabricBrand})</span>
                <strong>{formatPrice(item.price * (item.quantity || 1))}</strong>
              </div>
            ))}
            {complete.discount > 0 && (
              <div><span>Discount ({complete.couponCode})</span><strong>- {formatPrice(complete.discount)}</strong></div>
            )}
            {complete.codCharge > 0 && (
              <div><span>COD Handling Charge</span><strong>+ {formatPrice(complete.codCharge)}</strong></div>
            )}
            <div className="receipt-total"><span>Order total</span><strong>{formatPrice(complete.total)}</strong></div>
          </div>
          <div className="checkout-success-actions">
            <button className="button button-outline print-order" onClick={() => window.print()}>Print Order Summary</button>
            <Link className="button button-gold" to={`/track-order?orderId=${encodeURIComponent(complete.id)}`}>Track Order Live <ArrowRight size={14} /></Link>
          </div>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="page-shell checkout-page">
        <PageIntro eyebrow="Account required" title="Please sign in to checkout." copy="Your bag and bespoke selections are safely preserved." />
        <div className="hero-actions">
          <button className="button button-gold" onClick={() => navigate("/signup?redirect=/checkout")}>Sign Up <ArrowRight size={14} /></button>
          <button className="button button-outline" onClick={() => navigate("/login?redirect=/checkout")}>Log In</button>
        </div>
      </main>
    );
  }

  if (!cart.length) {
    return (
      <main className="page-shell checkout-page">
        <PageIntro eyebrow="Your bag" title="Nothing to check out yet." copy="Your next favourite piece starts with a cloth and a conversation." />
        <Link className="button button-gold" to="/shop">Explore the collection <ArrowRight size={14} /></Link>
      </main>
    );
  }

  return (
    <main className="page-shell checkout-page">
      <PageIntro eyebrow="A considered purchase" title="Checkout & Payment" copy="Confirm your delivery details and choose your payment method." />
      <div className="checkout-layout">
        <form className="editorial-form checkout-form" onSubmit={submit}>
          <h2>Delivery Details</h2>
          <div className="form-grid">
            <label className="field-control"><span>Full name</span><input autoComplete="name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="field-control"><span>Mobile number</span><input autoComplete="tel" type="tel" required pattern="[+]?[0-9]{10,15}" placeholder="+91" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <label className="field-control field-control-full"><span>Email address</span><input autoComplete="email" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label className="field-control field-control-full"><span>Delivery address</span><textarea autoComplete="street-address" required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
            <label className="field-control"><span>City</span><input required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
            <label className="field-control"><span>PIN code</span><input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={form.pin} onChange={(event) => setForm({ ...form, pin: event.target.value })} /></label>
          </div>

          <h2 style={{ marginTop: "24px" }}>Payment Method</h2>
          <div className="payment-methods-grid">
            <label className={`payment-option-card ${form.payment === "Razorpay UPI" ? "payment-option-active" : ""}`}>
              <input type="radio" name="payment" value="Razorpay UPI" checked={form.payment === "Razorpay UPI"} onChange={() => setForm({ ...form, payment: "Razorpay UPI" })} />
              <div>
                <strong>Online Payment (UPI / GPay / PhonePe / Paytm)</strong>
                <small>{gatewayInfo.razorpayConfigured ? "Automatic gateway verification & instant order confirmation." : "Razorpay gateway (requires server RAZORPAY_KEY_ID & SECRET)."}</small>
              </div>
            </label>
            <label className={`payment-option-card ${form.payment === "UPI QR Code" ? "payment-option-active" : ""}`}>
              <input type="radio" name="payment" value="UPI QR Code" checked={form.payment === "UPI QR Code"} onChange={() => setForm({ ...form, payment: "UPI QR Code" })} />
              <div>
                <strong>Shop UPI QR Code</strong>
                <small>Scan S. SAWANT QR or pay to {upiId}. Verified by atelier.</small>
              </div>
            </label>
            {gatewayInfo.codEnabled && (
              <label className={`payment-option-card ${form.payment === "COD" ? "payment-option-active" : ""}`}>
                <input type="radio" name="payment" value="COD" checked={form.payment === "COD"} onChange={() => setForm({ ...form, payment: "COD" })} />
                <div>
                  <strong>Cash on Delivery (COD)</strong>
                  <small>{gatewayInfo.codCharge > 0 ? `COD charge: ${formatPrice(gatewayInfo.codCharge)}` : "No extra COD charge. Pay on delivery."}</small>
                </div>
              </label>
            )}
          </div>

          {form.payment === "Razorpay UPI" && (
            <div className="upi-payment-box">
              <label className="field-control">
                <span>Preferred Online App</span>
                <select value={form.upiApp} onChange={(e) => setForm({ ...form, upiApp: e.target.value })}>
                  <option>UPI</option>
                  <option>Google Pay</option>
                  <option>PhonePe</option>
                  <option>Paytm</option>
                </select>
              </label>
              <p className="upi-security-note" style={{ marginTop: 10 }}>
                Your order will be confirmed automatically only after the Razorpay payment signature is verified by our backend.
              </p>
            </div>
          )}

          {form.payment === "UPI QR Code" && (
            <div className="upi-payment-box">
              <div className="upi-header">
                <div>
                  <span className="eyebrow">Direct Shop UPI</span>
                  <h3>Scan &amp; Pay via UPI QR Code</h3>
                  <p>Scan our official UPI QR code using Google Pay, PhonePe, Paytm, or any UPI app.</p>
                </div>
              </div>

              <div className="upi-grid">
                <div className="upi-qr-wrap">
                  <img src="/images/upi-qr.jpeg" alt="S. SAWANT Official UPI QR Code" />
                </div>
                <div className="upi-details">
                  <div className="upi-id-row">
                    <span>UPI ID</span>
                    <div className="upi-copy-box">
                      <code>{upiId}</code>
                      <button type="button" className="button button-outline upi-copy-btn" onClick={copyUpiId}>
                        <Copy size={13} /> {upiCopied ? "Copied" : "Copy UPI ID"}
                      </button>
                    </div>
                  </div>
                  <label className="field-control">
                    <span>UPI Transaction / UTR Reference (Optional)</span>
                    <input value={form.utrNumber} onChange={(e) => setForm({ ...form, utrNumber: e.target.value })} placeholder="12-digit UTR number after paying" />
                  </label>
                  <p className="upi-security-note">
                    Direct QR payments remain <strong>Pending Verification</strong> until confirmed against our merchant transaction records.
                  </p>
                </div>
              </div>
            </div>
          )}

          {paymentError && <p className="form-error" style={{ marginBottom: 14 }}>{paymentError}</p>}

          <button className="button button-gold" type="submit" disabled={submitting}>
            {submitting ? "Processing..." : form.payment === "Razorpay UPI" ? `Pay & Verify · ${formatPrice(total)}` : `Place Order · ${formatPrice(total)}`} <ArrowRight size={15} />
          </button>
        </form>

        <aside className="order-summary">
          <span className="eyebrow">Your selection</span>
          <h2>Order Summary</h2>
          {cart.map((item) => (
            <div className="summary-line" key={item.key}>
              <div>
                <strong>{item.name} × {item.quantity || 1}</strong>
                <span>{item.colour} · {item.configuration?.fabricBrand} · {item.configuration?.size}</span>
                {item.configuration?.fit && <span className="summary-meta">{item.configuration.fit} fit</span>}
              </div>
              <b>{formatPrice(item.price * (item.quantity || 1))}</b>
            </div>
          ))}

          <div className="coupon-box">
            <label className="field-control">
              <span><Tag size={12} style={{ display: "inline", marginRight: 4 }} /> Discount Coupon</span>
              <div className="coupon-input-row">
                <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="e.g. SAWANT10" />
                <button type="button" className="button button-outline" onClick={applyCoupon}>Apply</button>
              </div>
            </label>
            {couponError && <p className="form-error">{couponError}</p>}
          </div>

          {discount > 0 && (
            <div className="summary-line">
              <span>Discount ({appliedCoupon?.code})</span>
              <b>- {formatPrice(discount)}</b>
            </div>
          )}
          {codCharge > 0 && (
            <div className="summary-line">
              <span>COD Charge</span>
              <b>+ {formatPrice(codCharge)}</b>
            </div>
          )}
          <div className="summary-total"><span>Total (INR)</span><strong>{formatPrice(total)}</strong></div>
          <p>Tailoring timeline and delivery details are confirmed after your order is verified.</p>
        </aside>
      </div>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <main className="page-shell not-found">
      <span className="eyebrow">S. SAWANT · The Art of Fine Tailoring</span>
      <h1>This page is not in the collection.</h1>
      <Link className="button button-gold" to="/">Return home <ArrowDown size={14} /></Link>
    </main>
  );
}
