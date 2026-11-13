import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");

if (!fs.existsSync(distDir)) {
  console.error("dist directory does not exist.");
  process.exit(1);
}

const indexHtmlPath = path.join(distDir, "index.html");
const indexHtml = fs.readFileSync(indexHtmlPath, "utf8");

// 1. Create 404.html (standard fallback for static hosting providers like GitHub Pages and InfinityFree)
fs.writeFileSync(path.join(distDir, "404.html"), indexHtml, "utf8");

// 2. Pre-generate physical folders with index.html for all primary application routes
// This ensures that even if .htaccess is omitted or ignored by the hosting server,
// navigating directly to /admin/login, /admin, /track-order, /product/formal-shirt, etc. will NEVER result in a 404.
const routes = [
  "admin",
  "admin/login",
  "track-order",
  "shop",
  "custom-tailoring",
  "fabrics",
  "about",
  "contact",
  "appointment",
  "account",
  "login",
  "signup",
  "checkout",
  "product/formal-shirt",
  "product/tailored-trouser",
  "product/blazer",
  "product/two-piece-suit",
  "product/three-piece-suit",
  "product/heritage-kurta",
  "product/waistcoat",
  "product/wedding-royal-ensemble",
];

for (const route of routes) {
  const targetDir = path.join(distDir, route);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, "index.html"), indexHtml, "utf8");
}

// 3. Ensure API files are in dist
const publicApiDir = path.resolve(__dirname, "../public/api");
const distApiDir = path.join(distDir, "api");
if (fs.existsSync(publicApiDir)) {
  fs.cpSync(publicApiDir, distApiDir, { recursive: true });
}

// 4. Ensure images/uploads directory exists in dist
const distUploadsDir = path.join(distDir, "images/uploads");
fs.mkdirSync(distUploadsDir, { recursive: true });
fs.writeFileSync(path.join(distUploadsDir, ".gitkeep"), "# uploaded images\n", "utf8");

// 5. Ensure .htaccess is copied from public to dist
const publicHtaccess = path.resolve(__dirname, "../public/.htaccess");
const distHtaccess = path.join(distDir, ".htaccess");
if (fs.existsSync(publicHtaccess)) {
  fs.copyFileSync(publicHtaccess, distHtaccess);
}

console.log("Postbuild: Generated 404.html, static routes, images/uploads, and central database endpoints.");
