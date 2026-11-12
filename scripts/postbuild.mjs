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
// navigating directly to /admin/login, /admin, /track-order, etc. will NEVER result in a 404.
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
];

for (const route of routes) {
  const targetDir = path.join(distDir, route);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, "index.html"), indexHtml, "utf8");
}

console.log("Postbuild: Generated 404.html and static route entrypoints for all routes.");
