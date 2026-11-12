const STORAGE_PREFIX = "ssawant-v2:";

const localAdapter = {
  async get(key) {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw === null ? null : JSON.parse(raw);
  },
  async set(key, value) {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  },
};

let adapter = localAdapter;

export function configureRepositoryAdapter(nextAdapter) {
  if (!nextAdapter || typeof nextAdapter.get !== "function" || typeof nextAdapter.set !== "function") {
    throw new TypeError("Repository adapter must implement async get(key) and set(key, value).");
  }
  adapter = nextAdapter;
}

export const repository = {
  async get(key, fallback) {
    const value = await adapter.get(key);
    return value === null || value === undefined ? fallback : value;
  },
  async set(key, value) {
    await adapter.set(key, value);
  },
};

export function localImageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}
