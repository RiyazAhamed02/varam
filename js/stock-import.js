/* =========================================================
   Stock Import — read an Excel/CSV stock sheet and update stock.

   Expected sheet: one column of item names and one of quantities.
   Extra columns (price, totals, etc.) are ignored, and the header
   row is found automatically — so a title row above the headers,
   or blank rows, are fine.

   Recognised header names (case/spacing insensitive):
     name  -> Item Name, Item, Product, Product Name, Cracker(s),
              Description, Particulars
     qty   -> Quantity, Qty, Stock, Stock Qty, Count, Units, Nos,
              Available, Balance, In Stock, Closing Stock
   ========================================================= */

const IMPORT_NAME_HEADERS = [
  "itemname","item","items","itemdescription","product","products","productname",
  "name","cracker","crackers","crackername","crackers name","description",
  "particulars","goods","itemcode","sku",
];
const IMPORT_QTY_HEADERS = [
  "quantity","quantities","qty","qtys","stock","stockqty","stockquantity",
  "count","units","unit","nos","no","numbers","available","availableqty",
  "balance","instock","closingstock","openingstock","totalqty","onhand",
];
/* Looser substrings, used only if no header matched exactly. */
const IMPORT_NAME_HINTS = ["itemname","productname","crackername","item","product","cracker","name","description","particulars"];
const IMPORT_QTY_HINTS  = ["quantity","qty","stock","instock","onhand","balance","nos","count","units"];
/* A header containing any of these is money/derived, never a quantity. */
const IMPORT_MONEY_HINTS = ["price","rate","amount","value","cost","mrp","total","subtotal","discount","tax","gst"];

/** Lowercase, strip everything but letters+digits. "Qty (Nos)" -> "qtynos" */
function importNormHeader(v){
  return String(v == null ? "" : v).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Loose name key for matching: lowercase, punctuation -> single space. */
function importNormName(v){
  return String(v == null ? "" : v)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function importNameTokens(v){
  return importNormName(v).split(" ").filter(t => t && t.length > 1);
}

/* Packaging/filler words that shouldn't count toward a name match —
   "Sparklers Pack of 10" and "Sparklers" should still be close. */
const IMPORT_FILLER_TOKENS = new Set([
  "pack","packs","packet","packets","box","boxes","piece","pieces","pcs","pc",
  "string","strings","of","set","sets","unit","units","nos","no","count",
  "each","item","items","ground",
]);

/* Common Tamil-transliteration / trade-name synonyms for cracker terms,
   so a sheet written the way suppliers actually write it still matches
   the English catalog names. Left side: word as it commonly appears in
   a sheet -> right side: canonical word used in the catalog. */
const IMPORT_SYNONYMS = {
  "chakra": "spinner", "chakkara": "spinner", "chakras": "spinner",
  "ground": "ground", "kambi": "sparklers", "sparkler": "sparklers",
  "sparklers": "sparklers", "mathaap": "sparklers", "maathap": "sparklers",
  "rocket": "rocket", "rockets": "rocket", "bomb": "bomb", "bombs": "bomb",
  "atom": "bomb", "sound": "bomb", "flowerpot": "fountain", "flower": "fountain",
  "pot": "fountain", "pots": "fountain", "fountain": "fountain",
  "fountains": "fountain", "candle": "candle", "candles": "candle",
  "rc": "candle", "cake": "cake", "cakes": "cake", "repeater": "repeater",
  "aerial": "aerial", "shot": "shot", "shots": "shot", "smoke": "smoke",
  "spinner": "spinner", "spinners": "spinner", "cracker": "cracker",
  "crackers": "cracker", "bijili": "cracker", "vedi": "cracker",
};

function importCanonToken(t){
  return IMPORT_SYNONYMS[t] || t;
}

/** Tokens used for scoring a match: filler words dropped, synonyms
    folded to a canonical word, numbers kept as-is (numbers matter —
    "10 Shot" must not get confused with "15 Shot"). */
function importMatchTokens(v){
  return importNameTokens(v)
    .filter(t => !IMPORT_FILLER_TOKENS.has(t))
    .map(importCanonToken);
}

/** All standalone numbers mentioned in a name, e.g. "Roman Candle - 10
    Shot" -> ["10"]. Used to stop same-family variants (10 Shot vs 15
    Shot, 25 vs 50) from being confused for each other. */
function importNameNumbers(v){
  return (String(v == null ? "" : v).match(/\d+/g) || []);
}

/** Pull a number out of "20", 20, "20 pcs", "1,200" -> 20 / 1200. */
function importParseQty(v){
  if(typeof v === "number" && isFinite(v)) return Math.max(0, Math.round(v));
  const m = String(v == null ? "" : v).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if(!m) return null;
  const n = Number(m[0]);
  if(!isFinite(n)) return null;
  return Math.max(0, Math.round(n));
}

/** Pull a price out of a cell, keeping decimals — "₹80", "80.50",
    "Rs 1,200" -> 80 / 80.5 / 1200. Returns null if no number found. */
function importParsePrice(v){
  if(typeof v === "number" && isFinite(v)) return Math.max(0, v);
  const m = String(v == null ? "" : v).replace(/[₹,]/g, "").match(/-?\d+(\.\d+)?/);
  if(!m) return null;
  const n = Number(m[0]);
  return isFinite(n) ? Math.max(0, n) : null;
}

function importIsMoneyHeader(key){
  return IMPORT_MONEY_HINTS.some(h => key.includes(h));
}

/** True if the cell reads as a bare count ("20", 20, "1,200", "20 pcs"). */
function importLooksNumeric(cell){
  if(typeof cell === "number") return isFinite(cell);
  const s = String(cell == null ? "" : cell).trim();
  if(!s) return false;
  if(!/\d/.test(s)) return false;
  // digits plus at most a short unit word: "20", "1,200", "20 pcs", "20 nos"
  return /^[\d.,]+\s*[a-z%.]{0,6}$/i.test(s);
}

/** Finds where the data starts and which columns to read.
    Returns { dataStartRow, nameCol, qtyCol, guessed } or null. */
function importFindHeader(rows){
  const limit = Math.min(rows.length, 30); // headers live near the top

  // Pass 1 — exact header names. Pass 2 — looser substring hints.
  for(const pass of ["exact", "hints"]){
    for(let r = 0; r < limit; r++){
      const row = rows[r] || [];
      let nameCol = -1;
      let qtyCol = -1;
      for(let c = 0; c < row.length; c++){
        const key = importNormHeader(row[c]);
        if(!key) continue;
        const nameHit = pass === "exact"
          ? IMPORT_NAME_HEADERS.includes(key)
          : IMPORT_NAME_HINTS.some(h => key.includes(h)) && !importIsMoneyHeader(key);
        const qtyHit = pass === "exact"
          ? IMPORT_QTY_HEADERS.includes(key)
          : IMPORT_QTY_HINTS.some(h => key.includes(h)) && !importIsMoneyHeader(key);
        if(nameCol === -1 && nameHit && !qtyHit) nameCol = c;
        else if(qtyCol === -1 && qtyHit) qtyCol = c;
      }
      if(nameCol !== -1 && qtyCol !== -1){
        return { dataStartRow: r + 1, nameCol, qtyCol, guessed: false };
      }
    }
  }

  // Pass 3 — no usable headers. Find the first row that reads as
  // "text in one column, a count in another" and start reading there.
  for(let r = 0; r < limit; r++){
    const row = rows[r] || [];
    let nameCol = -1;
    let qtyCol = -1;
    for(let c = 0; c < row.length; c++){
      const cell = row[c];
      if(cell == null || cell === "") continue;
      if(importLooksNumeric(cell)){
        if(qtyCol === -1) qtyCol = c;
      } else if(nameCol === -1 && String(cell).trim().length > 2){
        nameCol = c;
      }
    }
    if(nameCol !== -1 && qtyCol !== -1){
      return { dataStartRow: r, nameCol, qtyCol, guessed: true };
    }
  }
  return null;
}

/** True if the two names name mention conflicting numbers — e.g. "Roman
    Candle 10 Shot" vs "Roman Candle 15 Shot", or "Aerial 25" vs "Aerial
    50". Same numbers, or no numbers on one side, is not a conflict. */
function importNumbersConflict(rawName, catalogName){
  const a = importNameNumbers(rawName);
  const b = importNameNumbers(catalogName);
  if(!a.length || !b.length) return false;
  return !a.some(n => b.includes(n));
}

/** Matches a sheet item name to a catalog product. Tries exact, then
    squashed, then containment, then token overlap — each step guarded
    against picking a same-family variant with a different number in
    the name (e.g. never confusing a "10 Shot" sheet row with the
    catalog's "15 Shot" product). Returns product|null. */
function importMatchProduct(rawName, products){
  const key = importNormName(rawName);
  if(!key) return null;
  const squash = key.replace(/ /g, "");

  for(const p of products){ if(importNormName(p.name) === key) return p; }
  for(const p of products){ if(importNormName(p.name).replace(/ /g, "") === squash) return p; }

  // Containment — prefer the longest catalog name that fits, skipping
  // any candidate whose number disagrees with the sheet row's number.
  let best = null;
  let bestLen = 0;
  for(const p of products){
    const pk = importNormName(p.name);
    if(importNumbersConflict(rawName, p.name)) continue;
    if((pk.includes(key) || key.includes(pk)) && pk.length > bestLen){ best = p; bestLen = pk.length; }
  }
  if(best) return best;

  // Token overlap (Jaccard) over filler-stripped, synonym-folded
  // tokens — needs a clear majority, and numbers must not conflict.
  const tokens = new Set(importMatchTokens(rawName));
  if(!tokens.size) return null;
  let bestScore = 0;
  for(const p of products){
    if(importNumbersConflict(rawName, p.name)) continue;
    const pt = new Set(importMatchTokens(p.name));
    if(!pt.size) continue;
    let shared = 0;
    tokens.forEach(t => { if(pt.has(t)) shared++; });
    const score = shared / new Set([...tokens, ...pt]).size;
    if(score > bestScore){ bestScore = score; best = p; }
  }
  return bestScore >= 0.6 ? best : null;
}

/** Reads an ArrayBuffer of an xlsx/xls/csv file into rows of the first
    sheet that has a usable name+quantity pair.
    Returns { sheetName, rows: [{ rawName, qty, product }], skipped: [...] } */
function importParseStockWorkbook(arrayBuffer){
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  if(!wb.SheetNames.length) throw new Error("That file has no sheets in it.");

  let chosen = null;
  for(const sheetName of wb.SheetNames){
    const grid = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
      header: 1, blankrows: false, defval: "", raw: true,
    });
    const found = importFindHeader(grid);
    if(found){ chosen = { sheetName, grid, ...found }; break; }
  }
  if(!chosen){
    throw new Error("Couldn't find an item name column and a quantity column. Make sure the sheet has headers like \"Item Name\" and \"Quantity\".");
  }

  // Optional: a price/rate column, if the sheet has one — only used as
  // the starting price for a brand-new product the sheet introduces.
  // Sheets without a header row (guessed layout) don't get this, since
  // there's no header text to recognise a price column by.
  let priceCol = -1;
  if(!chosen.guessed){
    const headerRow = chosen.grid[chosen.dataStartRow - 1] || [];
    for(let c = 0; c < headerRow.length; c++){
      if(c === chosen.nameCol || c === chosen.qtyCol) continue;
      const key = importNormHeader(headerRow[c]);
      if(key && IMPORT_MONEY_HINTS.some(h => key.includes(h))){ priceCol = c; break; }
    }
  }

  const products = typeof PRODUCTS !== "undefined" ? PRODUCTS : [];
  const rows = [];
  const skipped = [];
  const seen = new Map(); // product id -> index in rows, so repeats combine

  for(let r = chosen.dataStartRow; r < chosen.grid.length; r++){
    const row = chosen.grid[r] || [];
    const rawName = String(row[chosen.nameCol] == null ? "" : row[chosen.nameCol]).trim();
    if(!rawName) continue;

    // Skip total/subtotal footer rows.
    if(/^(grand\s+|sub\s*)?total\b/i.test(rawName)) continue;
    // Skip a repeated header row in the middle of the data.
    const asHeader = importNormHeader(rawName);
    if(IMPORT_NAME_HEADERS.includes(asHeader) || IMPORT_QTY_HEADERS.includes(asHeader)) continue;

    const qty = importParseQty(row[chosen.qtyCol]);
    if(qty === null){
      skipped.push({ rawName, reason: "no quantity found" });
      continue;
    }

    let product = importMatchProduct(rawName, products);
    let autoCreated = false;
    if(!product){
      // Not in the catalog — auto-create it instead of skipping the row,
      // so any item in the sheet ends up reflected on the site, however
      // many new items the sheet contains. Use the sheet's price for
      // this row if there's a price column and this row has a value in
      // it; otherwise it's created at ₹0 as a placeholder to fix later.
      if(typeof addCustomProduct === "function"){
        try{
          const priceFromSheet = priceCol !== -1 ? importParsePrice(row[priceCol]) : null;
          product = addCustomProduct({ name: rawName, price: priceFromSheet || 0, initialStock: 0 });
          autoCreated = true;
        } catch(err){
          skipped.push({ rawName, qty, reason: (err && err.message) || "couldn't add this as a new product" });
          continue;
        }
      } else {
        skipped.push({ rawName, qty, reason: "no matching product in the catalog" });
        continue;
      }
    }

    if(seen.has(product.id)){
      // Same product listed twice in the sheet — add the quantities together.
      rows[seen.get(product.id)].qty += qty;
      rows[seen.get(product.id)].duplicated = true;
    } else {
      seen.set(product.id, rows.length);
      rows.push({ rawName, qty, product, autoCreated });
    }
  }

  if(!rows.length && !skipped.length){
    throw new Error("The sheet's headers were found but there were no data rows under them.");
  }
  return { sheetName: chosen.sheetName, guessedHeader: !!chosen.guessed, rows, skipped };
}