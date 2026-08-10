/* =========================================================
   Bulk Stock Update page (bulk-stock.html)
   Upload an Excel/CSV stock sheet, preview what will change,
   then apply it as a replace or an add.

   Login gate, password helpers and the stock list renderer
   come from admin-core.js.
   ========================================================= */

let pendingImport = null; // { rows, skipped, fileName, sheetName }

function renderImportPreview(){
  const box = document.getElementById("importResult");
  if(!box || !pendingImport) return;
  const { rows, skipped, fileName, sheetName, guessedHeader } = pendingImport;

  const newCount = rows.filter(r => r.autoCreated).length;
  const chips = [
    `<span class="import-chip">📄 ${escapeHtml(fileName)}</span>`,
    `<span class="import-chip">Sheet: ${escapeHtml(sheetName)}</span>`,
    `<span class="import-chip ok">${rows.length} item${rows.length === 1 ? "" : "s"} matched</span>`,
  ];
  if(newCount) chips.push(`<span class="import-chip warn">🆕 ${newCount} new product${newCount === 1 ? "" : "s"} added to the catalog</span>`);
  if(skipped.length) chips.push(`<span class="import-chip warn">${skipped.length} row${skipped.length === 1 ? "" : "s"} skipped</span>`);
  if(guessedHeader) chips.push(`<span class="import-chip warn">Headers guessed — please check the numbers</span>`);

  const body = rows.map(r => {
    const current = getStockQty(r.product.id);
    const diff = r.qty - current;
    const deltaCls = diff > 0 ? "delta-up" : (diff < 0 ? "delta-down" : "delta-same");
    const deltaTxt = diff > 0 ? `+${diff}` : (diff < 0 ? `${diff}` : "no change");
    const note = r.autoCreated
      ? `<span class="renamed" style="color:#4ade80;">🆕 new product — added to the catalog${r.product.price ? ` at ₹${r.product.price}` : ", price defaults to ₹0 until you set it"}</span>`
      : (importNormName(r.rawName) !== importNormName(r.product.name)
        ? `<span class="renamed">from sheet: “${escapeHtml(r.rawName)}”${r.duplicated ? " (listed more than once — added up)" : ""}</span>`
        : (r.duplicated ? `<span class="renamed">listed more than once — added up</span>` : ""));
    return `<tr>
      <td>${escapeHtml(r.product.name)}${note}</td>
      <td class="num was">${current}</td>
      <td class="num now">${r.qty}</td>
      <td class="num"><span class="${deltaCls}">${deltaTxt}</span></td>
    </tr>`;
  }).join("");

  const unmatched = skipped.length ? `
    <div class="import-unmatched">
      <strong>⚠️ ${skipped.length} row${skipped.length === 1 ? "" : "s"} skipped</strong> — these won't be changed. Rename them in your sheet to match the catalog exactly if they should be included.
      <ul>${skipped.slice(0, 12).map(s => `<li>“${escapeHtml(s.rawName)}” — ${escapeHtml(s.reason)}</li>`).join("")}
      ${skipped.length > 12 ? `<li>…and ${skipped.length - 12} more</li>` : ""}</ul>
    </div>` : "";

  box.innerHTML = `
    <div class="divider"></div>
    <div class="import-summary">${chips.join("")}</div>
    ${rows.length ? `
    <div class="import-table-wrap">
      <table class="import-table">
        <thead><tr><th>Item</th><th style="text-align:right;">Now</th><th style="text-align:right;">In sheet</th><th style="text-align:right;">Change</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>` : `<p style="color:#ff8a80; font-weight:700;">No items in this sheet matched your catalog, so there's nothing to apply.</p>`}
    ${unmatched}
    ${rows.length ? `
    <div class="import-actions">
      <button type="button" class="btn btn-primary btn-sm" id="applyReplaceBtn">✅ Replace with sheet values</button>
      <button type="button" class="btn btn-outline btn-sm" id="applyAddBtn">➕ Add to current stock</button>
    </div>
    <p class="field-hint" style="margin-top:10px;"><strong>Replace</strong> sets each item to the sheet's quantity (use when the sheet is your full stock count). <strong>Add</strong> treats the sheet as a new delivery and adds to what's already there.</p>` : ""}
    <div class="import-actions">
      <button type="button" class="btn btn-outline btn-sm" id="cancelImportBtn" style="flex:0 0 auto; min-width:120px;">✕ Cancel</button>
    </div>`;

  box.style.display = "block";

  const replaceBtn = document.getElementById("applyReplaceBtn");
  if(replaceBtn) replaceBtn.addEventListener("click", () => applyImport("replace"));
  const addBtn = document.getElementById("applyAddBtn");
  if(addBtn) addBtn.addEventListener("click", () => applyImport("add"));
  document.getElementById("cancelImportBtn").addEventListener("click", () => clearImport(true));
}

function clearImport(rollbackAutoCreated){
  if(rollbackAutoCreated && pendingImport && pendingImport.autoCreatedIds && pendingImport.autoCreatedIds.length && typeof removeCustomProduct === "function"){
    pendingImport.autoCreatedIds.forEach(id => removeCustomProduct(id));
    renderAdminProductList();
  }
  pendingImport = null;
  const box = document.getElementById("importResult");
  if(box){ box.style.display = "none"; box.innerHTML = ""; }
  const input = document.getElementById("stockFileInput");
  if(input) input.value = ""; // so re-uploading the same file still fires change
}

function applyImport(mode){
  if(!pendingImport || !pendingImport.rows.length) return;
  let changed = 0;
  const afterState = []; // { product, qty } — used for the low-stock warning below
  pendingImport.rows.forEach(r => {
    const before = getStockQty(r.product.id);
    if(mode === "add") addStockQty(r.product.id, r.qty);
    else setStockOverride(r.product.id, r.qty);
    const after = getStockQty(r.product.id);
    if(after !== before) changed++;
    afterState.push({ product: r.product, qty: after });
  });
  const total = pendingImport.rows.length;
  clearImport();
  renderAdminProductList();
  showToast(mode === "add"
    ? `Added quantities from the sheet to ${total} item${total === 1 ? "" : "s"} 📈`
    : `Stock updated from the sheet — ${changed} of ${total} item${total === 1 ? "" : "s"} changed ✅`);
  renderLowStockWarning(afterState);
}

/** After a bulk apply, flags any item that ended up out of stock or at/below
    LOW_STOCK_THRESHOLD, so a sheet update doesn't quietly leave something
    unavailable without anyone noticing. */
function renderLowStockWarning(afterState){
  const box = document.getElementById("importResult");
  if(!box) return;
  const threshold = typeof LOW_STOCK_THRESHOLD === "number" ? LOW_STOCK_THRESHOLD : 10;
  const out = afterState.filter(s => s.qty === 0);
  const low = afterState.filter(s => s.qty > 0 && s.qty <= threshold);
  if(!out.length && !low.length) return; // everything is comfortably stocked

  const itemLine = s => `<li>${escapeHtml(s.product.name)} — <strong>${s.qty}</strong> left</li>`;

  box.innerHTML = `
    <div class="import-unmatched">
      ${out.length ? `<strong>🔴 ${out.length} item${out.length === 1 ? "" : "s"} now Out of Stock</strong>
      <ul>${out.map(itemLine).join("")}</ul>` : ""}
      ${low.length ? `<strong style="${out.length ? "display:block; margin-top:10px;" : ""}">🟠 ${low.length} item${low.length === 1 ? "" : "s"} running low (${threshold} or fewer left)</strong>
      <ul>${low.map(itemLine).join("")}</ul>` : ""}
    </div>`;
  box.style.display = "block";
}

function handleStockFile(file){
  if(!file) return;
  if(typeof XLSX === "undefined"){
    showToast("The spreadsheet reader didn't load. Check your internet connection and reload the page.");
    return;
  }
  if(!/\.(xlsx|xlsm|xls|csv)$/i.test(file.name)){
    showToast("Please upload an .xlsx, .xls or .csv file.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = importParseStockWorkbook(new Uint8Array(reader.result));
      pendingImport = {
        ...parsed,
        fileName: file.name,
        autoCreatedIds: parsed.rows.filter(r => r.autoCreated).map(r => r.product.id),
      };
      renderImportPreview();
      showToast(`Read ${parsed.rows.length} item${parsed.rows.length === 1 ? "" : "s"} — check the preview, then apply.`);
    } catch(err){
      console.error("Stock import failed:", err);
      clearImport();
      showToast(err && err.message ? err.message : "Couldn't read that file. Please check it's a valid Excel or CSV sheet.");
    }
  };
  reader.onerror = () => showToast("Couldn't read that file. Please try again.");
  reader.readAsArrayBuffer(file);
}

document.addEventListener("DOMContentLoaded", () => {
  /* ---------- Login gate ---------- */
  const bulkGate = setupAdminGate({
    onUnlock: () => {
      renderAdminProductList();
      const nameEl = document.getElementById("topbarName");
      if(nameEl) nameEl.textContent = getAdminName();
    },
  });

  const lockBtn = document.getElementById("lockAdminBtn");
  if(lockBtn && bulkGate){
    lockBtn.addEventListener("click", () => {
      lockAdmin();
      clearImport(true);
      bulkGate.showGate();
      showToast("Panel locked. 🔒");
    });
  }

  const downloadProductsBtn = document.getElementById("downloadProductsBtn");
  if(downloadProductsBtn){
    downloadProductsBtn.addEventListener("click", () => {
      const snippet = typeof buildCustomProductsSnippet === "function" ? buildCustomProductsSnippet() : "";
      if(!snippet){
        showToast("No new products added from a sheet yet on this browser.");
        return;
      }
      downloadTextFile("new-products.js", `/* Paste these entries into the PRODUCTS array in js/data.js, set the real price, then remove them from here. */\n\n${snippet}\n`, "text/javascript");
      showToast("Downloaded new-products.js — copy the entries into js/data.js on your hosting.");
    });
  }

  /* ---------- Excel upload: click, keyboard and drag-and-drop ---------- */
  const dropZone = document.getElementById("stockDropZone");
  const fileInput = document.getElementById("stockFileInput");
  if(dropZone && fileInput){
    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){ e.preventDefault(); fileInput.click(); }
    });
    fileInput.addEventListener("change", () => handleStockFile(fileInput.files[0]));

    ["dragenter", "dragover"].forEach(evt => {
      dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZone.classList.add("dragging");
      });
    });
    ["dragleave", "dragend"].forEach(evt => {
      dropZone.addEventListener(evt, () => dropZone.classList.remove("dragging"));
    });
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragging");
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      handleStockFile(file);
    });

    // Stop the browser opening a file dropped anywhere else on the page.
    ["dragover", "drop"].forEach(evt => {
      window.addEventListener(evt, (e) => {
        if(!dropZone.contains(e.target)) e.preventDefault();
      });
    });
  }
});