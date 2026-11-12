import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { INITIAL_PRODUCTS, INITIAL_PRICING, FABRIC_BRANDS, INITIAL_FABRIC_CATALOG, INITIAL_SITE_CONFIG } from "../data/products.js";
import { createId } from "../lib/format.js";
import { repository } from "../services/repository.js";

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [fabricBrands, setFabricBrands] = useState(FABRIC_BRANDS);
  const [fabricCatalog, setFabricCatalog] = useState(INITIAL_FABRIC_CATALOG);
  const [pricing, setPricing] = useState({ ...INITIAL_PRICING });
  const [siteConfig, setSiteConfig] = useState(INITIAL_SITE_CONFIG);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [orders, setOrders] = useState([]);
  const [measurements, setMeasurements] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    let active = true;
    async function hydrate() {
      try {
        const [
          savedProducts,
          savedBrands,
          savedCatalog,
          savedPricing,
          savedSiteConfig,
          savedCart,
          savedWishlist,
          savedOrders,
          savedMeasurements,
          savedAppointments,
          savedCustomers,
        ] = await Promise.all([
          repository.get("products", null),
          repository.get("fabric-brands", null),
          repository.get("fabric-catalog", null),
          repository.get("pricing", null),
          repository.get("site-config", null),
          repository.get("cart", []),
          repository.get("wishlist", []),
          repository.get("orders", []),
          repository.get("measurements", null),
          repository.get("appointments", []),
          repository.get("customers", []),
        ]);
        if (!active) return;
        if (savedProducts) {
          const seedImages = new Map(INITIAL_PRODUCTS.map((product) => [product.id, product.images]));
          const merged = savedProducts.map((product) => {
            const defaults = seedImages.get(product.id);
            if (!defaults) return product;
            const images = { ...defaults, ...product.images };
            for (const [colour, views] of Object.entries(defaults)) {
              images[colour] = { ...views, ...product.images?.[colour] };
            }
            return { ...product, images };
          });
          // Ensure newly added seed products (e.g. wedding-royal-ensemble) are present if not deleted
          for (const seed of INITIAL_PRODUCTS) {
            if (!merged.some((p) => p.id === seed.id)) {
              merged.push(seed);
            }
          }
          setProducts(merged);
        }
        if (savedBrands) setFabricBrands(savedBrands);
        if (savedCatalog) setFabricCatalog(savedCatalog);
        if (savedPricing) setPricing({ ...INITIAL_PRICING, ...savedPricing });
        if (savedSiteConfig) setSiteConfig({ ...INITIAL_SITE_CONFIG, ...savedSiteConfig });
        setCart(savedCart);
        setWishlist(savedWishlist);
        setOrders(savedOrders);
        setMeasurements(savedMeasurements);
        setAppointments(savedAppointments);
        setCustomers(savedCustomers);
      } catch (error) {
        if (active) setNotice(`Saved store data could not be loaded: ${error.message}`);
      } finally {
        if (active) setReady(true);
      }
    }
    hydrate();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const entries = [
      ["products", products],
      ["fabric-brands", fabricBrands],
      ["fabric-catalog", fabricCatalog],
      ["pricing", pricing],
      ["site-config", siteConfig],
      ["cart", cart],
      ["wishlist", wishlist],
      ["orders", orders],
      ["measurements", measurements],
      ["appointments", appointments],
      ["customers", customers],
    ];
    Promise.all(entries.map(([key, value]) => repository.set(key, value)))
      .catch((error) => setNotice(`Could not save your latest changes: ${error.message}`));
  }, [ready, products, fabricBrands, fabricCatalog, pricing, siteConfig, cart, wishlist, orders, measurements, appointments, customers]);

  const notify = useCallback((message) => {
    setNotice(message);
    window.clearTimeout(notify.timeout);
    notify.timeout = window.setTimeout(() => setNotice(""), 3800);
  }, []);

  const toggleWishlist = useCallback((productId) => {
    setWishlist((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId]);
  }, []);

  const addToCart = useCallback((item) => {
    setCart((current) => [...current, { ...item, key: createId("line"), quantity: item.quantity || 1 }]);
    notify("Your made-to-measure piece has been added to the bag.");
  }, [notify]);

  const updateCartQuantity = useCallback((lineKey, delta) => {
    setCart((current) => current
      .map((item) => item.key === lineKey ? { ...item, quantity: Math.max(1, (item.quantity || 1) + delta) } : item));
  }, []);

  const removeFromCart = useCallback((lineKey) => {
    setCart((current) => current.filter((item) => item.key !== lineKey));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const value = useMemo(() => ({
    products, setProducts,
    fabricBrands, setFabricBrands,
    fabricCatalog, setFabricCatalog,
    pricing, setPricing,
    siteConfig, setSiteConfig,
    cart, setCart,
    wishlist, setWishlist,
    orders, setOrders,
    measurements, setMeasurements,
    appointments, setAppointments,
    customers, setCustomers,
    ready, notice, setNotice,
    notify, toggleWishlist, addToCart, updateCartQuantity, removeFromCart, clearCart,
    authGateOpen, setAuthGateOpen,
    pendingAction, setPendingAction,
  }), [
    products, fabricBrands, fabricCatalog, pricing, siteConfig,
    cart, wishlist, orders, measurements, appointments, customers,
    ready, notice, notify, toggleWishlist, addToCart, updateCartQuantity, removeFromCart, clearCart,
    authGateOpen, pendingAction,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider.");
  return value;
}
