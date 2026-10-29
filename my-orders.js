import { watchAuth, friendlyError } from "./auth-service.js";
import { watchMyOrders, peso } from "./products-service.js";

const list = document.getElementById("moList");
let stop = null;

function el(tag, props, ...kids){
  const e = document.createElement(tag);
  Object.entries(props || {}).forEach(([k, v]) => {
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else e.setAttribute(k, v);
  });
  kids.flat().forEach(k => { if (k != null) e.append(k); });
  return e;
}

function render(orders){
  list.replaceChildren();
  if (!orders.length){
    list.append(el("div", { class: "empty-msg" },
      el("p", { text: "You have not placed any orders yet." }),
      el("a", { class: "btn btn-primary", href: "index.html#productsSection", text: "Browse Products" })));
    return;
  }
  orders.forEach(o => {
    const when = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "Just now";
    list.append(el("article", { class: "order-card" },
      el("div", { class: "order-top" },
        el("div", {}, el("strong", { text: "Order #" + o.id.slice(0, 6).toUpperCase() }), el("div", { class: "sub", text: when })),
        el("span", { class: "status st-" + o.status, text: o.status })),
      el("div", { class: "order-body" },
        el("ul", { class: "order-items" },
          (o.items || []).map(i => el("li", {},
            el("span", { text: i.qty + " × " + i.name + (i.size ? " (" + i.size + ")" : "") }),
            el("span", { text: peso(i.price * i.qty) }))),
          el("li", { class: "order-total" }, el("span", { text: "Total" }), el("span", { text: peso(o.total) }))),
        el("div", { class: "order-cust" }, el("b", { text: "Deliver to: " }), o.address || ""))));
  });
}

watchAuth((user) => {
  if (stop) { stop(); stop = null; }
  if (!user){
    list.replaceChildren(el("div", { class: "empty-msg" },
      el("p", { text: "Please log in to see your orders." }),
      el("a", { class: "btn btn-primary", href: "login.html", text: "Log In" })));
    return;
  }
  stop = watchMyOrders(user.uid, render, (err) => {
    list.replaceChildren(el("p", { class: "empty-msg", text: friendlyError(err) }));
  });
});
