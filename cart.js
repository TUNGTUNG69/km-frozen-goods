// Cart drawer + checkout. Cart is kept in the browser; the order is saved to Firebase.
import { watchAuth, friendlyError } from "./auth-service.js";
import { placeOrder, peso } from "./products-service.js";

const KEY = "km_cart_v1";
let items = [];
let user = null;
let view = "cart";      // cart | checkout | done
let lastOrderId = "";
let busy = false;
let errorText = "";

try { items = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { items = []; }
if (!Array.isArray(items)) items = [];

function save(){
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
  const n = items.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById("cartCount");
  if (badge) { badge.textContent = n; badge.style.display = n ? "inline-block" : "none"; }
}
const total = () => items.reduce((s, i) => s + i.price * i.qty, 0);

function toast(text){
  let t = document.getElementById("kmToast");
  if (!t) { t = document.createElement("div"); t.id = "kmToast"; t.className = "km-toast"; document.body.appendChild(t); }
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2200);
}

function el(tag, props, ...kids){
  const e = document.createElement(tag);
  Object.entries(props || {}).forEach(([k, v]) => {
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  });
  kids.flat().forEach(k => { if (k != null) e.append(k); });
  return e;
}

// Build the drawer once
const overlay = el("div", { class: "cart-overlay", id: "cartOverlay" });
const drawer = el("aside", { class: "cart-drawer", id: "cartDrawer", "aria-label": "Your order", "aria-hidden": "true" });
document.body.append(overlay, drawer);
overlay.addEventListener("click", closeCart);

function openCart(){
  view = items.length ? "cart" : view === "done" ? "done" : "cart";
  errorText = "";
  render();
  overlay.classList.add("open"); drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
}
function closeCart(){
  overlay.classList.remove("open"); drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  if (view === "done") view = "cart";
}

function header(title){
  return el("div", { class: "cart-head" },
    el("h3", { text: title }),
    el("button", { type: "button", class: "cart-close", "aria-label": "Close", text: "×", onclick: closeCart }));
}

function render(){
  drawer.replaceChildren();
  if (view === "done") return renderDone();
  if (view === "checkout") return renderCheckout();
  renderCart();
}

function renderCart(){
  drawer.append(header("Your Order"));
  if (!items.length){
    drawer.append(el("div", { class: "cart-empty" },
      el("p", { text: "Your cart is empty." }),
      el("button", { type: "button", class: "btn btn-primary", text: "Browse Products", onclick: closeCart })));
    return;
  }
  const list = el("div", { class: "cart-list" });
  items.forEach(i => {
    list.append(el("div", { class: "cart-row" },
      el("div", { class: "cart-info" },
        el("strong", { text: i.name }),
        i.size ? el("span", { class: "cart-size", text: i.size }) : null,
        el("span", { class: "cart-price", text: peso(i.price) + " each" })),
      el("div", { class: "cart-qty" },
        el("button", { type: "button", "aria-label": "Decrease", text: "−", onclick: () => changeQty(i.id, i.qty - 1) }),
        el("span", { text: String(i.qty) }),
        el("button", { type: "button", "aria-label": "Increase", text: "+", onclick: () => changeQty(i.id, i.qty + 1) })),
      el("div", { class: "cart-line", text: peso(i.price * i.qty) }),
      el("button", { type: "button", class: "cart-remove", "aria-label": "Remove " + i.name, text: "Remove", onclick: () => changeQty(i.id, 0) })));
  });
  drawer.append(list,
    el("div", { class: "cart-foot" },
      el("div", { class: "cart-total" }, el("span", { text: "Total" }), el("strong", { text: peso(total()) })),
      el("button", { type: "button", class: "btn btn-primary btn-block", text: "Checkout", onclick: () => { view = "checkout"; errorText = ""; render(); } })));
}

function renderCheckout(){
  drawer.append(header("Checkout"));
  if (!user){
    drawer.append(el("div", { class: "cart-empty" },
      el("p", { text: "Please log in or create an account to place your order. Your cart will be kept." }),
      el("a", { class: "btn btn-primary", href: "login.html", text: "Log In" }),
      el("a", { class: "btn btn-ghost", href: "login.html?mode=signup", text: "Sign Up" }),
      el("button", { type: "button", class: "link-btn", text: "Back to cart", onclick: () => { view = "cart"; render(); } })));
    return;
  }
  const f = el("form", { class: "cart-form", novalidate: "" });
  const field = (label, id, type, ph, val) => [
    el("label", { for: id, text: label }),
    el("input", { class: "form-control", id, type, placeholder: ph, value: val || "" })
  ];
  const notes = el("textarea", { class: "form-control", id: "coNotes", rows: "2", placeholder: "Optional: delivery time, special requests" });
  const err = el("div", { class: "alert alert-danger", id: "coErr", style: "display:" + (errorText ? "block" : "none"), text: errorText });
  const btn = el("button", { class: "btn btn-primary btn-block", id: "coBtn", type: "submit", text: "Place Order (" + peso(total()) + ")" });
  f.append(err,
    ...field("Full Name", "coName", "text", "Juan Dela Cruz", user.displayName || ""),
    ...field("Mobile Number", "coPhone", "tel", "09XX XXX XXXX", ""),
    el("label", { for: "coAddress", text: "Delivery Address" }),
    el("textarea", { class: "form-control", id: "coAddress", rows: "2", placeholder: "House no., street, barangay, city" }),
    el("label", { for: "coNotes", text: "Notes" }), notes,
    el("p", { class: "cart-note", text: "We will contact you to confirm your order, delivery fee and payment." }),
    btn,
    el("button", { type: "button", class: "link-btn", text: "Back to cart", onclick: () => { view = "cart"; render(); } }));
  f.addEventListener("submit", submitOrder);
  drawer.append(el("div", { class: "cart-pad" },
    el("p", { class: "cart-summary", text: items.reduce((s, i) => s + i.qty, 0) + " item(s) · " + peso(total()) }), f));
}

async function submitOrder(e){
  e.preventDefault();
  if (busy) return;
  const g = (id) => document.getElementById(id);
  const name = g("coName").value.trim(), phone = g("coPhone").value.trim(), address = g("coAddress").value.trim();
  const fail = (t) => { errorText = t; const b = g("coErr"); b.textContent = t; b.style.display = "block"; };
  if (!name) return fail("Please enter your name.");
  if (phone.replace(/\D/g, "").length < 7) return fail("Please enter a valid mobile number.");
  if (address.length < 8) return fail("Please enter your delivery address.");
  busy = true;
  const btn = g("coBtn"); btn.disabled = true; btn.textContent = "Please wait...";
  try {
    lastOrderId = await placeOrder({
      uid: user.uid, customerName: name, customerEmail: user.email || "", phone, address,
      notes: g("coNotes").value.trim(),
      items: items.map(i => ({ id: i.id, name: i.name, size: i.size || "", price: i.price, qty: i.qty })),
      total: total()
    });
    items = []; save();
    view = "done"; render();
  } catch (err) {
    fail(friendlyError(err));
    btn.disabled = false; btn.textContent = "Place Order (" + peso(total()) + ")";
  }
  busy = false;
}

function renderDone(){
  drawer.append(header("Order Placed"),
    el("div", { class: "cart-empty" },
      el("div", { class: "done-mark", text: "✓" }),
      el("p", { text: "Thank you! Your order #" + lastOrderId.slice(0, 6).toUpperCase() + " was sent to the store." }),
      el("p", { class: "cart-note", text: "We will contact you soon to confirm it. You can follow its status in My Orders." }),
      el("a", { class: "btn btn-primary", href: "my-orders.html", text: "View My Orders" }),
      el("button", { type: "button", class: "link-btn", text: "Keep shopping", onclick: closeCart })));
}

function changeQty(id, qty){
  const i = items.find(x => x.id === id);
  if (!i) return;
  if (qty <= 0) items = items.filter(x => x.id !== id);
  else if (i.max && qty > i.max) { toast("Only " + i.max + " in stock."); return; }
  else i.qty = qty;
  save(); render();
}

window.KMCart = {
  add(p){
    const max = Number(p.quantity) || 0;
    const ex = items.find(i => i.id === p.id);
    if (ex){
      if (max && ex.qty + 1 > max) { toast("Only " + max + " in stock."); return; }
      ex.qty += 1; ex.max = max;
    } else {
      items.push({ id: p.id, name: p.name, size: p.description || "", price: Number(p.price), qty: 1, max });
    }
    save();
    toast("Added " + p.name);
    if (drawer.classList.contains("open")) render();
  },
  open: openCart
};

document.addEventListener("click", (e) => {
  if (e.target.closest("#cartBtn")) openCart();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCart(); });

watchAuth((u) => { user = u; if (drawer.classList.contains("open") && view === "checkout") render(); });
save();
