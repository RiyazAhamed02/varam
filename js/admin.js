/* =========================================================
   Admin page (admin.html) — profile, settings, add stock,
   and the per-item stock list.

   Shared helpers (login gate, password/profile storage, the
   stock list renderer) live in admin-core.js, which this page
   and bulk-stock.html both load.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  /* ---------- Profile ---------- */
  function renderProfile(){
    const name = getAdminName();
    const topbarName = document.getElementById("topbarName");
    const nameLabel = document.getElementById("profileNameLabel");
    const avatar = document.getElementById("profileAvatar");
    const nameInput = document.getElementById("profileNameInput");
    if(topbarName) topbarName.textContent = name;
    if(nameLabel) nameLabel.textContent = name;
    if(avatar) avatar.textContent = initialsFor(name);
    if(nameInput) nameInput.value = name;
  }

  /* ---------- Popover open / close ---------- */
  const popovers = [
    { btn: document.getElementById("profileBtn"),  pop: document.getElementById("profilePopover") },
    { btn: document.getElementById("settingsBtn"), pop: document.getElementById("settingsPopover") },
  ].filter(p => p.btn && p.pop);

  function closePopovers(){
    popovers.forEach(({ btn, pop }) => {
      pop.classList.remove("open");
      btn.classList.remove("active");
      btn.setAttribute("aria-expanded", "false");
    });
  }

  popovers.forEach(({ btn, pop }) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const wasOpen = pop.classList.contains("open");
      closePopovers();
      if(!wasOpen){
        pop.classList.add("open");
        btn.classList.add("active");
        btn.setAttribute("aria-expanded", "true");
        const first = pop.querySelector("input");
        if(first) first.focus();
      }
    });
    pop.addEventListener("click", (e) => e.stopPropagation());
  });

  if(popovers.length){
    document.addEventListener("click", closePopovers);
    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape") closePopovers();
    });
  }

  const saveProfileBtn = document.getElementById("saveProfileBtn");
  if(saveProfileBtn){
    saveProfileBtn.addEventListener("click", () => {
      const input = document.getElementById("profileNameInput");
      const name = input.value.trim();
      if(name.length < 2){
        showToast("Please enter a name with at least 2 characters.");
        input.focus();
        return;
      }
      setAdminName(name);
      renderProfile();
      closePopovers();
      showToast(`Profile name saved — welcome, ${name}! 👋`);
    });
  }

  /* ---------- Settings: change admin password ---------- */
  const newPw = document.getElementById("newPw");
  const pwStrength = document.getElementById("pwStrength");
  if(newPw && pwStrength){
    newPw.addEventListener("input", () => {
      if(!newPw.value){ pwStrength.textContent = ""; pwStrength.className = "pw-strength"; return; }
      const r = ratePassword(newPw.value);
      pwStrength.textContent = r.text;
      pwStrength.className = `pw-strength ${r.cls}`;
    });
  }

  const changePwBtn = document.getElementById("changePwBtn");
  if(changePwBtn){
    changePwBtn.addEventListener("click", () => {
      const cur = document.getElementById("currentPw");
      const nw = document.getElementById("newPw");
      const cf = document.getElementById("confirmPw");
      const err = document.getElementById("pwError");

      const fail = (msg, field) => {
        err.textContent = msg;
        err.style.display = "block";
        if(field) field.focus();
      };
      err.style.display = "none";

      if(cur.value !== getAdminPassword()) return fail("Current password is incorrect.", cur);
      if(nw.value.length < 6) return fail("New password must be at least 6 characters.", nw);
      if(nw.value === cur.value) return fail("New password must be different from the current one.", nw);
      if(nw.value !== cf.value) return fail("The two new passwords don't match.", cf);

      setAdminPassword(nw.value);
      cur.value = nw.value = cf.value = "";
      pwStrength.textContent = "";
      pwStrength.className = "pw-strength";
      resetPasswordToggles(document.getElementById("settingsPopover"));
      closePopovers();
      showToast("Admin password updated ✅ Download admin-config.js to apply it on other devices.");
    });

    document.querySelectorAll("#settingsPopover input").forEach(input => {
      input.addEventListener("keydown", (e) => {
        if(e.key === "Enter"){ e.preventDefault(); changePwBtn.click(); }
      });
    });
  }

  const downloadConfigBtn = document.getElementById("downloadConfigBtn");
  if(downloadConfigBtn){
    downloadConfigBtn.addEventListener("click", () => {
      downloadTextFile("admin-config.js", buildAdminConfigContents(), "text/javascript");
      showToast("Downloaded admin-config.js — replace js/admin-config.js on your hosting.");
    });
  }

  /* ---------- Login gate ---------- */
  const adminGate = setupAdminGate({
    onUnlock: () => {
      populateItemSelect();
      renderAdminProductList();
      renderProfile();
    },
  });

  const lockAdminBtn = document.getElementById("lockAdminBtn");
  if(lockAdminBtn && adminGate){
    lockAdminBtn.addEventListener("click", () => {
      lockAdmin();
      closePopovers();
      adminGate.showGate();
      showToast("Panel locked. 🔒");
    });
  }

  const addStockForm = document.getElementById("addStockForm");
  if(addStockForm){
    addStockForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const id = document.getElementById("stockItemSelect").value;
      const qtyInput = document.getElementById("stockQtyInput");
      const qty = parseInt(qtyInput.value) || 0;
      if(qty <= 0){
        showToast("Enter a quantity greater than 0.");
        return;
      }
      const newQty = addStockQty(id, qty);
      const product = PRODUCTS.find(p => p.id === id);
      renderAdminProductList();
      showToast(`Added ${qty} units to ${product.name}. New stock: ${newQty}.`);
      qtyInput.value = 1;
      qtyInput.dispatchEvent(new Event("input"));
    });
  }

  // +/- stepper for the Add Stock quantity field
  const stockQtyStepper = document.getElementById("stockQtyStepper");
  if(stockQtyStepper){
    const input = document.getElementById("stockQtyInput");
    const minus = stockQtyStepper.querySelector(".qty-minus");
    const sync = () => {
      let v = parseInt(input.value);
      if(isNaN(v) || v < 1) v = 1;
      input.value = v;
      minus.disabled = v <= 1;
    };
    stockQtyStepper.querySelectorAll(".qty-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        input.value = (parseInt(input.value) || 1) + (btn.classList.contains("qty-plus") ? 1 : -1);
        sync();
      });
    });
    input.addEventListener("input", sync);
    sync();
  }
});