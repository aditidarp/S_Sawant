import { useEffect, useState } from "react";
import { Check, Clock3, Package, Search, ShieldCheck, Truck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ORDER_STATUSES } from "../data/products.js";
import { formatPrice } from "../lib/format.js";

export default function TrackOrderPage() {
  const { user, isAuthenticated } = useAuth();
  const [params, setParams] = useSearchParams();
  const initialId = params.get("orderId") || "";

  const [orderId, setOrderId] = useState(initialId);
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsPhone, setNeedsPhone] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);

  async function fetchOrder(targetId, targetPhone) {
    if (!targetId.trim()) {
      setError("Please enter your Order ID.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ orderId: targetId.trim() });
      if (targetPhone.trim()) qs.set("phone", targetPhone.trim());
      if (isAuthenticated && user?.uid) qs.set("userId", user.uid);

      const res = await fetch(`/api/orders/track?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresVerification) setNeedsPhone(true);
        setOrder(null);
        setError(data.error || "Could not find order.");
      } else {
        setOrder(data.order);
        setNeedsPhone(false);
        setParams({ orderId: data.order.id });
      }
    } catch {
      setError("Unable to reach the tracking server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialId) {
      fetchOrder(initialId, phone);
    }
  }, []);

  // Real-time Server-Sent Events (SSE) subscription for live status updates
  useEffect(() => {
    if (!order?.id) return;
    const source = new EventSource("/api/orders/stream");
    source.addEventListener("connected", () => setLiveConnected(true));
    source.addEventListener("order-update", (event) => {
      try {
        const update = JSON.parse(event.data);
        if (update.id === order.id) {
          setOrder((prev) => prev ? {
            ...prev,
            status: update.status,
            paymentStatus: update.paymentStatus,
            updatedAt: update.updatedAt,
            expectedDeliveryDate: update.expectedDeliveryDate,
            statusHistory: update.statusHistory || prev.statusHistory,
          } : prev);
        }
      } catch {
        // ignore malformed event
      }
    });
    source.onerror = () => setLiveConnected(false);
    return () => {
      source.close();
      setLiveConnected(false);
    };
  }, [order?.id]);

  function handleSubmit(e) {
    e.preventDefault();
    fetchOrder(orderId, phone);
  }

  const currentStageIdx = order ? ORDER_STATUSES.indexOf(order.status) : -1;

  return (
    <main className="page-shell track-order-page">
      <div className="page-intro">
        <span className="eyebrow">S. SAWANT · Live Atelier Tracking</span>
        <h1>TRACK YOUR ORDER</h1>
        <p>Enter your Order ID to see the latest progress of your S. SAWANT order.</p>
      </div>

      <form className="track-search-card" onSubmit={handleSubmit}>
        <div className="track-input-grid">
          <label className="field-control">
            <span>Order ID</span>
            <input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value.toUpperCase())}
              placeholder="Enter Order ID (e.g. SSW-2026-00001)"
              required
            />
          </label>
          <label className="field-control">
            <span>Registered Mobile Number {isAuthenticated ? "(or last 4 digits if guest)" : "(Required for verification)"}</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210 or last 4 digits"
              required={needsPhone}
            />
          </label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="button button-gold" type="submit" disabled={loading}>
          <Search size={14} /> {loading ? "Checking..." : "TRACK ORDER"}
        </button>
      </form>

      {order && (
        <section className="track-result-section">
          <div className="track-summary-header">
            <div>
              <span className="eyebrow">Order Reference</span>
              <h2>{order.id}</h2>
              <p>Placed on {new Date(order.createdAt).toLocaleString("en-IN")}</p>
            </div>
            <div className="track-badges">
              <div className="track-badge-box">
                <span>Payment ({order.paymentMethod})</span>
                <strong className={order.paymentStatus === "Payment Confirmed" || order.paymentStatus === "COD Payment Collected" ? "badge-paid" : "badge-pending"}>
                  {order.paymentStatus}
                </strong>
              </div>
              <div className="track-badge-box">
                <span>Current Tailoring Status</span>
                <strong>{order.status}</strong>
              </div>
            </div>
          </div>

          <div className="track-meta-bar">
            <span><Clock3 size={14} /> Last updated: {new Date(order.updatedAt || order.createdAt).toLocaleString("en-IN")}</span>
            {order.expectedDeliveryDate && (
              <span><Truck size={14} /> Expected delivery: <strong>{order.expectedDeliveryDate}</strong></span>
            )}
            <span className="live-indicator">
              <i className={liveConnected ? "live-dot-on" : "live-dot-off"} />
              {liveConnected ? "Live updates active" : "Real-time sync ready"}
            </span>
          </div>

          {order.paymentMethod === "COD" && order.paymentStatus !== "COD Payment Collected" && (
            <div className="upi-pending-banner">
              <strong>Cash on Delivery:</strong> Payment of <strong>{formatPrice(order.total)}</strong> is due upon delivery.
            </div>
          )}

          <div className="track-timeline-wrap">
            <h3>Live Tailoring &amp; Delivery Progress</h3>
            <div className="order-status-timeline">
              {ORDER_STATUSES.map((stage, idx) => {
                const isDone = idx <= currentStageIdx;
                const isCurrent = idx === currentStageIdx;
                return (
                  <div key={stage} className={`timeline-step ${isDone ? "timeline-done" : ""} ${isCurrent ? "timeline-current" : ""}`}>
                    <span className="timeline-dot">{isDone ? <Check size={11} /> : idx + 1}</span>
                    <span className="timeline-label">{stage}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="track-items-grid">
            <div className="track-items-card">
              <h3><Package size={16} /> Garments &amp; Customisation</h3>
              {(order.items || []).map((item) => (
                <div className="track-item-row" key={item.key}>
                  {item.image && <img src={item.image} alt={item.name} className="track-item-thumb" />}
                  <div className="track-item-info">
                    <strong>{item.name} × {item.quantity || 1}</strong>
                    <span>Colour: {item.colour} · Fabric: {item.configuration?.fabricBrand}</span>
                    <span>Size: {item.configuration?.size || "Made to measure"} · Fit: {item.configuration?.fit || "Standard"}</span>
                  </div>
                  <strong>{formatPrice(item.price * (item.quantity || 1))}</strong>
                </div>
              ))}
              <div className="track-total-row">
                <span>Order Total</span>
                <strong>{formatPrice(order.total)}</strong>
              </div>
            </div>

            <div className="track-history-card">
              <h3><ShieldCheck size={16} /> Status History</h3>
              <div className="history-list">
                {[...(order.statusHistory || [])].reverse().map((entry, idx) => (
                  <div className="history-entry" key={idx}>
                    <div>
                      <strong>{entry.status}</strong>
                      <small>{entry.paymentStatus}</small>
                      {entry.note && <p>{entry.note}</p>}
                    </div>
                    <span>{new Date(entry.timestamp).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
