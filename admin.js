import { isConfigured, db } from "./firebase-init.js";
import { watchAuth, getRole, logout, friendlyError } from "./auth-service.js";
import {
  collection, getDocs, query, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  watchProducts, seedIfEmpty, saveProduct, setStock, setProductStatus, deleteProduct,
  watchAllOrders, setOrderStatus, ORDER_STATUSES, isOutOfStock, peso
} from "./products-service.js";

const $ = (id) => document.getElementById(id);
let products = [], orders = [], editingId = null, started = false;

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
function note(text, type){
  const m = $("adminMsg");
  m.className = "alert " + (type === "ok" ? "alert-success" : "alert-danger");
  m.textContent = text;
  m.style.display = "block";
  clearTimeout(note._t);
  if (type === "ok") note._t = setTimeout(() => { m.style.display = "none"; }, 4000);
}

if (!isConfigured) {
  $("gateMsg").textContent = "Firebase is not set up yet. Open firebase-config.js and paste your project settings (see SETUP.md).";
} else {
  $("logoutBtn").addEventListener("click", async () => {
    await logout();
    location.replace("admin-login.html");
  });

  watchAuth(async (user) => {
    if (!user) { location.replace("admin-login.html"); return; }
    let role = null;
    try { role = await getRole(user.uid); }
    catch (err) { $("gateMsg").textContent = friendlyError(err); return; }

    if (role !== "admin") {
      await logout();
      location.replace("admin-login.html?error=notadmin");
      return;
    }
    $("gateMsg").style.display = "none";
    $("adminApp").hidden = false;
    $("whoami").textContent = "Logged in as " + (user.displayName || user.email);
    if (!started) { started = true; start(); }
  });
}

async function start(){
  try {
    const n = await seedIfEmpty(CATALOG);
    if (n) note("Loaded your " + n + " starting products into Firebase (stock set to 20 each). Update the quantities to match your real stock.", "ok");
  } catch (err) { note(friendlyError(err)); }

  watchProducts((list) => { products = list; renderProducts(); },
    (err) => note(friendlyError(err)));
  watchAllOrders((list) => { orders = list; renderOrders(); },
    (err) => { $("ordersList").replaceChildren(el("p", { class: "empty-msg", text: friendlyError(err) })); });
  loadCustomers();
}

/* ---------- tabs ---------- */
document.querySelectorAll(".atab").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".atab").forEach(x => x.classList.toggle("active", x === b));
  document.querySelectorAll(".tab-panel").forEach(p => { p.hidden = p.id !== "tab-" + b.dataset.tab; });
}));

/* ---------- products ---------- */
function renderProducts(){
  $("statProducts").textContent = products.length;
  $("catList").replaceChildren(...[...new Set(products.map(p => p.category))].map(c => el("option", { value: c })));
  const term = $("productFilter").value.trim().toLowerCase();
  const rows = products.filter(p => !term || (p.name + " " + p.category).toLowerCase().includes(term));
  const body = $("productsBody");
  body.replaceChildren();
  if (!rows.length) {
    body.append(el("tr", {}, el("td", { colspan: "5", text: products.length ? "No products match your search." : "No products yet. Add one using the form." })));
    return;
  }
  rows.forEach(p => {
    const out = isOutOfStock(p);
    const qty = el("input", { class: "form-control qty-input", type: "number", min: "0", step: "1", value: String(p.quantity || 0), "aria-label": "Stock for " + p.name });
    qty.addEventListener("change", async () => {
      try { await setStock(p.id, qty.value); note("Stock updated for " + p.name + ".", "ok"); }
      catch (err) { note(friendlyError(err)); }
    });
    const toggle = el("button", { type: "button", class: "btn-sm", text: p.status === "out_of_stock" ? "Mark Available" : "Mark Out",
      onclick: async () => {
        if (p.status === "out_of_stock" && !(p.quantity > 0)) { note("Set a stock quantity above 0 first."); return; }
        try { await setProductStatus(p.id, p.status === "out_of_stock" ? "available" : "out_of_stock"); }
        catch (err) { note(friendlyError(err)); }
      } });
    body.append(el("tr", {},
      el("td", {}, el("strong", { text: p.name }), el("div", { class: "sub", text: (p.category || "") + (p.size ? " · " + p.size : "") })),
      el("td", { text: peso(p.price) }),
      el("td", {}, qty),
      el("td", {}, el("span", { class: "status " + (out ? "st-cancelled" : "st-completed"), text: out ? "Out of stock" : "Available" })),
      el("td", {},
        el("button", { type: "button", class: "btn-sm", text: "Edit", onclick: () => startEdit(p) }),
        toggle,
        el("button", { type: "button", class: "btn-sm danger", text: "Delete", onclick: async () => {
          if (!confirm("Delete " + p.name + "? This cannot be undone.")) return;
          try { await deleteProduct(p.id); if (editingId === p.id) resetForm(); note("Deleted " + p.name + ".", "ok"); }
          catch (err) { note(friendlyError(err)); }
        } }))));
  });
}
$("productFilter").addEventListener("input", renderProducts);

function resetForm(){
  editingId = null;
  $("productForm").reset();
  $("pQty").value = "0";
  $("formTitle").textContent = "Add Product";
  $("saveBtn").textContent = "Save Product";
  $("cancelEdit").style.display = "none";
}
function startEdit(p){
  editingId = p.id;
  $("pName").value = p.name || "";
  $("pCategory").value = p.category || "";
  $("pSize").value = p.size || "";
  $("pPrice").value = p.price ?? "";
  $("pQty").value = p.quantity ?? 0;
  $("pImage").value = (p.image || "").replace(/^img\//, "");
  $("formTitle").textContent = "Edit Product";
  $("saveBtn").textContent = "Update Product";
  $("cancelEdit").style.display = "block";
  $("productForm").scrollIntoView({ behavior: "smooth", block: "center" });
}
$("cancelEdit").addEventListener("click", resetForm);

$("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    name: $("pName").value, category: $("pCategory").value, size: $("pSize").value,
    price: $("pPrice").value, quantity: $("pQty").value, image: $("pImage").value
  };
  if (!data.name.trim() || !data.category.trim()) { note("Please enter a name and a category."); return; }
  if (data.price === "" || Number(data.price) < 0) { note("Please enter a valid price."); return; }
  const btn = $("saveBtn"); btn.disabled = true;
  try {
    const wasEdit = !!editingId;
    await saveProduct(editingId, data);
    note((wasEdit ? "Updated " : "Added ") + data.name.trim() + ".", "ok");
    resetForm();
  } catch (err) { note(friendlyError(err)); }
  btn.disabled = false;
});

/* ---------- orders ---------- */
function renderOrders(){
  const pending = orders.filter(o => o.status === "pending").length;
  $("statOrders").textContent = orders.length;
  $("statPending").textContent = pending;
  const pill = $("pendingPill");
  pill.textContent = pending; pill.style.display = pending ? "inline-block" : "none";

  const f = $("orderFilter").value;
  const rows = orders.filter(o => f === "all" || o.status === f);
  const box = $("ordersList");
  box.replaceChildren();
  if (!rows.length) {
    box.append(el("p", { class: "empty-msg", text: orders.length ? "No orders with this status." : "No orders yet. Customer orders will appear here as soon as they are placed." }));
    return;
  }
  rows.forEach(o => {
    const when = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "Just now";
    const sel = el("select", { class: "form-control status-select", "aria-label": "Order status" },
      ...ORDER_STATUSES.map(s => el("option", { value: s, text: s.charAt(0).toUpperCase() + s.slice(1) })));
    sel.value = o.status;
    sel.addEventListener("change", async () => {
      try { await setOrderStatus(o.id, sel.value); note("Order #" + o.id.slice(0, 6).toUpperCase() + " marked " + sel.value + ".", "ok"); }
      catch (err) { sel.value = o.status; note(friendlyError(err)); }
    });
    const items = (o.items || []).map(i => el("li", {},
      el("span", { text: i.qty + " × " + i.name + (i.size ? " (" + i.size + ")" : "") }),
      el("span", { text: peso(i.price * i.qty) })));
    box.append(el("article", { class: "order-card" },
      el("div", { class: "order-top" },
        el("div", {}, el("strong", { text: "Order #" + o.id.slice(0, 6).toUpperCase() }), el("div", { class: "sub", text: when })),
        el("span", { class: "status st-" + o.status, text: o.status }),
        sel),
      el("div", { class: "order-body" },
        el("div", { class: "order-cust" },
          el("div", {}, el("b", { text: "Customer: " }), o.customerName || ""),
          el("div", {}, el("b", { text: "Phone: " }), o.phone || ""),
          el("div", {}, el("b", { text: "Email: " }), o.customerEmail || ""),
          el("div", {}, el("b", { text: "Address: " }), o.address || ""),
          o.notes ? el("div", {}, el("b", { text: "Notes: " }), o.notes) : null),
        el("ul", { class: "order-items" }, items,
          el("li", { class: "order-total" }, el("span", { text: "Total" }), el("span", { text: peso(o.total) }))))));
  });
}
$("orderFilter").addEventListener("change", renderOrders);

/* ---------- customers ---------- */
async function loadCustomers(){
  const body = $("customersBody");
  try {
    const snap = await getDocs(query(collection(db, "users"), where("role", "==", "customer")));
    const rows = snap.docs.map(d => d.data());
    rows.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    $("statCustomers").textContent = rows.length;
    body.replaceChildren();
    if (!rows.length) {
      body.append(el("tr", {}, el("td", { colspan: "3", text: "No customers have signed up yet." })));
      return;
    }
    rows.forEach(r => {
      const joined = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString("en-PH") : "";
      body.append(el("tr", {}, el("td", { text: r.name || "" }), el("td", { text: r.email || "" }), el("td", { text: joined })));
    });
  } catch (err) {
    body.replaceChildren(el("tr", {}, el("td", { colspan: "3", text: friendlyError(err) })));
  }
}
