/* =========================================================
   Product Store — lets a Bulk Stock Update sheet auto-create a
   product that isn't in the catalog yet, instead of skipping it.

   HOW THIS WORKS (frontend-only, no server/database):
   - js/data.js defines the "official" PRODUCTS array every
     visitor's browser loads.
   - This file reads any auto-created products saved in local
     storage and pushes them into the SAME live PRODUCTS array +
     CATEGORIES list, right after data.js runs and before any
     page renders products. So an auto-added product shows up
     everywhere PRODUCTS is used — Products page, Cart, Admin
     stock list — and on the next bulk upload it's matched
     normally instead of being created again.
   - Like stock overrides, this only applies on THIS browser. To
     make a new product visible to every visitor, use the
     "Download New Products" button on the Bulk Stock Update page
     and add the printed entries into js/data.js on your hosting.
   ========================================================= */

const PRODUCT_STORE_KEY = "fw_custom_products";

/* Category keyword hints — used to guess a sensible category for an
   auto-created product from its name, instead of dumping everything
   into one bucket. Checked in order, first match wins. */
const CATEGORY_KEYWORDS = [
  { cat: "Rockets", words: ["rocket"] },
  { cat: "Sparklers", words: ["sparkler", "kambi", "mathaap", "maathap"] },
  { cat: "Fountains", words: ["fountain", "flowerpot", "flower pot", "flower"] },
  { cat: "Roman Candles", words: ["roman candle", "romancandle"] },
  { cat: "Chakras", words: ["chakra", "chakkar", "chakker", "spinner", "wheel"] },
  { cat: "Aerial Shots", words: ["aerial", "repeater"] },
  { cat: "Cakes", words: ["cake"] },
  { cat: "Novelty", words: ["smoke", "bomb", "novelty"] },
  { cat: "Crackers", words: ["cracker", "string", "bijili", "vedi"] },
];

function guessCategory(name){
  const n = String(name || "").toLowerCase();
  for(const { cat, words } of CATEGORY_KEYWORDS){
    if(words.some(w => n.includes(w))) return cat;
  }
  return "New Arrivals";
}

/* One representative photo per category, reusing the same freely-
   licensed Wikimedia Commons images already used in js/data.js (via
   the WIKI() helper it defines), so an auto-created product gets a
   real photo instead of just the emoji fallback. */
const CATEGORY_IMAGE_FILES = {
  "rockets": "4th of July Fireworks - Washington DC (7511077340).jpg",
  "sparklers": "Sparklers at Diwali 2010.jpg",
  "fountains": "Diwali fireworks 2.jpg",
  "roman candles": "Romancandle.png",
  "crackers": "Firecracker String.jpg",
  "aerial shots": "Celebration fireworks.jpg",
  "chakras": "Rotating green fireworks in a wheel spinning Holland.jpg",
  "novelty": "Smoke photography smoke 3.jpg",
  "cakes": "Firework fan cake 100 shots.jpg",
};
const DEFAULT_PRODUCT_IMAGE_FILE = "Fireworks on Diwali 2012.jpg";

function imageForCategory(category){
  if(typeof WIKI !== "function") return "";
  const key = String(category || "").trim().toLowerCase();
  const file = CATEGORY_IMAGE_FILES[key] || DEFAULT_PRODUCT_IMAGE_FILE;
  return WIKI(file);
}

function getCustomProducts(){
  try{
    const list = JSON.parse(localStorage.getItem(PRODUCT_STORE_KEY));
    return Array.isArray(list) ? list : [];
  } catch(e){ return []; }
}

function saveCustomProducts(list){
  localStorage.setItem(PRODUCT_STORE_KEY, JSON.stringify(list));
}

function nextCustomProductId(){
  return "c" + Date.now().toString(36) + Math.floor(Math.random() * 36).toString(36);
}

/** Recomputes CATEGORIES in place from the current PRODUCTS list. */
function rebuildCategories(){
  if(typeof CATEGORIES === "undefined") return;
  const fresh = ["All", ...Array.from(new Set(PRODUCTS.map(p => p.category)))];
  CATEGORIES.length = 0;
  fresh.forEach(c => CATEGORIES.push(c));
}

/** One-time repair pass for products saved by an earlier version of
    this file: fills in a proper category (instead of a catch-all
    "New Arrivals") and a category photo (instead of no image) for
    anything still missing them. Runs every page load; a no-op once
    everything's already filled in. */
function repairCustomProducts(){
  const list = getCustomProducts();
  let changed = false;
  list.forEach(p => {
    if(!p.category || p.category === "New Arrivals"){
      const guessed = guessCategory(p.name);
      if(guessed !== "New Arrivals" && guessed !== p.category){ p.category = guessed; changed = true; }
    }
    if(!p.image){
      const img = imageForCategory(p.category);
      if(img){ p.image = img; changed = true; }
    }
  });
  if(changed) saveCustomProducts(list);
  return list;
}

/** Pushes every saved auto-created product into the live PRODUCTS
    array (skipping any already present). Called once automatically
    when this script loads. */
function applyCustomProductsToCatalog(){
  if(typeof PRODUCTS === "undefined") return;
  const existingIds = new Set(PRODUCTS.map(p => p.id));
  repairCustomProducts().forEach(p => {
    if(!existingIds.has(p.id)) PRODUCTS.push(p);
  });
  rebuildCategories();
}

/** Creates and saves a new product, pushing it into the live
    PRODUCTS array right away. Returns the created product. */
function addCustomProduct({ name, category, price, unit, icon, image, desc, initialStock }){
  name = String(name || "").trim();
  category = String(category || "").trim() || guessCategory(name);
  unit = String(unit || "").trim() || "piece";
  icon = String(icon || "").trim() || "🧨";
  image = String(image || "").trim() || imageForCategory(category);
  desc = String(desc || "").trim() || `${name} — added automatically from a bulk stock sheet.`;
  const priceNum = Math.max(0, Number(price) || 0);

  if(!name) throw new Error("Product name is required.");

  const product = {
    id: nextCustomProductId(),
    name, category, price: priceNum, unit, icon,
    image: image || "",
    desc,
    custom: true,
  };

  const list = getCustomProducts();
  list.push(product);
  saveCustomProducts(list);

  PRODUCTS.push(product);
  rebuildCategories();

  const qty = Math.max(0, Number(initialStock) || 0);
  if(typeof setStockOverride === "function") setStockOverride(product.id, qty);

  return product;
}

/** Builds a plain-text block of PRODUCTS entries for every
    auto-created product, ready to paste into js/data.js so the
    new items become permanent for every visitor. A ₹0 price means
    the sheet didn't have a price column for that row — set the
    real price before going live with it. */
function buildCustomProductsSnippet(){
  const list = getCustomProducts();
  if(!list.length) return "";
  return list.map(p => {
    let img = `""`;
    if(p.image){
      const marker = "FilePath/";
      const idx = p.image.indexOf(marker);
      if(idx !== -1){
        // Stored as a full WIKI() URL — print it back as a WIKI("...") call
        // so it matches the style already used in js/data.js.
        const filePart = p.image.slice(idx + marker.length).split("?")[0];
        img = `WIKI("${decodeURIComponent(filePart).replace(/"/g, '\\"')}")`;
      } else {
        img = `"${p.image.replace(/"/g, '\\"')}"`;
      }
    }
    const priceNote = p.price ? "" : " /* set real price */";
    return `  { id: "${p.id}", name: "${p.name.replace(/"/g, '\\"')}", category: "${p.category.replace(/"/g, '\\"')}", price: ${p.price}${priceNote}, unit: "${p.unit.replace(/"/g, '\\"')}", icon: "${p.icon}", image: ${img}, desc: "${p.desc.replace(/"/g, '\\"')}" },`;
  }).join("\n");
}

/** Removes an auto-created product (and its stock entry) from this
    browser — used when a pending bulk import that created it gets
    cancelled instead of applied. */
function removeCustomProduct(id){
  saveCustomProducts(getCustomProducts().filter(p => p.id !== id));
  const idx = PRODUCTS.findIndex(p => p.id === id);
  if(idx !== -1) PRODUCTS.splice(idx, 1);
  rebuildCategories();

  if(typeof getStockOverrides === "function" && typeof STOCK_OVERRIDE_KEY === "string"){
    const overrides = getStockOverrides();
    if(Object.prototype.hasOwnProperty.call(overrides, id)){
      delete overrides[id];
      localStorage.setItem(STOCK_OVERRIDE_KEY, JSON.stringify(overrides));
    }
  }
}

applyCustomProductsToCatalog();