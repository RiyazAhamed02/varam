/* =========================================================
   Varam Crackers — Shared Site Behaviour
   (header, footer, whatsapp float, cart badge, hero animation)
   ========================================================= */

const SITE = {
  brand: "Varam Crackers",
  whatsapp: "918489351529", // country code 91 + the 10-digit mobile
  email: "hello@varamcrackers.example",
  phone: "+91 8489351529",
  address: "Sivakasi, Tamil Nadu, India",
  cartKey: "fw_cart",       // current cart in progress
  ordersKey: "fw_orders",   // history of submitted orders (for export-all, optional use)
};

/* ---------- CART HELPERS (shared by products.js & cart.js) ---------- */
function getCart(){
  try{ return JSON.parse(localStorage.getItem(SITE.cartKey)) || []; }
  catch(e){ return []; }
}
function saveCart(cart){
  localStorage.setItem(SITE.cartKey, JSON.stringify(cart));
  updateCartCount();
}
function cartItemCount(){
  return getCart().reduce((sum, it) => sum + it.qty, 0);
}
function updateCartCount(){
  const n = cartItemCount();
  document.querySelectorAll(".cart-badge").forEach(el => {
    el.textContent = n;
    el.style.display = n > 0 ? "inline-flex" : "none";
  });
}

/* ---------- FORM VALIDATION HELPER ---------- */
function validateField(input, condition){
  if(condition){
    input.classList.remove("invalid");
    return true;
  } else {
    input.classList.add("invalid");
    return false;
  }
}

/* ---------- TOAST ---------- */
function showToast(message){
  let toast = document.querySelector(".toast");
  if(!toast){
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

/* ---------- HEADER / FOOTER / WHATSAPP INJECTION ---------- */
function renderHeader(activePage){
  const el = document.getElementById("site-header");
  if(!el) return;
  const links = [
    ["index.html", "Home"],
    ["about.html", "About"],
    ["products.html", "Products"],
    ["cart.html", "Cart / Orders"],
    ["contact.html", "Contact"],
  ];
  const navHtml = links.map(([href, label]) => {
    const isActive = activePage === href ? " active" : "";
    if(href === "cart.html"){
      return `<a href="${href}" class="${isActive.trim()} cart-link">${label} <span class="cart-badge">0</span></a>`;
    }
    return `<a href="${href}" class="${isActive.trim()}">${label}</a>`;
  }).join("");

  const waHref = `https://wa.me/${SITE.whatsapp}?text=` +
    encodeURIComponent("Hi! I'd like to place an order with Varam Crackers.");

  el.innerHTML = `
    <div class="header-inner">
      <a href="index.html" class="brand">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 40 40" fill="none">
            <path d="M20 5 L23.6 15.4 L34.5 15.4 L25.7 21.8 L29.1 32.2 L20 25.8 L10.9 32.2 L14.3 21.8 L5.5 15.4 L16.4 15.4 Z"
                  fill="currentColor"/>
          </svg>
        </span>
        <span class="brand-text">
          <span class="brand-name">Varam <em>Crackers</em></span>
          <small>Sivakasi</small>
        </span>
      </a>
      <nav class="nav-links" id="navLinks">${navHtml}</nav>
      <a class="header-cta" href="${waHref}" target="_blank" rel="noopener">
        <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16.001 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.258.593 4.45 1.72 6.383L3.2 28.8l6.59-1.688a12.74 12.74 0 0 0 6.211 1.61h.005c7.06 0 12.8-5.74 12.8-12.8s-5.74-12.72-12.805-12.72zm0 23.36a10.5 10.5 0 0 1-5.35-1.47l-.384-.228-3.91 1.002 1.043-3.812-.25-.393a10.46 10.46 0 0 1-1.61-5.578c0-5.81 4.73-10.54 10.55-10.54 5.81 0 10.54 4.73 10.54 10.55 0 5.81-4.73 10.47-10.63 10.47zm5.79-7.86c-.317-.159-1.877-.926-2.168-1.033-.29-.106-.502-.159-.714.16-.211.317-.819 1.032-1.005 1.244-.185.211-.37.238-.687.08-.317-.16-1.338-.494-2.548-1.575-.942-.84-1.578-1.877-1.763-2.194-.185-.317-.02-.489.139-.647.143-.142.317-.37.476-.556.16-.185.211-.317.317-.529.106-.211.053-.397-.026-.556-.08-.16-.714-1.72-.978-2.355-.257-.617-.519-.534-.714-.544l-.608-.011c-.211 0-.556.08-.847.397-.29.317-1.111 1.086-1.111 2.65 0 1.563 1.138 3.073 1.296 3.285.159.211 2.238 3.417 5.424 4.792.758.327 1.35.522 1.812.668.761.242 1.454.208 2.002.126.611-.091 1.877-.767 2.142-1.508.264-.741.264-1.376.185-1.508-.08-.132-.29-.211-.608-.37z"/></svg>
        <span>Order via WhatsApp</span>
      </a>
      <button class="nav-toggle" id="navToggle" aria-label="Toggle menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  `;

  const toggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");
  toggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    toggle.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // shrink / solidify the header once the page is scrolled
  const onScroll = () => el.classList.toggle("scrolled", window.scrollY > 30);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function renderFooter(){
  const el = document.getElementById("site-footer");
  if(!el) return;
  const year = new Date().getFullYear();
  el.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div>
          <h4>${SITE.brand}</h4>
          <p>Premium quality crackers &amp; fireworks for every festival, wedding and celebration. 100% licensed and safety-tested products.</p>
          <div class="social-row">
            <a href="https://wa.me/${SITE.whatsapp}" target="_blank" rel="noopener">📱</a>
            <a href="#">📘</a>
            <a href="#">📸</a>
          </div>
        </div>
        <div>
          <h4>Quick Links</h4>
          <p><a href="index.html">Home</a></p>
          <p><a href="about.html">About Us</a></p>
          <p><a href="products.html">Products</a></p>
          <p><a href="cart.html">Cart / Orders</a></p>
          <p><a href="contact.html">Contact</a></p>
        </div>
        <div>
          <h4>Categories</h4>
          <p>Sparklers</p>
          <p>Flower Pots</p>
          <p>Rockets &amp; Chakras</p>
          <p>Aerial Shots</p>
          <p>Gift Boxes</p>
        </div>
        <div>
          <h4>Contact</h4>
          <p>📍 ${SITE.address}</p>
          <p>📞 ${SITE.phone}</p>
          <p>✉️ ${SITE.email}</p>
        </div>
      </div>
      <div class="footer-bottom">
        © ${year} ${SITE.brand}. All rights reserved. · Fireworks are age-restricted — please use responsibly and follow local regulations.<br>
        Product photos: Wikimedia Commons contributors (Creative Commons / public domain) — representative category images, not exact inventory photos.<br>
        <a href="admin.html" class="admin-footer-link">Admin</a>
      </div>
    </div>
  `;
}

function renderWhatsAppFloat(message){
  const el = document.getElementById("whatsapp-float");
  if(!el) return;
  const text = encodeURIComponent(message || "Hi! I'd like to enquire about your fireworks products.");
  el.innerHTML = `
    <a class="wa-float" href="https://wa.me/${SITE.whatsapp}?text=${text}" target="_blank" rel="noopener">
      <svg viewBox="0 0 32 32" fill="currentColor"><path d="M16.001 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.258.593 4.45 1.72 6.383L3.2 28.8l6.59-1.688a12.74 12.74 0 0 0 6.211 1.61h.005c7.06 0 12.8-5.74 12.8-12.8s-5.74-12.72-12.805-12.72zm0 23.36a10.5 10.5 0 0 1-5.35-1.47l-.384-.228-3.91 1.002 1.043-3.812-.25-.393a10.46 10.46 0 0 1-1.61-5.578c0-5.81 4.73-10.54 10.55-10.54 5.81 0 10.54 4.73 10.54 10.55 0 5.81-4.73 10.47-10.63 10.47zm5.79-7.86c-.317-.159-1.877-.926-2.168-1.033-.29-.106-.502-.159-.714.16-.211.317-.819 1.032-1.005 1.244-.185.211-.37.238-.687.08-.317-.16-1.338-.494-2.548-1.575-.942-.84-1.578-1.877-1.763-2.194-.185-.317-.02-.489.139-.647.143-.142.317-.37.476-.556.16-.185.211-.317.317-.529.106-.211.053-.397-.026-.556-.08-.16-.714-1.72-.978-2.355-.257-.617-.519-.534-.714-.544l-.608-.011c-.211 0-.556.08-.847.397-.29.317-1.111 1.086-1.111 2.65 0 1.563 1.138 3.073 1.296 3.285.159.211 2.238 3.417 5.424 4.792.758.327 1.35.522 1.812.668.761.242 1.454.208 2.002.126.611-.091 1.877-.767 2.142-1.508.264-.741.264-1.376.185-1.508-.08-.132-.29-.211-.608-.37z"/></svg>
      <span>Enquire on WhatsApp</span>
    </a>
  `;
}

function initSharedUI(activePage, waMessage){
  renderHeader(activePage);
  renderFooter();
  renderWhatsAppFloat(waMessage);
  updateCartCount();
  initPasswordToggles();
}

/* ---------- SHOW / HIDE PASSWORD (eye icon) ----------
   Any <button class="pw-toggle" data-target="inputId"> gets the eye
   icons injected and wired up. Works on every page. */
const EYE_ON_SVG = `<svg class="eye-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.2 12S5.8 5.5 12 5.5 21.8 12 21.8 12 18.2 18.5 12 18.5 2.2 12 2.2 12z"></path><circle cx="12" cy="12" r="3.1"></circle></svg>`;
const EYE_OFF_SVG = `<svg class="eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.9 5.8A8.9 8.9 0 0 1 12 5.5c6.2 0 9.8 6.5 9.8 6.5a17 17 0 0 1-2.5 3.4M6.4 7.5A17.2 17.2 0 0 0 2.2 12S5.8 18.5 12 18.5c1.6 0 3-.4 4.2-1"></path><path d="M10 10a2.9 2.9 0 0 0 4 4"></path><line x1="3.5" y1="3.5" x2="20.5" y2="20.5"></line></svg>`;

function initPasswordToggles(){
  document.querySelectorAll(".pw-toggle").forEach(btn => {
    if(btn.dataset.pwReady === "yes") return;
    btn.dataset.pwReady = "yes";
    btn.innerHTML = EYE_ON_SVG + EYE_OFF_SVG;

    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      if(!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.classList.toggle("showing", show);
      btn.setAttribute("aria-pressed", show ? "true" : "false");
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      btn.title = show ? "Hide password" : "Show password";
      input.focus();
      // keep the caret at the end rather than jumping to the start
      const len = input.value.length;
      try{ input.setSelectionRange(len, len); } catch(e){ /* ignore */ }
    });
  });
}

/** Force any revealed password field back to hidden (call after a form resets). */
function resetPasswordToggles(scope){
  (scope || document).querySelectorAll(".pw-toggle.showing").forEach(btn => {
    const input = document.getElementById(btn.dataset.target);
    if(input) input.type = "password";
    btn.classList.remove("showing");
    btn.setAttribute("aria-pressed", "false");
    btn.setAttribute("aria-label", "Show password");
  });
}

/* ---------- HERO FIREWORKS CANVAS (index.html only) ----------
   A small mixed-effect show: sky shot rockets that rise & burst,
   ground-level flower pot fountains, and quick cracker blasts —
   cycling randomly for a livelier hero animation. */
function initFireworksCanvas(canvasId){
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  const ctx = canvas.getContext("2d");
  let w, h;
  function resize(){
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  const colors = ["#ffcc33","#ff7a1a","#e8492f","#fff8ee","#ffe08a","#4ade80","#60a5fa"];
  const randColor = () => colors[Math.floor(Math.random() * colors.length)];

  let particles = [];  // sparks: {x,y,vx,vy,life,decay,color,size,gravity}
  let rockets = [];     // sky shots: {x,y,vy,targetY,color,trail:[]}
  let fountains = [];   // flower pots: {x,y,timeLeft,color}
  let flashes = [];     // cracker blast flash rings: {x,y,life}

  function spawnBurst(x, y, color, count, speed){
    for(let i=0;i<count;i++){
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.25;
      const s = speed * 0.5 + Math.random() * speed;
      particles.push({ x, y, vx: Math.cos(angle)*s, vy: Math.sin(angle)*s, life: 1, decay: 0.012, color, size: 2.2, gravity: 0.03 });
    }
  }

  // Cracker blast: quick bright flash + a tight, fast burst
  function spawnCrackerBlast(){
    const x = w * 0.1 + Math.random() * w * 0.8;
    const y = h * 0.15 + Math.random() * h * 0.4;
    const color = randColor();
    flashes.push({ x, y, life: 1 });
    spawnBurst(x, y, color, 16, 3.4);
  }

  // Sky shot: rocket rises with a trail then bursts at its peak
  function spawnSkyRocket(){
    const x = w * 0.15 + Math.random() * w * 0.7;
    const targetY = h * 0.15 + Math.random() * h * 0.3;
    rockets.push({ x, y: h + 10, vy: -(3.6 + Math.random() * 1.4), targetY, color: randColor(), trail: [] });
  }

  // Flower pot: ground fountain spraying sparks upward for a short burst of time
  function spawnFlowerPot(){
    const x = w * 0.1 + Math.random() * w * 0.8;
    fountains.push({ x, y: h - 4, timeLeft: 55 + Math.random() * 30, color: randColor() });
  }

  let frame = 0;
  let nextEventAt = 30;

  function loop(){
    ctx.clearRect(0, 0, w, h);
    frame++;

    if(frame >= nextEventAt){
      const pick = Math.random();
      if(pick < 0.3) spawnCrackerBlast();
      else if(pick < 0.65) spawnSkyRocket();
      else spawnFlowerPot();
      nextEventAt = frame + 45 + Math.random() * 45;
    }

    // Cracker blast flash rings
    flashes.forEach(f => {
      ctx.globalAlpha = f.life * 0.45;
      ctx.fillStyle = "#fff8ee";
      ctx.beginPath();
      ctx.arc(f.x, f.y, 42 * (1 - f.life) + 8, 0, Math.PI * 2);
      ctx.fill();
      f.life -= 0.16;
    });
    flashes = flashes.filter(f => f.life > 0);

    // Sky shot rockets: draw rising trail, burst at target height
    rockets.forEach(r => {
      r.trail.push({ x: r.x, y: r.y, life: 1 });
      r.y += r.vy;
      if(r.y <= r.targetY){
        spawnBurst(r.x, r.y, r.color, 32, 2.4);
        r.done = true;
      }
    });
    rockets.forEach(r => {
      r.trail.forEach(t => {
        ctx.globalAlpha = t.life * 0.8;
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
        t.life -= 0.09;
      });
      r.trail = r.trail.filter(t => t.life > 0);
    });
    rockets = rockets.filter(r => !r.done || r.trail.length > 0);

    // Flower pot fountains: continuous upward spray from a ground point
    fountains.forEach(fp => {
      fp.timeLeft--;
      for(let i=0;i<2;i++){
        const angle = -Math.PI/2 + (Math.random() - 0.5) * 0.9;
        const speed = 2 + Math.random() * 2.4;
        particles.push({
          x: fp.x, y: fp.y,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: 1, decay: 0.02, color: fp.color, size: 1.8, gravity: 0.09
        });
      }
    });
    fountains = fountains.filter(fp => fp.timeLeft > 0);

    // Update & draw all sparks
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life -= p.decay;
    });
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
});

/* =========================================================
   HOME PAGE — CREATIVE / ANIMATED BEHAVIOUR
   All effects are progressive enhancement: if JS fails or
   the user prefers reduced motion, content stays visible.
   ========================================================= */

const PREFERS_REDUCED_MOTION =
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- 1. SCROLL REVEAL ---------- */
function initScrollReveal(){
  const items = document.querySelectorAll("[data-reveal]");
  if(!items.length) return;

  if(PREFERS_REDUCED_MOTION || !("IntersectionObserver" in window)){
    items.forEach(el => el.classList.add("revealed"));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add("revealed");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });

  items.forEach(el => io.observe(el));
}

/* ---------- 2. ANIMATED NUMBER COUNTERS ---------- */
function animateCounter(el){
  const raw = el.dataset.count || el.textContent;
  const target = parseFloat(String(raw).replace(/[^\d.]/g, "")) || 0;
  const suffix = el.dataset.suffix || "";
  const prefix = el.dataset.prefix || "";

  if(PREFERS_REDUCED_MOTION){
    el.textContent = prefix + target + suffix;
    return;
  }

  const duration = 1600;
  const start = performance.now();
  function tick(now){
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);         // easeOutCubic
    const val = Math.round(target * eased);
    el.textContent = prefix + val.toLocaleString("en-IN") + suffix;
    if(p < 1) requestAnimationFrame(tick);
  }
  el.textContent = prefix + "0" + suffix;
  requestAnimationFrame(tick);
}

function initCounters(){
  const nums = document.querySelectorAll("[data-count]");
  if(!nums.length) return;
  if(!("IntersectionObserver" in window)){
    nums.forEach(animateCounter);
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        animateCounter(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  nums.forEach(n => io.observe(n));
}

/* ---------- 3. ROTATING HEADLINE WORD ---------- */
function initWordRotator(selector, words, interval){
  const box = document.querySelector(selector);
  if(!box || !words || !words.length) return;

  box.innerHTML = words.map((w, i) =>
    `<span class="${i === 0 ? "on" : ""}">${w}</span>`
  ).join("");

  if(PREFERS_REDUCED_MOTION || words.length < 2) return;

  const spans = box.querySelectorAll("span");
  let idx = 0;
  setInterval(() => {
    const current = spans[idx];
    idx = (idx + 1) % spans.length;
    const next = spans[idx];
    current.classList.remove("on");
    current.classList.add("out");
    next.classList.remove("out");
    next.classList.add("on");
    setTimeout(() => current.classList.remove("out"), 600);
  }, interval || 2600);
}

/* ---------- 4. POINTER-FOLLOW GLOW + 3D TILT ---------- */
function initTiltCards(selector){
  if(PREFERS_REDUCED_MOTION) return;
  document.querySelectorAll(selector).forEach(card => {

    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;

      // glow position
      card.style.setProperty("--mx", x + "px");
      card.style.setProperty("--my", y + "px");

      // tilt
      if(card.classList.contains("tilt")){
        const rx = ((y / r.height) - 0.5) * -9;
        const ry = ((x / r.width) - 0.5) * 9;
        card.style.transform =
          `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
      }
    });

    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
}

/* ---------- 5. SCROLL PROGRESS BAR ---------- */
function initScrollProgress(){
  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  document.body.appendChild(bar);

  let ticking = false;
  function update(){
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
    bar.style.width = pct + "%";
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if(!ticking){ requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
}

/* ---------- 6. BACK TO TOP ---------- */
function initBackToTop(){
  const btn = document.createElement("button");
  btn.className = "to-top";
  btn.type = "button";
  btn.setAttribute("aria-label", "Back to top");
  btn.innerHTML = "↑";
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: PREFERS_REDUCED_MOTION ? "auto" : "smooth" });
  });
  document.body.appendChild(btn);

  window.addEventListener("scroll", () => {
    btn.classList.toggle("show", window.scrollY > 520);
  }, { passive: true });
}

/* ---------- 7. FLOATING DECORATIVE EMOJI ---------- */
function initFloaties(selector, symbols, count){
  if(PREFERS_REDUCED_MOTION) return;
  const host = document.querySelector(selector);
  if(!host) return;
  const list = symbols || ["✨","🎆","🧨","🎇","⭐"];
  const n = count || 14;
  let html = "";
  for(let i = 0; i < n; i++){
    const left  = Math.random() * 100;
    const dur   = 12 + Math.random() * 14;
    const delay = -Math.random() * 20;
    const size  = 0.9 + Math.random() * 1.4;
    const sym   = list[Math.floor(Math.random() * list.length)];
    html += `<i style="left:${left}%;font-size:${size}rem;animation-duration:${dur}s;animation-delay:${delay}s">${sym}</i>`;
  }
  host.innerHTML = html;
}

/* ---------- 8. HERO PARALLAX ---------- */
function initHeroParallax(selector){
  if(PREFERS_REDUCED_MOTION) return;
  const el = document.querySelector(selector);
  if(!el) return;
  let ticking = false;
  window.addEventListener("scroll", () => {
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if(y < window.innerHeight){
        el.style.transform = `translateY(${y * 0.22}px)`;
        el.style.opacity = String(Math.max(1 - y / (window.innerHeight * 0.85), 0));
      }
      ticking = false;
    });
  }, { passive: true });
}

/* ---------- 9. MARQUEE (duplicate content for seamless loop) ---------- */
function initMarquee(selector){
  const track = document.querySelector(selector);
  if(!track || track.dataset.cloned === "yes") return;
  track.dataset.cloned = "yes";
  track.innerHTML = track.innerHTML + track.innerHTML;
}

/* ---------- MASTER INIT FOR THE HOME PAGE ---------- */
function initHomeAnimations(){
  initScrollReveal();
  initCounters();
  initScrollProgress();
  initBackToTop();
  initMarquee(".marquee-track");
  initFloaties(".floaties");
  initHeroParallax(".hero-content");
  initTiltCards(".glow-card");
  initWordRotator("#heroRotator", ["Celebration", "Diwali Night", "Wedding", "Festival", "Big Moment"], 2600);
}

/* =========================================================
   HERO BANNER CAROUSEL (home page)
   Slides are composed entirely in CSS/SVG — no image files.
   Supports autoplay, arrows, dots, keyboard and swipe.
   ========================================================= */
function initHeroCarousel(rootSelector, options){
  const root = document.querySelector(rootSelector);
  if(!root) return;

  const slides = Array.from(root.querySelectorAll(".banner-slide"));
  if(slides.length < 1) return;

  const opts     = options || {};
  const interval = opts.interval || 6000;
  const dotsWrap = root.querySelector(".banner-dots");
  const prevBtn  = root.querySelector(".banner-arrow.prev");
  const nextBtn  = root.querySelector(".banner-arrow.next");

  let index = 0;
  let timer = null;

  /* ---- dots ---- */
  if(dotsWrap){
    dotsWrap.innerHTML = slides.map((_, i) =>
      `<button type="button" class="banner-dot${i === 0 ? " active" : ""}"
               aria-label="Go to slide ${i + 1}"></button>`
    ).join("");
    dotsWrap.querySelectorAll(".banner-dot").forEach((d, i) => {
      d.addEventListener("click", () => { go(i); restart(); });
    });
  }

  function go(next){
    const total = slides.length;
    const target = (next + total) % total;
    if(target === index) return;

    slides[index].classList.remove("active");
    slides[index].classList.add("leaving");
    const leaving = slides[index];
    setTimeout(() => leaving.classList.remove("leaving"), 900);

    index = target;
    slides[index].classList.add("active");

    if(dotsWrap){
      dotsWrap.querySelectorAll(".banner-dot").forEach((d, i) =>
        d.classList.toggle("active", i === index));
    }
    root.style.setProperty("--slide-index", index);
  }

  const next  = () => go(index + 1);
  const prev  = () => go(index - 1);
  const stop  = () => { if(timer){ clearInterval(timer); timer = null; } };
  function start(){
    if(slides.length < 2) return;
    if(PREFERS_REDUCED_MOTION) return;
    stop();
    timer = setInterval(next, interval);
  }
  const restart = () => { stop(); start(); };

  if(nextBtn) nextBtn.addEventListener("click", () => { next(); restart(); });
  if(prevBtn) prevBtn.addEventListener("click", () => { prev(); restart(); });

  /* pause while hovered or when the tab is hidden */
  root.addEventListener("mouseenter", stop);
  root.addEventListener("mouseleave", start);
  document.addEventListener("visibilitychange", () => {
    document.hidden ? stop() : start();
  });

  /* keyboard */
  root.setAttribute("tabindex", "0");
  root.addEventListener("keydown", (e) => {
    if(e.key === "ArrowRight"){ next(); restart(); }
    if(e.key === "ArrowLeft"){ prev(); restart(); }
  });

  /* touch swipe */
  let startX = null;
  root.addEventListener("touchstart", (e) => {
    startX = e.changedTouches[0].clientX;
    stop();
  }, { passive: true });
  root.addEventListener("touchend", (e) => {
    if(startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if(Math.abs(dx) > 45) (dx < 0 ? next : prev)();
    startX = null;
    start();
  }, { passive: true });

  slides[0].classList.add("active");
  start();
}

/* ---------- DECORATIVE SVG FIREWORK BURSTS FOR BANNER SLIDES ----------
   Builds radial spark bursts as SVG so no image files are needed.
   Each .slide-fx gets a few bursts at randomised positions/colours. */
function buildBurstSVG(cx, cy, radius, color, spokes){
  const n = spokes || 22;
  let paths = "";
  for(let i = 0; i < n; i++){
    const a  = (Math.PI * 2 * i) / n;
    const r1 = radius * 0.16;
    const r2 = radius * (0.72 + Math.random() * 0.28);
    const x1 = cx + Math.cos(a) * r1, y1 = cy + Math.sin(a) * r1;
    const x2 = cx + Math.cos(a) * r2, y2 = cy + Math.sin(a) * r2;
    paths += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    paths += `<circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="${(1.4 + Math.random()*1.4).toFixed(1)}" stroke="none" fill="${color}"/>`;
  }
  return `<g stroke="${color}" stroke-width="1.1" stroke-linecap="round" opacity=".9">
            <circle cx="${cx}" cy="${cy}" r="${(radius*0.1).toFixed(1)}" stroke="none" fill="#fff8ee"/>
            ${paths}
          </g>`;
}

function initSlideFireworks(selector){
  const hosts = document.querySelectorAll(selector || ".slide-fx");
  if(!hosts.length) return;
  const palettes = [
    ["#ffcc33", "#ff9a3c", "#fff2c4"],
    ["#ff7a1a", "#e8492f", "#ffd873"],
    ["#ffe08a", "#60a5fa", "#ffcc33"]
  ];

  hosts.forEach((host, hi) => {
    const colors = palettes[hi % palettes.length];
    const spots  = [
      { x: 720, y: 130, r: 105 },
      { x: 900, y: 250, r: 78  },
      { x: 560, y: 210, r: 62  },
      { x: 1010,y: 120, r: 60  }
    ];
    const bursts = spots.map((s, i) => {
      const delay = (i * 1.1).toFixed(2);
      return `<g class="burst" style="--i:${i}">
                <g style="animation-delay:${delay}s">
                  ${buildBurstSVG(s.x, s.y, s.r, colors[i % colors.length], 20 + i * 2)}
                </g>
              </g>`;
    }).join("");

    host.innerHTML =
      `<svg viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${bursts}</svg>`;
  });
}
