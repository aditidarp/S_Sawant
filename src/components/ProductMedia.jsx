import { Expand, Image as ImageIcon } from "lucide-react";

const VIEW_LABELS = {
  front: "Front",
  back: "Back",
  detail: "Detail",
  fabric: "Fabric",
};

export function ImagePlaceholder({ colour, view = "front", compact = false }) {
  return (
    <div className={`image-placeholder ${compact ? "image-placeholder-compact" : ""}`}>
      <ImageIcon size={compact ? 20 : 28} strokeWidth={1} />
      <span className="image-placeholder-kicker">{colour || "Product"} · {VIEW_LABELS[view] || view}</span>
      <strong>Photograph coming soon</strong>
      <span className="image-placeholder-note">This view is not yet available. No colour filters are used.</span>
    </div>
  );
}

export function ProductMedia({ product, colour, view, setView, openZoom, compact = false }) {
  const views = ["front", "back", "detail", "fabric"];
  const colourImages = product.images?.[colour] || {};
  const image = colourImages[view];

  return (
    <div className={`product-media ${compact ? "product-media-compact" : ""}`}>
      <div className="product-media-stage">
        {image ? (
          <button type="button" className="product-media-image" onClick={() => openZoom(image)} aria-label={`Zoom ${colour} ${view} photograph`}>
            <img src={image} alt={`${product.name} in ${colour}, ${VIEW_LABELS[view]?.toLowerCase()} view`} />
            <span className="zoom-hint"><Expand size={14} /> Click to zoom</span>
          </button>
        ) : (
          <ImagePlaceholder colour={colour} view={view} compact={compact} />
        )}
      </div>
      <div className="gallery-strip" aria-label="Product image views">
        {views.map((item) => {
          const available = Boolean(colourImages[item]);
          return (
            <button
              type="button"
              key={item}
              className={`gallery-thumb ${view === item ? "gallery-thumb-active" : ""} ${!available ? "gallery-thumb-unavailable" : ""}`}
              onClick={() => setView(item)}
              aria-pressed={view === item}
            >
              {available ? <img src={colourImages[item]} alt="" /> : <ImageIcon size={15} strokeWidth={1} />}
              <span>{VIEW_LABELS[item]}</span>
            </button>
          );
        })}
      </div>
      {!image && <p className="availability-note">We currently have no verified {colour.toLowerCase()} {VIEW_LABELS[view].toLowerCase()} image. Your selection is saved as requested; our atelier can confirm the cloth in person.</p>}
    </div>
  );
}

export function ImageZoom({ src, alt, onClose }) {
  if (!src) return null;
  return (
    <div className="zoom-backdrop" role="presentation" onClick={onClose}>
      <div className="zoom-image-wrap" role="dialog" aria-modal="true" aria-label="Product image zoom" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="zoom-close" onClick={onClose} aria-label="Close zoom">×</button>
        <img src={src} alt={alt} />
      </div>
    </div>
  );
}

export function ColourSelector({ colours, selected, onSelect, images }) {
  return (
    <div className="swatch-list" role="group" aria-label="Choose a colour">
      {colours.map((colour) => {
        const available = Boolean(images?.[colour]?.front);
        const swatch = {
          Black: "#222321", "Navy Blue": "#233650", Brown: "#765b43", "Light Grey": "#b9b9b4",
          White: "#f5f2e9", "Sky Blue": "#a7bdc8", "Light Pink": "#d8b8b8", Lavender: "#afa4c1",
          Beige: "#c9b89d", Ivory: "#e6dec9",
        }[colour] || "#a09b91";
        return (
          <button
            type="button"
            className={`colour-swatch ${selected === colour ? "colour-swatch-selected" : ""}`}
            onClick={() => onSelect(colour)}
            key={colour}
            aria-pressed={selected === colour}
            title={`${colour}${available ? "" : " · photograph coming soon"}`}
          >
            <span className="colour-dot" style={{ backgroundColor: swatch }} />
            <span className="colour-label">{colour}</span>
            {!available && <span className="swatch-unavailable" aria-label="Image coming soon">Photo soon</span>}
          </button>
        );
      })}
    </div>
  );
}
