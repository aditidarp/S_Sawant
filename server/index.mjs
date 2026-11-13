import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sendOrderNotification } from "./notifications.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const STORE_DB_FILE = path.join(DATA_DIR, "store_db.json");
const PORT = Number(process.env.PORT || 4000);

const ORDER_STAGES = [
  "Order Placed",
  "Payment Confirmed / COD Order Confirmed",
  "Fabric Selection",
  "Cutting",
  "Stitching",
  "Quality Check",
  "Ready for Dispatch",
  "Shipped",
  "Out for Delivery",
  "Delivered",
];

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      orderCounter: 0,
      orders: [],
      pendingPayments: {},
      processedPaymentIds: [],
      settings: {
        codEnabled: true,
        codCharge: 0,
        upiId: "omawant170604@okicici",
      },
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
  }
  ensureStoreDb();
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function writeDb(db) {
  ensureDb();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function ensureStoreDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_DB_FILE)) {
    const initial = {
      version: Date.now(),
      updatedAt: new Date().toISOString(),
      updatedBy: "System Initializer",
      siteConfig: {
        heroEyebrow: "The art of fine tailoring · Chhatrapati Sambhajinagar",
        heroTitle: "Timeless elegance.",
        heroTitleAccent: "Tailored for you.",
        heroSubtitle: "Experience the art of bespoke Indian menswear with considered fabrics, thoughtful details and a fit that feels unmistakably yours.",
        heroImage: "/images/editorial/hero-bespoke.jpg",
        openingHours: "Monday – Saturday: 10:00 AM – 8:00 PM · Sunday: By Appointment",
        upiId: "omawant170604@okicici",
        announcementText: "Complimentary delivery over ₹10,000 ✦ Bespoke Indian Menswear · Chhatrapati Sambhajinagar",
        announcementEnabled: true,
        announcementLink: "/shop",
        promotionalBannerText: "Wedding & Festive Season Atelier Booking Open",
        promotionalBannerActive: true,
        contactPhone: "+91 83088 78204",
        contactEmail: "contact@ssawant.in",
        contactAddress: "Opp. Tapadiya Park, Town Centre, CIDCO, Chhatrapati Sambhajinagar, Maharashtra 431003",
        categoryImages: {
          shirts: "/images/products/shirts/black-front.jpeg",
          trousers: "/images/products/trousers/light-grey-front.jpeg",
          blazers: "/images/editorial/hero-bespoke.jpg",
          "two-piece-suits": "/images/products/suits/navy-two-piece-front.jpeg",
          "three-piece-suits": "/images/products/waistcoats/navy-front.jpeg",
          kurtas: "/images/products/kurtas/ivory-front.png",
          waistcoats: "/images/products/waistcoats/navy-front.jpeg",
          "wedding-collection": "/images/editorial/hero-bespoke.jpg",
        },
      },
      products: [],
      fabricBrands: ["Raymond", "Siyaram's", "Arvind Mills", "Linen Club", "J. Hampstead", "Graviera"],
      fabricCatalog: [],
      pricing: {
        fabricPremiums: {
          Raymond: 0,
          "Siyaram's": 0,
          "Arvind Mills": 0,
          "Linen Club": 0,
          "J. Hampstead": 0,
          Graviera: 0,
        },
        optionPremiums: {
          premiumButtons: 0,
          lining: 0,
          embroidery: 0,
          monogram: 0,
        },
        priceRules: [],
        coupons: [
          {
            code: "SAWANT10",
            discountPercent: 10,
            active: true,
            description: "10% off your bespoke order",
          },
        ],
      },
      orders: [],
      appointments: [],
      customers: [],
    };
    fs.writeFileSync(STORE_DB_FILE, JSON.stringify(initial, null, 2));
  }
}

function readStoreDb() {
  ensureStoreDb();
  return JSON.parse(fs.readFileSync(STORE_DB_FILE, "utf8"));
}

function writeStoreDb(data) {
  ensureStoreDb();
  fs.writeFileSync(STORE_DB_FILE, JSON.stringify(data, null, 2));
}

function broadcastStoreUpdate(version, changedKeys = []) {
  const payload = `event: store-update\ndata: ${JSON.stringify({ version, changedKeys, updatedAt: new Date().toISOString() })}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}

function generateOrderId(db) {
  db.orderCounter = (db.orderCounter || 0) + 1;
  const year = new Date().getFullYear();
  const seq = String(db.orderCounter).padStart(5, "0");
  return `SSW-${year}-${seq}`;
}

// SSE clients for real-time order tracking updates
const sseClients = new Set();

function broadcastOrderUpdate(order) {
  const payload = `event: order-update\ndata: ${JSON.stringify({
    id: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    updatedAt: order.updatedAt,
    expectedDeliveryDate: order.expectedDeliveryDate || null,
    statusHistory: order.statusHistory,
  })}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Role, X-Admin-Email",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        resolve({ raw, json: raw ? JSON.parse(raw) : {} });
      } catch (err) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "").slice(-10);
}

function validateOrderInput(body) {
  if (!body.customer?.name || !body.customer?.phone || !body.customer?.address) {
    return "Customer name, mobile number, and delivery address are required.";
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return "Order must contain at least one item.";
  }
  for (const item of body.items) {
    if (!item.name || !Number.isFinite(Number(item.price)) || Number(item.price) < 0) {
      return "Invalid item pricing detected.";
    }
  }
  return null;
}

function computeTotals(items, discount = 0, codCharge = 0) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * (Number(item.quantity) || 1), 0);
  const safeDiscount = Math.max(0, Math.min(subtotal, Number(discount) || 0));
  const safeCod = Math.max(0, Number(codCharge) || 0);
  return {
    subtotal,
    discount: safeDiscount,
    codCharge: safeCod,
    total: subtotal - safeDiscount + safeCod,
  };
}

function isAdminRequest(req) {
  // In production with Firebase Admin SDK, verify the Bearer ID token's admin claim.
  // Here we require explicit admin role header + email from authenticated admin session.
  const role = req.headers["x-admin-role"];
  const email = req.headers["x-admin-email"];
  return role === "admin" && Boolean(email);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Role, X-Admin-Email",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    });
    return res.end();
  }

  try {
    // 1. Health & Payment Gateway Config (never exposes secrets!)
    if (req.method === "GET" && pathname === "/api/health") {
      const db = readDb();
      return sendJson(res, 200, {
        ok: true,
        razorpayConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
        codEnabled: db.settings?.codEnabled ?? true,
        codCharge: db.settings?.codCharge ?? 0,
        upiId: db.settings?.upiId || "omawant170604@okicici",
      });
    }

    // 2. Real-time SSE stream for order tracking
    if (req.method === "GET" && pathname === "/api/orders/stream") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      res.write("event: connected\ndata: {\"ok\":true}\n\n");
      sseClients.add(res);
      req.on("close", () => sseClients.delete(res));
      return;
    }

    // 3. Create Razorpay Order (Online Payment Step 1)
    if (req.method === "POST" && pathname === "/api/payments/razorpay/create-order") {
      const { json: body } = await readBody(req);
      const err = validateOrderInput(body);
      if (err) return sendJson(res, 400, { error: err });

      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        return sendJson(res, 503, {
          error: "Razorpay gateway credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured on the server. Use Direct UPI QR or Cash on Delivery, or configure Razorpay keys in the server environment.",
          gatewayConfigured: false,
        });
      }

      const totals = computeTotals(body.items, body.discount, 0);
      const amountPaise = Math.round(totals.total * 100);
      const receipt = `rcpt_${Date.now()}`;

      const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt,
          notes: { customerEmail: body.customer.email, customerPhone: body.customer.phone },
        }),
      });
      const rzpOrder = await rzpRes.json();
      if (!rzpRes.ok) {
        return sendJson(res, 502, { error: rzpOrder.error?.description || "Failed to create Razorpay order." });
      }

      const db = readDb();
      db.pendingPayments[rzpOrder.id] = {
        razorpayOrderId: rzpOrder.id,
        userId: body.userId || "guest",
        customer: body.customer,
        items: body.items,
        couponCode: body.couponCode || null,
        ...totals,
        paymentMethod: body.paymentMethod || "Razorpay UPI",
        createdAt: new Date().toISOString(),
      };
      writeDb(db);

      return sendJson(res, 200, {
        keyId,
        razorpayOrderId: rzpOrder.id,
        amount: amountPaise,
        currency: "INR",
      });
    }

    // 4. Verify Razorpay Payment Signature & Create Confirmed Order (Online Payment Step 2)
    if (req.method === "POST" && pathname === "/api/payments/razorpay/verify") {
      const { json: body } = await readBody(req);
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keySecret) {
        return sendJson(res, 503, { error: "Razorpay secret not configured on server." });
      }
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return sendJson(res, 400, { error: "Missing Razorpay payment verification fields." });
      }

      const db = readDb();

      // Idempotency check: prevent duplicate orders for the same payment ID
      if (db.processedPaymentIds.includes(razorpay_payment_id)) {
        const existingOrder = db.orders.find((o) => o.paymentId === razorpay_payment_id);
        return sendJson(res, 200, { verified: true, duplicate: true, order: existingOrder });
      }

      // Verify HMAC-SHA256 signature
      const expectedSig = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      const sigValid = crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(razorpay_signature));
      if (!sigValid) {
        return sendJson(res, 400, { verified: false, error: "Invalid payment signature. Order was NOT created." });
      }

      const pending = db.pendingPayments[razorpay_order_id];
      if (!pending) {
        return sendJson(res, 404, { error: "Pending payment record not found." });
      }

      const now = new Date().toISOString();
      const orderId = generateOrderId(db);
      const confirmedOrder = {
        id: orderId,
        userId: pending.userId,
        createdAt: now,
        updatedAt: now,
        customer: pending.customer,
        items: pending.items,
        subtotal: pending.subtotal,
        discount: pending.discount,
        codCharge: 0,
        couponCode: pending.couponCode,
        total: pending.total,
        paymentMethod: pending.paymentMethod,
        paymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        paymentStatus: "Payment Confirmed",
        status: "Payment Confirmed / COD Order Confirmed",
        expectedDeliveryDate: null,
        internalNotes: "",
        statusHistory: [
          { status: "Order Placed", paymentStatus: "Payment Confirmed", timestamp: now, updatedBy: "Razorpay Gateway", note: `Payment ${razorpay_payment_id} verified` },
          { status: "Payment Confirmed / COD Order Confirmed", paymentStatus: "Payment Confirmed", timestamp: now, updatedBy: "System", note: "Signature verified" },
        ],
      };

      db.processedPaymentIds.push(razorpay_payment_id);
      delete db.pendingPayments[razorpay_order_id];
      db.orders.unshift(confirmedOrder);
      writeDb(db);

      const notifications = await sendOrderNotification({ order: confirmedOrder, eventType: "Order Confirmed" });
      broadcastOrderUpdate(confirmedOrder);

      return sendJson(res, 201, { verified: true, order: confirmedOrder, notifications });
    }

    // 5. Razorpay Signed Webhook (Backend-to-Backend Confirmation)
    if (req.method === "POST" && pathname === "/api/payments/razorpay/webhook") {
      const { raw, json: event } = await readBody(req);
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const signature = req.headers["x-razorpay-signature"];

      if (!webhookSecret || !signature) {
        return sendJson(res, 400, { error: "Webhook secret or signature missing." });
      }

      const expected = crypto.createHmac("sha256", webhookSecret).update(raw).digest("hex");
      if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)))) {
        return sendJson(res, 400, { error: "Invalid webhook signature." });
      }

      if (event.event === "payment.captured") {
        const payment = event.payload?.payment?.entity;
        const rzpOrderId = payment?.order_id;
        const paymentId = payment?.id;
        const db = readDb();

        if (paymentId && !db.processedPaymentIds.includes(paymentId) && db.pendingPayments[rzpOrderId]) {
          const pending = db.pendingPayments[rzpOrderId];
          const now = new Date().toISOString();
          const orderId = generateOrderId(db);
          const confirmedOrder = {
            id: orderId,
            userId: pending.userId,
            createdAt: now,
            updatedAt: now,
            customer: pending.customer,
            items: pending.items,
            subtotal: pending.subtotal,
            discount: pending.discount,
            codCharge: 0,
            couponCode: pending.couponCode,
            total: pending.total,
            paymentMethod: pending.paymentMethod,
            paymentId,
            razorpayOrderId: rzpOrderId,
            paymentStatus: "Payment Confirmed",
            status: "Payment Confirmed / COD Order Confirmed",
            expectedDeliveryDate: null,
            internalNotes: "",
            statusHistory: [
              { status: "Order Placed", paymentStatus: "Payment Confirmed", timestamp: now, updatedBy: "Razorpay Webhook", note: `Payment ${paymentId} captured` },
              { status: "Payment Confirmed / COD Order Confirmed", paymentStatus: "Payment Confirmed", timestamp: now, updatedBy: "Razorpay Webhook" },
            ],
          };
          db.processedPaymentIds.push(paymentId);
          delete db.pendingPayments[rzpOrderId];
          db.orders.unshift(confirmedOrder);
          writeDb(db);
          broadcastOrderUpdate(confirmedOrder);
        }
      }

      return sendJson(res, 200, { received: true });
    }

    // 6. Direct UPI QR Code Submission (Remains unverified until admin confirms merchant transaction)
    if (req.method === "POST" && pathname === "/api/orders/upi-qr") {
      const { json: body } = await readBody(req);
      const err = validateOrderInput(body);
      if (err) return sendJson(res, 400, { error: err });

      const db = readDb();
      const totals = computeTotals(body.items, body.discount, 0);
      const now = new Date().toISOString();
      const orderId = generateOrderId(db);

      const order = {
        id: orderId,
        userId: body.userId || "guest",
        createdAt: now,
        updatedAt: now,
        customer: body.customer,
        items: body.items,
        subtotal: totals.subtotal,
        discount: totals.discount,
        codCharge: 0,
        couponCode: body.couponCode || null,
        total: totals.total,
        paymentMethod: body.paymentMethod || "UPI QR Code",
        paymentReference: body.utrNumber || null,
        paymentStatus: "Pending Verification",
        status: "Order Placed",
        expectedDeliveryDate: null,
        internalNotes: body.utrNumber ? `Customer submitted UTR: ${body.utrNumber}` : "Awaiting UPI QR verification",
        statusHistory: [
          {
            status: "Order Placed",
            paymentStatus: "Pending Verification",
            timestamp: now,
            updatedBy: "Customer Checkout",
            note: "Direct UPI QR submitted — awaiting merchant transaction verification",
          },
        ],
      };

      db.orders.unshift(order);
      writeDb(db);
      const notifications = await sendOrderNotification({ order, eventType: "Order Placed (UPI Verification Pending)" });
      broadcastOrderUpdate(order);

      return sendJson(res, 201, { order, notifications });
    }

    // 7. Cash on Delivery (COD) Order Placement
    if (req.method === "POST" && pathname === "/api/orders/cod") {
      const { json: body } = await readBody(req);
      const err = validateOrderInput(body);
      if (err) return sendJson(res, 400, { error: err });

      const db = readDb();
      if (db.settings?.codEnabled === false) {
        return sendJson(res, 403, { error: "Cash on Delivery is currently disabled by the administrator." });
      }

      const codCharge = Number(db.settings?.codCharge || 0);
      const totals = computeTotals(body.items, body.discount, codCharge);
      const now = new Date().toISOString();
      const orderId = generateOrderId(db);

      const order = {
        id: orderId,
        userId: body.userId || "guest",
        createdAt: now,
        updatedAt: now,
        customer: body.customer,
        items: body.items,
        subtotal: totals.subtotal,
        discount: totals.discount,
        codCharge: totals.codCharge,
        couponCode: body.couponCode || null,
        total: totals.total,
        paymentMethod: "COD",
        paymentStatus: "Payment Pending – COD",
        status: "Payment Confirmed / COD Order Confirmed",
        expectedDeliveryDate: null,
        internalNotes: "",
        statusHistory: [
          { status: "Order Placed", paymentStatus: "Payment Pending – COD", timestamp: now, updatedBy: "Customer Checkout" },
          { status: "Payment Confirmed / COD Order Confirmed", paymentStatus: "Payment Pending – COD", timestamp: now, updatedBy: "System", note: "COD order confirmed" },
        ],
      };

      db.orders.unshift(order);
      writeDb(db);
      const notifications = await sendOrderNotification({ order, eventType: "COD Order Confirmed" });
      broadcastOrderUpdate(order);

      return sendJson(res, 201, { order, notifications });
    }

    // 8. Public Real-Time Order Tracking (Requires Order ID + Mobile Number verification)
    if (req.method === "GET" && pathname === "/api/orders/track") {
      const orderId = (url.searchParams.get("orderId") || "").trim().toUpperCase();
      const phone = normalizePhone(url.searchParams.get("phone") || "");
      const userId = url.searchParams.get("userId") || "";

      if (!orderId) return sendJson(res, 400, { error: "Order ID is required." });

      const db = readDb();
      const order = db.orders.find((o) => o.id.toUpperCase() === orderId);
      if (!order) {
        return sendJson(res, 404, { error: `No order found with Order ID "${orderId}".` });
      }

      const orderPhone = normalizePhone(order.customer?.phone);
      const isOwner = Boolean(userId && order.userId === userId);
      const phoneMatches = Boolean(phone && orderPhone && (phone === orderPhone || orderPhone.endsWith(phone)));

      if (!isOwner && !phoneMatches) {
        return sendJson(res, 403, {
          error: "Please enter the registered mobile number (or last 4 digits) associated with this Order ID to verify ownership.",
          requiresVerification: true,
        });
      }

      return sendJson(res, 200, {
        order: {
          id: order.id,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          status: order.status,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          expectedDeliveryDate: order.expectedDeliveryDate,
          total: order.total,
          codCharge: order.codCharge || 0,
          items: order.items,
          statusHistory: order.statusHistory || [],
        },
      });
    }

    // 9. Customer's Own Orders
    if (req.method === "GET" && pathname === "/api/orders/my") {
      const userId = url.searchParams.get("userId") || "";
      const email = (url.searchParams.get("email") || "").trim().toLowerCase();
      if (!userId && !email) return sendJson(res, 401, { error: "Authentication required." });

      const db = readDb();
      const myOrders = db.orders.filter(
        (o) => (userId && o.userId === userId) || (email && o.customer?.email?.toLowerCase() === email)
      );
      return sendJson(res, 200, { orders: myOrders });
    }

    // 10. Admin: List All Orders
    if (req.method === "GET" && pathname === "/api/admin/orders") {
      if (!isAdminRequest(req)) return sendJson(res, 403, { error: "Administrator authorization required." });
      const db = readDb();
      return sendJson(res, 200, { orders: db.orders, settings: db.settings });
    }

    // 11. Admin: Update Order Status, Payment Verification, COD Collection, Delivery Date, Notes
    if (req.method === "PATCH" && pathname.startsWith("/api/admin/orders/")) {
      if (!isAdminRequest(req)) return sendJson(res, 403, { error: "Administrator authorization required." });
      const orderId = decodeURIComponent(pathname.replace("/api/admin/orders/", ""));
      const { json: body } = await readBody(req);
      const adminEmail = req.headers["x-admin-email"] || "admin";

      const db = readDb();
      const idx = db.orders.findIndex((o) => o.id === orderId);
      if (idx === -1) return sendJson(res, 404, { error: "Order not found." });

      const order = db.orders[idx];
      const now = new Date().toISOString();

      if (body.status && ORDER_STAGES.includes(body.status)) {
        order.status = body.status;
      }
      if (body.paymentStatus) {
        order.paymentStatus = body.paymentStatus;
      }
      if (body.expectedDeliveryDate !== undefined) {
        order.expectedDeliveryDate = body.expectedDeliveryDate || null;
      }
      if (body.internalNotes !== undefined) {
        order.internalNotes = body.internalNotes;
      }

      order.updatedAt = now;
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        status: order.status,
        paymentStatus: order.paymentStatus,
        timestamp: now,
        updatedBy: String(adminEmail),
        note: body.note || "",
      });

      db.orders[idx] = order;
      writeDb(db);

      const notifications = await sendOrderNotification({ order, eventType: `Order Update: ${order.status}` });
      broadcastOrderUpdate(order);

      return sendJson(res, 200, { order, notifications });
    }

    // 12. Admin: Update COD Settings
    if (req.method === "PATCH" && pathname === "/api/admin/settings") {
      if (!isAdminRequest(req)) return sendJson(res, 403, { error: "Administrator authorization required." });
      const { json: body } = await readBody(req);
      const db = readDb();
      db.settings = {
        ...db.settings,
        codEnabled: body.codEnabled !== undefined ? Boolean(body.codEnabled) : db.settings.codEnabled,
        codCharge: body.codCharge !== undefined ? Math.max(0, Number(body.codCharge) || 0) : db.settings.codCharge,
        upiId: body.upiId || db.settings.upiId,
      };
      writeDb(db);
      return sendJson(res, 200, { settings: db.settings });
    }

    // 13. Centralized Store Database: Version endpoint (Ultra-lightweight real-time sync polling)
    if (req.method === "GET" && (pathname === "/api/store/version" || (pathname === "/api/db.php" && url.searchParams.get("action") === "version"))) {
      const storeDb = readStoreDb();
      return sendJson(res, 200, {
        ok: true,
        version: storeDb.version || 0,
        updatedAt: storeDb.updatedAt || new Date().toISOString(),
      });
    }

    // 14. Centralized Store Database: Get single key
    if (req.method === "GET" && ((pathname === "/api/db.php" && url.searchParams.get("action") === "get") || pathname.startsWith("/api/store/key/"))) {
      const key = pathname.startsWith("/api/store/key/") ? decodeURIComponent(pathname.replace("/api/store/key/", "")) : url.searchParams.get("key");
      if (!key) return sendJson(res, 400, { ok: false, error: "Missing key parameter." });
      const storeDb = readStoreDb();
      return sendJson(res, 200, {
        ok: true,
        key,
        value: storeDb[key] ?? null,
        version: storeDb.version || 0,
        updatedAt: storeDb.updatedAt || new Date().toISOString(),
      });
    }

    // 15. Centralized Store Database: Get all collections (Public read for customers & admin)
    if (req.method === "GET" && (pathname === "/api/store/all" || pathname === "/api/db.php")) {
      const storeDb = readStoreDb();
      return sendJson(res, 200, {
        ok: true,
        version: storeDb.version || 0,
        updatedAt: storeDb.updatedAt || new Date().toISOString(),
        data: storeDb,
      });
    }

    // 16. Centralized Store Database: Save changes (Admin authorized)
    if (req.method === "POST" && (pathname === "/api/store/batch" || pathname === "/api/db.php" || pathname.startsWith("/api/store/"))) {
      if (!isAdminRequest(req)) {
        return sendJson(res, 403, {
          ok: false,
          error: "Administrator authorization required (X-Admin-Role and X-Admin-Email header required).",
        });
      }
      const { json: body } = await readBody(req);
      const adminEmail = req.headers["x-admin-email"] || "admin@ssawant.in";
      const storeDb = readStoreDb();
      const newVersion = Date.now();
      const now = new Date().toISOString();
      const changedKeys = [];

      if (body.batch && typeof body.batch === "object") {
        for (const [k, v] of Object.entries(body.batch)) {
          storeDb[k] = v;
          changedKeys.push(k);
        }
      } else if (body.key) {
        storeDb[body.key] = body.value ?? null;
        changedKeys.push(body.key);
      } else if (pathname.startsWith("/api/store/") && pathname !== "/api/store/batch") {
        const key = decodeURIComponent(pathname.replace("/api/store/", ""));
        storeDb[key] = body.value !== undefined ? body.value : body;
        changedKeys.push(key);
      } else {
        for (const [k, v] of Object.entries(body)) {
          if (k !== "version" && k !== "updatedAt" && k !== "updatedBy") {
            storeDb[k] = v;
            changedKeys.push(k);
          }
        }
      }

      storeDb.version = newVersion;
      storeDb.updatedAt = now;
      storeDb.updatedBy = adminEmail;

      writeStoreDb(storeDb);
      broadcastStoreUpdate(newVersion, changedKeys);

      return sendJson(res, 200, {
        ok: true,
        message: "Changes permanently committed to database.",
        version: newVersion,
        updatedAt: now,
        changedKeys,
      });
    }

    return sendJson(res, 404, { error: "Endpoint not found." });
  } catch (err) {
    return sendJson(res, 500, { error: err.message || "Internal server error" });
  }
});

server.listen(PORT, () => {
  ensureDb();
  console.log(`S. SAWANT backend server running at http://localhost:${PORT}`);
});
