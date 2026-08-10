/* =========================================================
   Admin Core — shared by admin.html and bulk-stock.html
   Login gate, profile/password helpers, and the stock list.

   Simple client-side password gate (NOT real security — anyone
   who reads this file can see the password). Good enough to keep
   casual visitors out, not to protect sensitive data.
   ========================================================= */

const ADMIN_PW_KEY = "fw_admin_password";   // local override set via Settings
const ADMIN_NAME_KEY = "fw_admin_name";     // display name set via Profile
const DEFAULT_ADMIN_PASSWORD = "spark2026"; // fallback if admin-config.js is missing

/** Live password: Settings override (this browser) → deployed admin-config.js → fallback. */
function getAdminPassword(){
  const local = localStorage.getItem(ADMIN_PW_KEY);
  if(local) return local;
  if(window.ADMIN_CONFIG && window.ADMIN_CONFIG.password) return window.ADMIN_CONFIG.password;
  return DEFAULT_ADMIN_PASSWORD;
}

function setAdminPassword(pw){
  localStorage.setItem(ADMIN_PW_KEY, pw);
}

function getAdminName(){
  return localStorage.getItem(ADMIN_NAME_KEY)
    || (window.ADMIN_CONFIG && window.ADMIN_CONFIG.ownerName)
    || "Admin";
}

function setAdminName(name){
  localStorage.setItem(ADMIN_NAME_KEY, name);
}

function checkAdminAuth(){
  return sessionStorage.getItem("fw_admin_unlocked") === "yes";
}

function unlockAdmin(pw){
  if(pw === getAdminPassword()){
    sessionStorage.setItem("fw_admin_unlocked", "yes");
    return true;
  }
  return false;
}

function lockAdmin(){
  sessionStorage.removeItem("fw_admin_unlocked");
}

function initialsFor(name){
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return "A";
  if(parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ratePassword(pw){
  if(pw.length < 6) return { cls:"weak", text:"Too short — use at least 6 characters" };
  let score = 0;
  if(pw.length >= 10) score++;
  if(/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if(/\d/.test(pw)) score++;
  if(/[^A-Za-z0-9]/.test(pw)) score++;
  if(score >= 3) return { cls:"good", text:"Strong password" };
  if(score >= 2) return { cls:"fair", text:"Okay — add a capital, number or symbol" };
  return { cls:"weak", text:"Weak — mix letters, numbers and symbols" };
}

function buildAdminConfigContents(){
  const pw = getAdminPassword().replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const nm = getAdminName().replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `/* Admin config — generated from the admin panel on ${new Date().toLocaleString()}.
   Upload this file over js/admin-config.js on your hosting to make this
   password the default on every device.

   Reminder: a frontend-only site can't hide this value from anyone who
   views the page source. It keeps casual visitors out, nothing more. */

window.ADMIN_CONFIG = {
  password: "${pw}",
  ownerName: "${nm}",
};
`;
}

function downloadTextFile(filename, contents, mime){
  const blob = new Blob([contents], { type: mime || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]
  ));
}

/** Wires the shared login gate. Expects #adminGate, #adminPanel,
    #adminPassword, #unlockBtn and (optionally) #gateError on the page.
    Returns { showPanel, showGate } or null if the markup isn't there. */
function setupAdminGate(options){
  const opts = options || {};
  const gate = document.getElementById("adminGate");
  const panel = document.getElementById("adminPanel");
  const pwInput = document.getElementById("adminPassword");
  const unlockBtn = document.getElementById("unlockBtn");
  const gateError = document.getElementById("gateError");
  if(!gate || !panel || !pwInput || !unlockBtn) return null;

  function showPanel(){
    gate.style.display = "none";
    panel.style.display = "block";
    if(typeof opts.onUnlock === "function") opts.onUnlock();
  }

  function showGate(){
    panel.style.display = "none";
    gate.style.display = "block";
    pwInput.value = "";
    if(gateError) gateError.style.display = "none";
    if(typeof resetPasswordToggles === "function") resetPasswordToggles();
    pwInput.focus();
  }

  unlockBtn.addEventListener("click", () => {
    if(unlockAdmin(pwInput.value.trim())){
      if(gateError) gateError.style.display = "none";
      showPanel();
    } else {
      if(gateError) gateError.style.display = "block";
      pwInput.value = "";
      pwInput.focus();
    }
  });

  pwInput.addEventListener("keydown", (e) => {
    if(e.key === "Enter") unlockBtn.click();
  });

  if(checkAdminAuth()) showPanel();
  return { showPanel, showGate };
}

function populateItemSelect(){
  const sel = document.getElementById("stockItemSelect");
  if(!sel) return;
  sel.innerHTML = PRODUCTS.map(p => `<option value="${p.id}">${p.name} (${p.category})</option>`).join("");
}

/** Splits a catalog name like "Sky Rocket - Standard" or "Sparklers
    (Pack of 10)" into a base item name + variant, so the admin table
    can show them as separate columns. Falls back to no variant for
    plain names like "Ground Spinner". */
function splitNameVariant(name){
  const dash = String(name || "").match(/^(.*?)\s-\s(.*)$/);
  if(dash) return { item: dash[1].trim(), variant: dash[2].trim() };
  const paren = String(name || "").match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if(paren) return { item: paren[1].trim(), variant: paren[2].trim() };
  return { item: String(name || "").trim(), variant: "" };
}

function renderAdminProductList(){
  const listEl = document.getElementById("adminProductList");
  if(!listEl) return;

  const rows = PRODUCTS.map(p => {
    const qty = getStockQty(p.id);
    const inStock = qty > 0;
    const threshold = typeof LOW_STOCK_THRESHOLD === "number" ? LOW_STOCK_THRESHOLD : 10;
    const low = inStock && qty <= threshold;
    const stateCls = !inStock ? "out" : (low ? "low" : "in");
    const { item, variant } = splitNameVariant(p.name);
    return `
    <tr class="admin-stock-row">
      <td>${escapeHtml(item)}</td>
      <td>${variant ? escapeHtml(variant) : "—"}</td>
      <td>${escapeHtml(p.unit)}</td>
      <td class="num">₹${p.price}</td>
      <td class="num">
        <span class="stock-state ${stateCls}">${inStock ? qty : "0"}</span>
        ${!inStock ? `<span class="stock-warning out">Out of Stock</span>` : (low ? `<span class="stock-warning low">⚠️ Low stock</span>` : "")}
      </td>
      <td class="admin-stock-update">
        <div class="qty-edit">
          <div class="qty-stepper">
            <button type="button" class="qty-btn qty-minus" data-id="${p.id}" aria-label="Decrease quantity">&minus;</button>
            <input type="number" min="0" value="${qty}" class="stock-qty-input" data-id="${p.id}" title="Set exact quantity" inputmode="numeric">
            <button type="button" class="qty-btn qty-plus" data-id="${p.id}" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" class="btn btn-outline btn-sm set-qty-btn" data-id="${p.id}">Set</button>
        </div>
      </td>
    </tr>`;
  }).join("");

  listEl.innerHTML = `
    <div class="admin-stock-table-wrap">
      <table class="admin-stock-table">
        <thead><tr>
          <th>Item Name</th><th>Variant</th><th>Per Piece</th>
          <th class="num">Amount (₹)</th><th class="num">Stock</th><th class="admin-stock-update">Update</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  listEl.querySelectorAll(".set-qty-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const input = listEl.querySelector(`.stock-qty-input[data-id="${id}"]`);
      const qty = Math.max(0, parseInt(input.value) || 0);
      setStockOverride(id, qty);
      renderAdminProductList();
      const product = PRODUCTS.find(p => p.id === id);
      showToast(`${product.name}: quantity set to ${qty}.`);
    });
  });

  function clampStockQty(input){
    let v = parseInt(input.value);
    if(isNaN(v) || v < 0) v = 0;
    input.value = v;
    const minus = input.closest(".qty-stepper")?.querySelector(".qty-minus");
    if(minus) minus.disabled = v <= 0;
    return v;
  }

  listEl.querySelectorAll(".stock-qty-input").forEach(input => {
    clampStockQty(input);
    input.addEventListener("input", () => clampStockQty(input));
    input.addEventListener("keydown", (e) => {
      if(e.key === "Enter"){
        e.preventDefault();
        listEl.querySelector(`.set-qty-btn[data-id="${input.dataset.id}"]`).click();
      }
    });
  });

  listEl.querySelectorAll(".qty-edit .qty-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = listEl.querySelector(`.stock-qty-input[data-id="${btn.dataset.id}"]`);
      if(!input) return;
      const step = btn.classList.contains("qty-plus") ? 1 : -1;
      input.value = (parseInt(input.value) || 0) + step;
      clampStockQty(input);
    });
  });
}