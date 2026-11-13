/**
 * S. SAWANT MENSWEAR — Centralized Repository & Database Synchronization Engine
 * 
 * Synchronizes store catalog, fabric houses, homepage configurations,
 * banners, announcements, pricing, coupons, orders, and appointments
 * across all client devices (laptops, mobile phones, tablets).
 */

import { apiUrl } from "../lib/api.js";

const STORAGE_PREFIX = "ssawant-v2:";
const VERSION_KEY = "ssawant-v2:db-version";
const LAST_SYNC_KEY = "ssawant-v2:last-sync";

// Resolve candidate API endpoints (supports both PHP db.php on InfinityFree and /api/store on Node)
function getEndpoints() {
  return [
    apiUrl("/api/db.php"),
    apiUrl("/api/store/all"),
    "/api/db.php",
    "/api/store/all",
  ];
}

let activeEndpoint = null;
let currentDbVersion = Number(localStorage.getItem(VERSION_KEY) || 0);

async function detectEndpoint() {
  if (activeEndpoint) return activeEndpoint;
  const candidates = [
    { url: apiUrl("/api/db.php?action=version"), base: apiUrl("/api/db.php") },
    { url: apiUrl("/api/store/version"), base: apiUrl("/api/store/all") },
    { url: "/api/db.php?action=version", base: "/api/db.php" },
    { url: "/api/store/version", base: "/api/store/all" },
  ];

  for (const c of candidates) {
    try {
      const res = await fetch(c.url, { method: "GET", headers: { "Cache-Control": "no-cache" } });
      if (res.ok) {
        activeEndpoint = c.base;
        return activeEndpoint;
      }
    } catch {
      // try next
    }
  }
  // Default to relative /api/db.php (InfinityFree Apache standard)
  activeEndpoint = apiUrl("/api/db.php");
  return activeEndpoint;
}

export const repository = {
  /**
   * Get value for a key from local storage cache with fallback
   */
  async get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  /**
   * Set value in local storage cache
   */
  async setLocal(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn("Local storage cache write warning:", e);
    }
  },

  /**
   * Fetch all collections from the centralized backend database
   */
  async fetchAll() {
    const endpoint = await detectEndpoint();
    const url = endpoint.includes("db.php") ? `${endpoint}?action=all&_t=${Date.now()}` : `${endpoint}?_t=${Date.now()}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
    });

    if (!res.ok) {
      throw new Error(`Central database responded with HTTP ${res.status}`);
    }

    const payload = await res.json();
    if (!payload.ok && !payload.data) {
      throw new Error(payload.error || "Invalid response from central database.");
    }

    const data = payload.data || payload;
    const version = payload.version || data.version || Date.now();

    // Cache locally for instant loading on subsequent renders
    for (const [key, value] of Object.entries(data)) {
      if (key !== "version" && key !== "updatedAt" && key !== "updatedBy") {
        this.setLocal(key, value);
      }
    }

    currentDbVersion = Number(version);
    localStorage.setItem(VERSION_KEY, String(currentDbVersion));
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

    return { data, version };
  },

  /**
   * Fetch the current version of the central database (lightweight poll)
   */
  async fetchVersion() {
    const endpoint = await detectEndpoint();
    const url = endpoint.includes("db.php") ? `${endpoint}?action=version&_t=${Date.now()}` : `${endpoint.replace("/all", "/version")}?_t=${Date.now()}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.version || null;
  },

  /**
   * Save a single collection to the centralized backend database
   */
  async set(key, value, adminCredentials = {}) {
    // 1. Immediately update local cache for instant UI feedback
    await this.setLocal(key, value);

    // 2. Persist to Centralized Database
    return this.saveBatch({ [key]: value }, adminCredentials);
  },

  /**
   * Save multiple collections in one atomic database transaction
   */
  async saveBatch(batch, adminCredentials = {}) {
    const endpoint = await detectEndpoint();
    const adminEmail = adminCredentials.email || localStorage.getItem("ssawant-v2:admin-email") || "shivaji@ssawant.in";
    const adminRole = adminCredentials.role || "admin";

    // Cache locally
    for (const [k, v] of Object.entries(batch)) {
      await this.setLocal(k, v);
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Role": adminRole,
        "X-Admin-Email": adminEmail,
        Authorization: `Bearer ${adminRole}`,
      },
      body: JSON.stringify({ batch }),
    });

    if (!res.ok) {
      let errMsg = `Failed to save to database (HTTP ${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson.error) errMsg = errJson.error;
      } catch {
        // ignore
      }
      throw new Error(errMsg);
    }

    const result = await res.json();
    if (!result.ok) {
      throw new Error(result.error || "Central database rejected the update.");
    }

    if (result.version) {
      currentDbVersion = Number(result.version);
      localStorage.setItem(VERSION_KEY, String(currentDbVersion));
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    }

    return result;
  },

  /**
   * Start real-time cross-device synchronization listener
   * Polls every 3.5 seconds and notifies when changes from other devices arrive
   */
  startRealtimeSync(onUpdate) {
    let active = true;
    let inFlight = false;

    // 1. Version polling loop
    const checkVersion = async () => {
      if (!active || inFlight) return;
      inFlight = true;
      try {
        const remoteVersion = await this.fetchVersion();
        if (remoteVersion && Number(remoteVersion) > currentDbVersion) {
          const { data, version } = await this.fetchAll();
          if (typeof onUpdate === "function") {
            onUpdate(data, version);
          }
          window.dispatchEvent(new CustomEvent("ssawant:database-sync", { detail: { data, version } }));
        }
      } catch {
        // Ignore transient network hiccups during background poll
      } finally {
        inFlight = false;
      }
    };

    const intervalId = window.setInterval(checkVersion, 3500);

    // 2. SSE listener if connected to server
    let sse = null;
    try {
      const sseUrl = apiUrl("/api/orders/stream");
      sse = new EventSource(sseUrl);
      sse.addEventListener("store-update", async (event) => {
        try {
          const update = JSON.parse(event.data);
          if (update.version && Number(update.version) > currentDbVersion) {
            const { data, version } = await this.fetchAll();
            if (typeof onUpdate === "function") {
              onUpdate(data, version);
            }
            window.dispatchEvent(new CustomEvent("ssawant:database-sync", { detail: { data, version } }));
          }
        } catch (e) {
          console.warn("SSE store update error:", e);
        }
      });
    } catch {
      // SSE not available (e.g. static hosting) — polling loop handles it seamlessly
    }

    return () => {
      active = false;
      window.clearInterval(intervalId);
      if (sse) sse.close();
    };
  },
};

/**
 * Converts and optimizes an image File or Blob from mobile or desktop
 * into a high-clarity web-optimized Data URL (max 1600px, 85% quality)
 * suitable for instant database synchronization across all devices.
 */
export function localImageToDataUrl(file, maxWidth = 1600, maxHeight = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No file provided"));
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Could not read image file."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode image format."));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP if supported, otherwise standard JPEG
        try {
          const webpData = canvas.toDataURL("image/webp", quality);
          if (webpData.startsWith("data:image/webp")) {
            return resolve(webpData);
          }
        } catch {
          // fallback to jpeg
        }
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(e.target.result);
    };
    reader.readAsDataURL(file);
  });
}
