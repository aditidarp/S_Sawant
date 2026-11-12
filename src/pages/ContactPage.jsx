import { ArrowRight, MapPin, Phone, Clock3, Mail, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  function update(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }

  function submit(e) {
    e.preventDefault();
    // In production, this would send to Firebase or an email service
    setSent(true);
  }

  return (
    <main className="page-shell contact-page">
      <div className="page-intro">
        <span className="eyebrow">Get in touch</span>
        <h1>Contact Us</h1>
        <p>We would love to hear from you. Visit our shop, call us, or send a message.</p>
      </div>

      <div className="contact-layout">
        <div className="contact-info-section">
          <div className="contact-card">
            <div className="contact-brand-mark">S.</div>
            <h2>S. SAWANT MENS WEAR</h2>
            <p className="contact-owner">Owner: <strong>Shivaji Sawant</strong></p>
          </div>

          <div className="contact-details">
            <div className="contact-detail-item">
              <MapPin size={20} />
              <div>
                <strong>Visit Us</strong>
                <p>S. Sawant Mens Wear,<br />
                Beside Gandhi Saree Center,<br />
                Aurangpura Parking Area,<br />
                Chhatrapati Sambhajinagar,<br />
                Maharashtra, India.</p>
              </div>
            </div>

            <div className="contact-detail-item">
              <Phone size={20} />
              <div>
                <strong>Call Us</strong>
                <a href="tel:+918308878204" className="contact-link">+91 83088 78204</a>
              </div>
            </div>

            <div className="contact-detail-item">
              <MessageCircle size={20} />
              <div>
                <strong>WhatsApp</strong>
                <a href="https://wa.me/918308878204" target="_blank" rel="noreferrer" className="contact-link">
                  Chat on WhatsApp <ArrowRight size={12} />
                </a>
              </div>
            </div>

            <div className="contact-detail-item">
              <Clock3 size={20} />
              <div>
                <strong>Opening Hours</strong>
                <p>Monday – Saturday<br />10:00 AM – 8:00 PM<br />Sunday: By appointment only</p>
              </div>
            </div>
          </div>

          <div className="contact-action-buttons">
            <a href="tel:+918308878204" className="button button-gold">
              <Phone size={14} /> Call Now
            </a>
            <a href="https://wa.me/918308878204" target="_blank" rel="noreferrer" className="button button-outline">
              <MessageCircle size={14} /> WhatsApp
            </a>
          </div>
        </div>

        <div className="contact-form-section">
          {sent ? (
            <div className="contact-success">
              <span className="eyebrow">Message sent</span>
              <h2>Thank you for reaching out.</h2>
              <p>We will get back to you within 24 hours.</p>
              <Link to="/shop" className="button button-outline">Continue Shopping <ArrowRight size={14} /></Link>
            </div>
          ) : (
            <form className="editorial-form contact-form" onSubmit={submit}>
              <h2>Send us a message</h2>
              <div className="form-grid">
                <label className="field-control">
                  <span>Your name</span>
                  <input required value={form.name} onChange={(e) => update("name", e.target.value)} autoComplete="name" />
                </label>
                <label className="field-control">
                  <span>Mobile number</span>
                  <input required type="tel" pattern="[+]?[0-9]{10,15}" placeholder="+91" value={form.phone} onChange={(e) => update("phone", e.target.value)} autoComplete="tel" />
                </label>
                <label className="field-control field-control-full">
                  <span>Email address</span>
                  <input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" />
                </label>
                <label className="field-control field-control-full">
                  <span>Subject</span>
                  <select value={form.subject} onChange={(e) => update("subject", e.target.value)}>
                    <option>General enquiry</option>
                    <option>Custom tailoring</option>
                    <option>Order status</option>
                    <option>Fabric availability</option>
                    <option>Appointment booking</option>
                    <option>Alteration request</option>
                    <option>Bulk / corporate order</option>
                  </select>
                </label>
                <label className="field-control field-control-full">
                  <span>Your message</span>
                  <textarea required rows={5} value={form.message} onChange={(e) => update("message", e.target.value)} placeholder="Tell us how we can help..." />
                </label>
              </div>
              <button className="button button-gold" type="submit">Send Message <ArrowRight size={14} /></button>
            </form>
          )}
        </div>
      </div>

      <section className="contact-map-section">
        <h2>Find Us</h2>
        <div className="contact-map">
          <iframe
            title="S. Sawant Mens Wear Location"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3752.2!2d75.33!3d19.88!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sChhatrapati+Sambhajinagar!5e0!3m2!1sen!2sin!4v1700000000000"
            width="100%"
            height="400"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    </main>
  );
}
