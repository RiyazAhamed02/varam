/* =========================================================
   Cart / Orders page — cart list, customer form, place order
   ========================================================= */

const FREE_DELIVERY_THRESHOLD = 999;
const DELIVERY_CHARGE = 49;

function getCartWithProducts(){
  return getCart()
    .map(it => {
      const product = PRODUCTS.find(p => p.id === it.id);
      if(!product) return null;
      return { ...product, qty: it.qty, subtotal: product.price * it.qty };
    })
    .filter(Boolean);
}

function computeTotals(items){
  const totalAmount = items.reduce((sum, it) => sum + it.subtotal, 0);
  const delivery = totalAmount === 0 ? 0 : (totalAmount >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE);
  const grandTotal = totalAmount + delivery;
  return { totalAmount, delivery, grandTotal };
}

function renderCart(){
  const listEl = document.getElementById("cartList");
  const emptyEl = document.getElementById("cartEmpty");
  const summaryEl = document.getElementById("cartSummary");
  const items = getCartWithProducts();

  if(items.length === 0){
    listEl.innerHTML = "";
    listEl.style.display = "none";
    emptyEl.style.display = "block";
    summaryEl.style.display = "none";
  } else {
    emptyEl.style.display = "none";
    listEl.style.display = "block";
    summaryEl.style.display = "block";

    listEl.innerHTML = items.map(it => {
      const outOfStock = typeof isInStock === "function" && !isInStock(it.id);
      return `
      <div class="cart-item">
        <div class="media">${it.image
          ? `<img src="${it.image}" alt="${it.name}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${it.icon}'}))">`
          : `<span>${it.icon}</span>`
        }</div>
        <div class="info">
          <h4>${it.name}</h4>
          <div class="unit-price">₹${it.price} × ${it.qty} ${it.unit}</div>
          ${outOfStock ? `<div class="cart-item-warning">⚠️ Now out of stock — please remove before ordering</div>` : ""}
        </div>
        <div class="subtotal">₹${it.subtotal}</div>
        <button class="remove-btn" data-id="${it.id}" title="Remove">✕</button>
      </div>
    `;
    }).join("");

    listEl.querySelectorAll(".remove-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const cart = getCart().filter(it => it.id !== btn.dataset.id);
        saveCart(cart);
        renderCart();
      });
    });
  }

  const { totalAmount, delivery, grandTotal } = computeTotals(items);
  document.getElementById("sumItems").textContent = items.reduce((s,i)=>s+i.qty,0);
  document.getElementById("sumSubtotal").textContent = `₹${totalAmount}`;
  document.getElementById("sumDelivery").textContent = delivery === 0 ? "FREE" : `₹${delivery}`;
  document.getElementById("sumGrandTotal").textContent = `₹${grandTotal}`;

  // Sync into the order form (auto-filled, based on what customer chose)
  document.getElementById("totalAmount").value = totalAmount;
  document.getElementById("grandTotal").value = grandTotal;

  document.getElementById("submitOrderBtn").disabled = items.length === 0;
}

function buildOrderText(order, items){
  const lines = items.map(it => `• ${it.name} x${it.qty} = ₹${it.subtotal}`).join("\n");
  return `New Order from ${order.name}\nMobile: ${order.mobile}\nAddress: ${order.address}, ${order.state}\n\nItems:\n${lines}\n\nTotal Amount: ₹${order.totalAmount}\nGrand Total: ₹${order.grandTotal}`;
}

document.addEventListener("DOMContentLoaded", () => {
  renderCart();

  const form = document.getElementById("orderForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const items = getCartWithProducts();
    if(items.length === 0){
      showToast("Your cart is empty. Please add products first.");
      return;
    }

    const outOfStockItem = items.find(it => typeof isInStock === "function" && !isInStock(it.id));
    if(outOfStockItem){
      showToast(`${outOfStockItem.name} is out of stock — please remove it from your cart first.`);
      return;
    }

    const name = document.getElementById("custName");
    const mobile = document.getElementById("custMobile");
    const address = document.getElementById("custAddress");
    const state = document.getElementById("custState");

    let ok = true;
    ok = validateField(name, name.value.trim().length > 1) && ok;
    ok = validateField(mobile, /^\d{10}$/.test(mobile.value.trim())) && ok;
    ok = validateField(address, address.value.trim().length > 4) && ok;
    ok = validateField(state, state.value !== "") && ok;

    if(!ok){
      showToast("Please fill all customer details correctly.");
      return;
    }

    const { totalAmount, grandTotal } = computeTotals(items);
    const order = {
      name: name.value.trim(),
      mobile: mobile.value.trim(),
      address: address.value.trim(),
      state: state.value,
      totalAmount,
      grandTotal,
    };

    // Open WhatsApp with the full order summary.
    // window.open must run in the same tick as the click, or popup blockers kill it.
    const waText = encodeURIComponent(buildOrderText(order, items));
    const waUrl = `https://wa.me/${SITE.whatsapp}?text=${waText}`;
    const opened = window.open(waUrl, "_blank", "noopener");
    if(!opened) window.location.href = waUrl;

    showToast("Order placed! Sending it to us on WhatsApp 🎉");

    saveCart([]);
    renderCart();
    form.reset();
  });
});
