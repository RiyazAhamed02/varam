/* =========================================================
   Customer Details Store
   Every form on the site (Order form on cart.html, Enquiry form
   on contact.html) calls saveCustomerRecord() so that ALL customer
   submissions land in ONE spreadsheet: "Customers Details.xlsx"
   (matches the file already in your FireWorks folder — same
   "Order Details" + "Items" sheet layout, just with new rows
   appended for every future submission).

   How it works:
   - In Chrome / Edge, we use the File System Access API. The first
     time, you pick (or create) Customers Details.xlsx ONCE. After
     that, every submission reads the existing file, appends new
     row(s), and writes it straight back — always the same file.
   - In browsers without that API (Safari, Firefox) we fall back to
     keeping every record in this browser's local storage and
     re-downloading one combined "Customers Details.xlsx" (with the
     full history so far) on every submission.
   ========================================================= */

const CUSTOMER_FILE_NAME = "Customers Details.xlsx";
const ORDERS_SHEET = "Order Details";
const ITEMS_SHEET = "Items";

// Matches the columns already in your existing file, plus "Source" and
// "Message" appended at the end so enquiry form-fills fit in too.
const ORDER_HEADERS = [
  "Date","Time","Source","Customer Name","Mobile Number",
  "Address","State","Total Amount (Rs)","Grand Total (Rs)","Message"
];
// Matches the existing Product/Category/Unit/Price/Qty/Subtotal columns,
// with three new leading columns so each item can be traced back to its order.
const ITEM_HEADERS = [
  "Order Date","Order Time","Customer Name",
  "Product","Category","Unit","Unit Price (Rs)","Quantity","Subtotal (Rs)"
];

const DB_NAME = "fw_customer_store";
const DB_STORE_NAME = "handles";
const HANDLE_KEY = "customerFileHandle";
const FALLBACK_KEY = "fw_customer_records_fallback"; // { orders: [...], items: [...] }

const FS_SUPPORTED = typeof window !== "undefined" && "showSaveFilePicker" in window;

function idbOpen(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGet(key){
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE_NAME, "readonly");
    const req = tx.objectStore(DB_STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbSet(key, value){
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE_NAME, "readwrite");
    tx.objectStore(DB_STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getSavedHandle(){
  if(!FS_SUPPORTED) return null;
  try{ return (await idbGet(HANDLE_KEY)) || null; }
  catch(e){ return null; }
}

async function ensurePermission(handle){
  const opts = { mode: "readwrite" };
  try{
    if((await handle.queryPermission(opts)) === "granted") return true;
    if((await handle.requestPermission(opts)) === "granted") return true;
  } catch(e){ /* ignore */ }
  return false;
}

function colsFor(headers){
  return headers.map(h => ({ wch: Math.max(14, h.length + 2) }));
}

/** One-time setup: user picks / creates Customers Details.xlsx. */
async function connectCustomerFile(){
  if(!FS_SUPPORTED){
    showToast("This browser can't link directly to a file — we'll auto-download Customers Details.xlsx (full history) on every submission instead.");
    return false;
  }
  try{
    const handle = await window.showSaveFilePicker({
      suggestedName: CUSTOMER_FILE_NAME,
      types: [{
        description: "Excel Workbook",
        accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] }
      }]
    });
    await idbSet(HANDLE_KEY, handle);
    updateCustomerFileStatus();
    showToast("Connected! Every submission now saves straight into Customers Details.xlsx ✅");
    return true;
  } catch(e){
    if(e && e.name === "AbortError") return false; // user cancelled the picker
    console.error("connectCustomerFile failed:", e);
    showToast("Couldn't link the file directly (works best in Chrome/Edge). Falling back to auto-download.");
    return false;
  }
}

async function updateCustomerFileStatus(){
  const el = document.getElementById("customerFileStatus");
  if(!el) return;
  const handle = await getSavedHandle();
  if(handle){
    el.textContent = "🟢 Connected — saving directly to Customers Details.xlsx";
    el.classList.add("connected");
  } else if(FS_SUPPORTED){
    el.textContent = "⚪ Not connected yet — click to link Customers Details.xlsx";
    el.classList.remove("connected");
  } else {
    el.textContent = "⚪ Auto-download mode (this browser doesn't support direct file saving)";
    el.classList.remove("connected");
  }
}

function orderRow(record){
  return {
    "Date": record.date,
    "Time": record.time,
    "Source": record.source || "",
    "Customer Name": record.name || "",
    "Mobile Number": record.mobile || "",
    "Address": record.address || "",
    "State": record.state || "",
    "Total Amount (Rs)": record.totalAmount ?? "",
    "Grand Total (Rs)": record.grandTotal ?? "",
    "Message": record.message || "",
  };
}

function itemRows(record){
  if(!record.items || !record.items.length) return [];
  return record.items.map(it => ({
    "Order Date": record.date,
    "Order Time": record.time,
    "Customer Name": record.name || "",
    "Product": it.name,
    "Category": it.category || "",
    "Unit": it.unit || "",
    "Unit Price (Rs)": it.price ?? "",
    "Quantity": it.qty ?? "",
    "Subtotal (Rs)": it.subtotal ?? "",
  }));
}

function buildWorkbook(orderRows, itemRowsList){
  const wb = XLSX.utils.book_new();
  const wsOrders = XLSX.utils.json_to_sheet(orderRows, { header: ORDER_HEADERS });
  wsOrders["!cols"] = colsFor(ORDER_HEADERS);
  XLSX.utils.book_append_sheet(wb, wsOrders, ORDERS_SHEET);

  const wsItems = XLSX.utils.json_to_sheet(itemRowsList, { header: ITEM_HEADERS });
  wsItems["!cols"] = colsFor(ITEM_HEADERS);
  XLSX.utils.book_append_sheet(wb, wsItems, ITEMS_SHEET);
  return wb;
}

async function appendViaFileSystem(handle, record){
  const file = await handle.getFile();
  let orderRows = [];
  let itemRowsList = [];
  if(file.size > 0){
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    if(wb.SheetNames.includes(ORDERS_SHEET)){
      orderRows = XLSX.utils.sheet_to_json(wb.Sheets[ORDERS_SHEET]);
    }
    if(wb.SheetNames.includes(ITEMS_SHEET)){
      itemRowsList = XLSX.utils.sheet_to_json(wb.Sheets[ITEMS_SHEET]);
    }
  }
  orderRows.push(orderRow(record));
  itemRowsList.push(...itemRows(record));

  const newWb = buildWorkbook(orderRows, itemRowsList);
  const arrBuf = XLSX.write(newWb, { type: "array", bookType: "xlsx" });
  const writable = await handle.createWritable();
  await writable.write(arrBuf);
  await writable.close();
}

function appendViaFallbackDownload(record){
  let store = { orders: [], items: [] };
  try{
    const raw = JSON.parse(localStorage.getItem(FALLBACK_KEY));
    if(raw && raw.orders) store = raw;
  } catch(e){ /* ignore */ }

  store.orders.push(orderRow(record));
  store.items.push(...itemRows(record));
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(store));

  const wb = buildWorkbook(store.orders, store.items);
  XLSX.writeFile(wb, CUSTOMER_FILE_NAME);
}

/** Main entry point — call this on every form submission (order or enquiry).
    record: { source, name, mobile, address, state, totalAmount, grandTotal, message, items: [{name,category,unit,price,qty,subtotal}] } */
async function saveCustomerRecord(record){
  const now = new Date();
  record.date = now.toLocaleDateString();
  record.time = now.toLocaleTimeString();

  const handle = await getSavedHandle();
  if(handle){
    const ok = await ensurePermission(handle);
    if(ok){
      try{
        await appendViaFileSystem(handle, record);
        showToast("Saved to Customers Details.xlsx ✅");
        return;
      } catch(e){
        console.error("Direct file save failed, falling back to download:", e);
      }
    }
  }
  appendViaFallbackDownload(record);
  showToast(handle
    ? "Downloaded an updated Customers Details.xlsx (direct save failed this time)."
    : "Saved locally — downloaded Customers Details.xlsx. Click 'Connect Customers Details.xlsx' in the footer to save directly next time.");
}

document.addEventListener("DOMContentLoaded", () => {
  updateCustomerFileStatus();
  document.querySelectorAll(".connect-customer-file").forEach(btn => {
    btn.addEventListener("click", connectCustomerFile);
  });
});
