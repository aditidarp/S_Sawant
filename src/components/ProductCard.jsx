import { Heart, MoveUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ImagePlaceholder } from "./ProductMedia.jsx";
import { formatPrice } from "../lib/format.js";

export default function ProductCard({ product, wished, onWishlist }) {
  const src = product.images?.[product.defaultColour]?.front;

  return (
    <article className="product-card">
      <Link to={`/product/${product.id}`} className="product-card-media">
        {src ? <img src={src} alt={`${product.name}, Indian-made tailoring`} loading="lazy" /> : <ImagePlaceholder colour={product.defaultColour} compact />}
        <span className="product-card-tag">Made to measure</span>
        <span className="product-card-arrow"><MoveUpRight size={16} /></span>
      </Link>
      <button type="button" className={`wishlist-button ${wished ? "wishlist-active" : ""}`} onClick={() => onWishlist(product.id)} aria-label={wished ? "Remove from wishlist" : "Add to wishlist"} aria-pressed={wished}>
        <Heart size={17} fill={wished ? "currentColor" : "none"} />
      </button>
      <div className="product-card-copy">
        <span className="product-card-category">{product.category}</span>
        <Link to={`/product/${product.id}`}><h3>{product.name}</h3></Link>
        <div className="product-card-foot"><span>From {formatPrice(product.price)}</span><span>{product.colours.length} colours</span></div>
      </div>
    </article>
  );
}
