/* =========================================================
   Products page — list view render, category filter, add to cart
   ========================================================= */

let activeCategory = "All";

function renderCategoryBar(){
  const bar = document.getElementById("categoryBar");
  if(!bar) return;
  bar.innerHTML = CATEGORIES.map(cat =>
    `<button class="chip ${cat === activeCategory ? "active" : ""}" data-cat="${cat}">${cat}</button>`
  ).join("");

  bar.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      activeCategory = chip.dataset.cat;
      renderCategoryBar();
      renderProductGrid();
    });
  });
}

function renderProductGrid(){
  const grid = document.getElementById("productGrid");
  if(!grid) return;
  grid.className = "product-list";
  const list = activeCategory === "All" ? PRODUCTS : PRODUCTS.filter(p => p.category === activeCategory);

  grid.innerHTML = list.map(p => {
    const inStock = typeof isInStock === "function" ? isInStock(p.id) : true;
    const stockQty = typeof getStockQty === "function" ? getStockQty(p.id) : null;
    const lowStock = inStock && stockQty !== null && stockQty <= LOW_STOCK_THRESHOLD;
    return `
    <div class="product-row ${inStock ? "" : "out-of-stock"}">
      <div class="product-row-media">
        <span class="product-tag">${p.category}</span>
        ${!inStock ? `<span class="stock-badge">Out of Stock</span>` : ""}
        ${p.image
          ? `<img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'product-fallback-icon',textContent:'${p.icon}'}))">`
          : `<span class="product-fallback-icon">${p.icon}</span>`
        }
      </div>
      <div class="product-row-body">
        <span class="product-cat">${p.category}</span>
        <h3>${p.name}</h3>
        <p class="product-desc">${p.desc}</p>
        ${lowStock ? `<p class="low-stock-note">Only ${stockQty} left in stock</p>` : ""}
      </div>
      <div class="product-row-actions">
        <div class="product-price">₹${p.price} <span>/ ${p.unit}</span></div>
        ${inStock ? `
        <div class="qty-row">
          <label class="qty-label" for="qty-${p.id}">Qty</label>
          <div class="qty-stepper">
            <button type="button" class="qty-btn qty-minus" data-id="${p.id}" aria-label="Decrease quantity">&minus;</button>
            <input type="number" min="1" ${stockQty !== null ? `max="${stockQty}"` : ""} value="1" id="qty-${p.id}" class="qty-input" inputmode="numeric">
            <button type="button" class="qty-btn qty-plus" data-id="${p.id}" aria-label="Increase quantity">+</button>
          </div>
          <button class="btn btn-primary btn-sm add-cart-btn" data-id="${p.id}">🛒 Add to Cart</button>
        </div>` : `
        <button class="btn btn-sm" disabled style="flex:1; opacity:.6; cursor:not-allowed;">Out of Stock</button>`}
      </div>
    </div>
  `;
  }).join("");

  function clampQty(input){
    let v = parseInt(input.value) || 1;
    if(v < 1) v = 1;
    const max = parseInt(input.getAttribute("max"));
    if(!isNaN(max) && v > max) v = max;
    input.value = v;
    const stepper = input.closest(".qty-stepper");
    if(stepper){
      const minus = stepper.querySelector(".qty-minus");
      const plus = stepper.querySelector(".qty-plus");
      if(minus) minus.disabled = v <= 1;
      if(plus) plus.disabled = !isNaN(max) && v >= max;
    }
    return v;
  }

  grid.querySelectorAll(".qty-input").forEach(input => {
    clampQty(input);
    input.addEventListener("change", () => clampQty(input));
    input.addEventListener("input", () => clampQty(input));
  });

  grid.querySelectorAll(".qty-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(`qty-${btn.dataset.id}`);
      if(!input) return;
      const step = btn.classList.contains("qty-plus") ? 1 : -1;
      input.value = (parseInt(input.value) || 1) + step;
      clampQty(input);
    });
  });

  grid.querySelectorAll(".add-cart-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const qtyInput = document.getElementById(`qty-${id}`);
      const qty = parseInt(qtyInput.value) || 1;
      addToCart(id, qty);
      qtyInput.value = 1;
      clampQty(qtyInput);
    });
  });
}

function addToCart(id, qty){
  const product = PRODUCTS.find(p => p.id === id);
  if(!product) return;

  if(typeof isInStock === "function" && !isInStock(id)){
    showToast(`${product.name} is currently out of stock.`);
    return;
  }

  const cart = getCart();
  const existing = cart.find(it => it.id === id);
  const alreadyInCart = existing ? existing.qty : 0;
  let message = null;

  if(typeof getStockQty === "function"){
    const available = getStockQty(id);
    if(alreadyInCart + qty > available){
      const allowedMore = Math.max(0, available - alreadyInCart);
      if(allowedMore <= 0){
        showToast(`You already have all ${available} available units of ${product.name} in your cart.`);
        return;
      }
      qty = allowedMore;
      message = `Only ${available} in stock — added ${allowedMore} × ${product.name} to your cart.`;
    }
  }

  if(existing){
    existing.qty += qty;
  } else {
    cart.push({ id, qty });
  }
  saveCart(cart);
  showToast(message || `Added ${qty} × ${product.name} to cart 🎉`);
}

document.addEventListener("DOMContentLoaded", () => {
  renderCategoryBar();
  renderProductGrid();
});