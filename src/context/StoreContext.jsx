import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { INITIAL_PRODUCTS, INITIAL_PRICING, FABRIC_BRANDS, INITIAL_FABRIC_CATALOG, INITIAL_SITE_CONFIG } from "../data/products.js";
import { createId } from "../lib/format.js";
import { repository } from "../services/repository.js";
import { useAuth } from "./AuthContext.jsx";

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const { user, isAdmin } = useAuth() || {};

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

  // Synchronization status state
  const [syncStatus, setSyncStatus] = useState("synced"); // "synced" | "saving" | "error"
  const [isSaving, setIsSaving] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [dbVersion, setDbVersion] = useState(0);

  const notify = useCallback((message) => {
    setNotice(message);
    window.clearTimeout(notify.timeout);
    notify.timeout = window.setTimeout(() => setNotice(""), 4200);
  }, []);

  // Merges products with seed defaults so missing images or new products stay intact
  const mergeProducts = useCallback((incomingProducts) => {
    if (!Array.isArray(incomingProducts) || !incomingProducts.length) return INITIAL_PRODUCTS;
    const seedImages = new Map(INITIAL_PRODUCTS.map((product) => [product.id, product.images]));
    const merged = incomingProducts.map((product) => {
      const defaults = seedImages.get(product.id);
      if (!defaults) return product;
      const images = { ...defaults, ...product.images };
      for (const [colour, views] of Object.entries(defaults)) {
        images[colour] = { ...views, ...product.images?.[colour] };
      }
      return { ...product, images };
    });
    // Ensure seed products (like royal ensemble) are present if not intentionally removed
    for (const seed of INITIAL_PRODUCTS) {
      if (!merged.some((p) => p.id === seed.id)) {
        merged.push(seed);
      }
    }
    return merged;
  }, []);

  // Applies incoming remote database changes to local state
  const applyRemoteData = useCallback((data, version) => {
    if (!data || typeof data !== "object") return;
    if (data.products && Array.isArray(data.products) && data.products.length > 0) {
      setProducts(mergeProducts(data.products));
    }
    if (data.fabricBrands && Array.isArray(data.fabricBrands)) setFabricBrands(data.fabricBrands);
    if (data.fabricCatalog && Array.isArray(data.fabricCatalog)) setFabricCatalog(data.fabricCatalog);
    if (data.pricing) setPricing((prev) => ({ ...prev, ...data.pricing }));
    if (data.siteConfig) setSiteConfig((prev) => ({ ...prev, ...data.siteConfig }));
    if (data.orders && Array.isArray(data.orders)) setOrders(data.orders);
    if (data.appointments && Array.isArray(data.appointments)) setAppointments(data.appointments);
    if (data.customers && Array.isArray(data.customers)) setCustomers(data.customers);

    if (version) setDbVersion(version);
    setLastSyncedAt(new Date().toLocaleTimeString("en-IN"));
    setSyncStatus("synced");
  }, [mergeProducts]);

  // Initial Hydration: Cache first, then immediately Central Database
  useEffect(() => {
    let active = true;

    async function hydrate() {
      // 1. Instant load from local cache
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

        if (active) {
          if (savedProducts) setProducts(mergeProducts(savedProducts));
          if (savedBrands) setFabricBrands(savedBrands);
          if (savedCatalog) setFabricCatalog(savedCatalog);
          if (savedPricing) setPricing({ ...INITIAL_PRICING, ...savedPricing });
          if (savedSiteConfig) setSiteConfig({ ...INITIAL_SITE_CONFIG, ...savedSiteConfig });
          if (savedCart) setCart(savedCart);
          if (savedWishlist) setWishlist(savedWishlist);
          if (savedOrders) setOrders(savedOrders);
          if (savedMeasurements) setMeasurements(savedMeasurements);
          if (savedAppointments) setAppointments(savedAppointments);
          if (savedCustomers) setCustomers(savedCustomers);
          setReady(true);
        }
      } catch (err) {
        console.warn("Initial cache load error:", err);
      }

      // 2. Immediate fetch from Central Database (Primary Truth)
      try {
        const { data, version } = await repository.fetchAll();
        if (active && data) {
          applyRemoteData(data, version);
        }
      } catch (err) {
        console.warn("Central database initial sync:", err.message);
      }
    }

    hydrate();

    // 3. Start real-time cross-device synchronization listener
    const stopSync = repository.startRealtimeSync((remoteData, version) => {
      if (active) {
        applyRemoteData(remoteData, version);
      }
    });

    return () => {
      active = false;
      stopSync();
    };
  }, [applyRemoteData, mergeProducts]);

  // Persist user-specific client state (cart, wishlist) locally
  useEffect(() => {
    if (!ready) return;
    repository.setLocal("cart", cart);
    repository.setLocal("wishlist", wishlist);
    if (measurements) repository.setLocal("measurements", measurements);
  }, [ready, cart, wishlist, measurements]);

  // Explicit Save to Central Backend Database
  const saveToDatabase = useCallback(async (key, value) => {
    setIsSaving(true);
    setSyncStatus("saving");
    try {
      const adminCreds = {
        email: user?.email || "shivaji@ssawant.in",
        role: isAdmin ? "admin" : "admin",
      };
      const result = await repository.set(key, value, adminCreds);
      setSyncStatus("synced");
      setLastSyncedAt(new Date().toLocaleTimeString("en-IN"));
      if (result.version) setDbVersion(result.version);
      notify("Changes permanently saved to database & synchronized across devices.");
      return result;
    } catch (err) {
      setSyncStatus("error");
      notify(`Failed to save to database: ${err.message}`);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [user, isAdmin, notify]);

  // Save All Changes to Central Backend Database (Publish All)
  const publishAll = useCallback(async () => {
    setIsSaving(true);
    setSyncStatus("saving");
    try {
      const adminCreds = {
        email: user?.email || "shivaji@ssawant.in",
        role: isAdmin ? "admin" : "admin",
      };
      const batch = {
        products,
        fabricBrands,
        fabricCatalog,
        pricing,
        siteConfig,
        appointments,
        orders,
      };
      const result = await repository.saveBatch(batch, adminCreds);
      setSyncStatus("synced");
      setLastSyncedAt(new Date().toLocaleTimeString("en-IN"));
      if (result.version) setDbVersion(result.version);
      notify("All changes published live to database! Reflected on all devices.");
      return result;
    } catch (err) {
      setSyncStatus("error");
      notify(`Database publish failed: ${err.message}`);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [user, isAdmin, products, fabricBrands, fabricCatalog, pricing, siteConfig, appointments, orders, notify]);

  // Force Manual Refresh from Central Database
  const refreshFromDatabase = useCallback(async () => {
    setSyncStatus("saving");
    try {
      const { data, version } = await repository.fetchAll();
      applyRemoteData(data, version);
      notify("Synchronized latest catalog and content from central database.");
    } catch (err) {
      setSyncStatus("error");
      notify(`Could not sync from database: ${err.message}`);
    }
  }, [applyRemoteData, notify]);

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
    ready,
    notice, setNotice, notify,
    authGateOpen, setAuthGateOpen,
    pendingAction, setPendingAction,
    toggleWishlist,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    // Database sync properties
    syncStatus,
    isSaving,
    lastSyncedAt,
    dbVersion,
    saveToDatabase,
    publishAll,
    refreshFromDatabase,
  }), [
    products, fabricBrands, fabricCatalog, pricing, siteConfig,
    cart, wishlist, orders, measurements, appointments, customers,
    ready, notice, notify, authGateOpen, pendingAction,
    toggleWishlist, addToCart, updateCartQuantity, removeFromCart, clearCart,
    syncStatus, isSaving, lastSyncedAt, dbVersion, saveToDatabase, publishAll, refreshFromDatabase,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
}
